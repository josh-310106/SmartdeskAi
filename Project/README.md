# SmartDesk AI: Cognitive ITSM & Audio Ingestion Console

SmartDesk AI is an autonomous, AI-driven audio transcription and ITSM ticketing system. It allows corporate employees to report issues via voice records, automatically transcribes the calls using Groq Whisper API, extracts structured fields (e.g. priority, category, department routing, sentiment, and AI summaries) using LLaMA-3.1, and allows managers to view, update, assign, and resolve tickets from a unified control panel.

---

## 📂 Project Directory Structure

```
project_final/
├── app.py                    # Streamlit frontend, page router, and custom styles
├── database.py               # SQLite database schemas, auto-seeding, and CRUD helpers
├── config.py                 # Configuration loader and environment variables
├── transcription.py          # Audio transcription module connecting to Groq Whisper
├── ticket_extractor.py       # AI parsing module for structured ticket fields and PII detection
├── email_service.py          # Automated support email router (SMTP alert dispatcher)
├── requirements.txt          # Python dependencies
├── .env.template             # Template for local environment variables
└── tickets.db                # SQLite database (auto-generated on launch)
```

---

## 🛠️ Installation & Setup

Running this project locally requires **Python 3.10 or higher**.

### 1. Create a Virtual Environment
Navigate to the project directory and create a virtual environment to isolate dependencies:
```bash
# Create the virtual environment
python -m venv .venv

# Activate it (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate it (macOS/Linux)
source .venv/bin/activate
```

### 2. Install Dependencies
Install the required packages from the dependency manifest:
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
1. Create a copy of the environment template named `.env`:
   ```bash
   cp .env.template .env
   ```
2. Open `.env` and fill in your settings:
   ```env
   # Groq API configuration (for live Whisper and LLaMA)
   GROQ_API_KEY=your_groq_api_key_here

   # Toggle Mock Services (set to True to run offline without Groq keys)
   USE_MOCK_SERVICES=False

   # SQLite Database path
   DB_PATH=tickets.db

   # (Optional) SMTP configuration for automated email routing alerts
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_username@company.com
   SMTP_PASSWORD=your_app_password
   SMTP_SENDER=alerts@company.com
   ```

---

## 🚀 Running the Project

Ensure your virtual environment is active, then launch the Streamlit server:
```bash
streamlit run app.py
```
The console will boot up and print the local url (default `http://localhost:8501`). Open your browser to begin testing.

---

## 🤖 Services Triage & Mock Mode
By default, if `GROQ_API_KEY` is empty or `USE_MOCK_SERVICES=True` is configured in `.env`, the system runs in **Mock Mode**:
- **Transcription**: Returns mock text based on standard file profiles (e.g. transcribes VPN calls with relevant intranet connectivity issue messages).
- **Extraction**: Parses simulated metadata values to test database insertion and routing components.

To utilize live AI processing, supply a valid Groq API key and configure `USE_MOCK_SERVICES=False`.
