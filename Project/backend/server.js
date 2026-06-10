const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configure Multer for in-memory audio buffering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only .mp3 and .wav are accepted.'));
    }
  }
});

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// LLM System prompt for extracting ticket details
const SYSTEM_PROMPT = `You are a senior customer support analysis AI.
Your job is to read raw customer support transcripts and extract structured ticket information in JSON format.

Output JSON schema:
{
  "title": "A short, descriptive ticket title (max 10 words)",
  "description": "A detailed explanation of the customer's problem extracted from the transcript",
  "category": "Must be exactly one of: Hardware, Authentication, Billing, Software",
  "priority": "Must be exactly one of: High, Medium, Low", -- Low, Medium, High mapping
  "sentiment": "Must be exactly one of: Positive, Neutral, Negative",
  "customer_emotion": "The emotional state of the customer, e.g., Frustrated, Calm, Angry, Anxious, Satisfied",
  "assigned_team": "The team to handle the ticket",
  "summary": "Concise 1-2 sentence ticket summary",
  "suggested_resolution": "A proposed quick-fix or troubleshooting checklist (2-3 bullet points)"
}`;

// Helper: Seed initial DB tables if they do not exist
const initializeDatabase = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audio_transcripts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      file_name VARCHAR(255) NOT NULL,
      storage_url VARCHAR(512) NOT NULL,
      raw_text TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Success',
      detailed_payload JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      transcript_id UUID REFERENCES audio_transcripts(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Open',
      priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
      category VARCHAR(100) NOT NULL DEFAULT 'Software',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(schema);
    // Create a mock user if users table is empty
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count) === 0) {
      await pool.query("INSERT INTO users (id, email) VALUES ('00000000-0000-0000-0000-000000000000', 'demo@antigravity.ai')");
    }
    console.log('PostgreSQL schema initialized successfully.');
  } catch (error) {
    console.error('Error initializing database schema:', error.message);
  }
};

// Start database initialization
initializeDatabase();

// ----------------- API ENDPOINTS -----------------

// 1. Process Transcription Upload
app.post('/api/transcript', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.headers['x-user-id'] || '00000000-0000-0000-0000-000000000000';

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided.' });
    }

    const storageUrl = `https://antigravity-storage.s3.amazonaws.com/uploads/${Date.now()}_${file.originalname}`;
    
    let rawText = '';
    let detailedPayload = {};

    // Check Mock Services flag
    if (process.env.USE_MOCK_SERVICES === 'true') {
      rawText = "Hello, this is a mock transcribed text representing a customer reporting a lockout query.";
      detailedPayload = {
        duration: 12.5,
        confidence: 0.95,
        word_timestamps: [
          { word: "Hello", start: 0.5, end: 0.9 },
          { word: "lockout", start: 1.2, end: 1.8 }
        ]
      };
    } else {
      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
      });
      rawText = transcription.text;
      detailedPayload = {
        duration: transcription.duration,
        words: transcription.words
      };
    }

    // Save transcript record
    const transcriptQuery = `
      INSERT INTO audio_transcripts (user_id, file_name, storage_url, raw_text, status, detailed_payload)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const transcriptRes = await pool.query(transcriptQuery, [
      userId,
      file.originalname,
      storageUrl,
      rawText,
      'Success',
      JSON.stringify(detailedPayload)
    ]);
    const transcriptId = transcriptRes.rows[0].id;

    // Run AI ticket extraction (Mock or OpenAI completion)
    let aiResponse = {};
    if (process.env.USE_MOCK_SERVICES === 'true') {
      aiResponse = {
        title: "Account Lockout",
        description: rawText,
        category: "Authentication",
        priority: "High",
        sentiment: "Negative",
        customer_emotion: "Anxious",
        assigned_team: "Access & IAM Team",
        summary: "Customer is locked out of their credentials",
        suggested_resolution: "Trigger MFA reset and unlock user in active directory."
      };
    } else {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract details from this transcript:\n\n${rawText}` }
        ],
        response_format: { type: 'json_object' }
      });
      aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    }

    // Insert automatically generated Ticket linked to Transcript
    const ticketQuery = `
      INSERT INTO tickets (user_id, transcript_id, title, description, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const ticketRes = await pool.query(ticketQuery, [
      userId,
      transcriptId,
      aiResponse.title || 'Support Query',
      aiResponse.description || rawText,
      aiResponse.priority || 'Medium',
      aiResponse.category || 'Software',
      'Open'
    ]);

    return res.status(201).json({
      success: true,
      transcriptId,
      ticketId: ticketRes.rows[0].id,
      transcript: rawText,
      analysis: aiResponse
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server processing failed.', details: error.message });
  }
});

// 2. Fetch Historical Records
app.get('/api/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id as ticket_id, t.title, t.description, t.status, t.priority, t.category, t.created_at as ticket_date,
        a.id as transcript_id, a.file_name, a.raw_text, a.status as transcript_status, a.detailed_payload
      FROM tickets t
      LEFT JOIN audio_transcripts a ON t.transcript_id = a.id
      ORDER BY t.created_at DESC;
    `;
    const dbRes = await pool.query(query);
    return res.json(dbRes.rows);
  } catch (error) {
    console.error('History fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch historical database records.' });
  }
});

// 3. Manual Ticket Generation
app.post('/api/tickets', async (req, res) => {
  try {
    const { title, description, priority, category } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const query = `
      INSERT INTO tickets (user_id, title, description, priority, category, status)
      VALUES ($1, $2, $3, $4, $5, 'Open')
      RETURNING id, created_at;
    `;
    const dbRes = await pool.query(query, [userId, title, description, priority || 'Medium', category || 'Software']);
    return res.status(201).json({ success: true, ticketId: dbRes.rows[0].id });
  } catch (error) {
    console.error('Manual ticket creation error:', error);
    return res.status(500).json({ error: 'Failed to create ticket.' });
  }
});

// 4. Update Ticket Details
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, category, status } = req.body;

    const query = `
      UPDATE tickets
      SET title = $1, description = $2, priority = $3, category = $4, status = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6;
    `;
    await pool.query(query, [title, description, priority, category, status, id]);
    return res.json({ success: true, message: 'Ticket updated successfully.' });
  } catch (error) {
    console.error('Ticket update error:', error);
    return res.status(500).json({ error: 'Failed to update ticket details.' });
  }
});

// 5. Delete Ticket
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (error) {
    console.error('Ticket delete error:', error);
    return res.status(500).json({ error: 'Failed to delete ticket.' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
