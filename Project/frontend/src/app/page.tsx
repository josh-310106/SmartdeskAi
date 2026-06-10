"use client";

import React, { useState, useCallback } from 'react';
import { Upload, FileAudio, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AudioUploadHome() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const router = useRouter();

  // Validate file type
  const validateFile = (selectedFile: File): boolean => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(selectedFile.type) && !['mp3', 'wav'].includes(extension || '')) {
      setErrorMessage('Only .mp3 and .wav audio files are accepted.');
      setStatus('error');
      return false;
    }
    
    setErrorMessage('');
    setStatus('idle');
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleStartTranscription = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to process audio transcription.');
      }

      setStatus('success');
      // Redirect to Ticket & Transcription History page
      setTimeout(() => {
        router.push('/history');
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during processing.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl text-slate-100 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-indigo-950/60 border border-indigo-800 rounded-lg text-indigo-400">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Audio Processing Intake
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Submit call recordings to transcribe, extract AI summaries, and dispatch tickets.
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-800 my-6"></div>

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
          dragActive 
            ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-950/10' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
        }`}
      >
        <input
          type="file"
          id="audio-upload"
          accept=".mp3,.wav"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          disabled={status === 'uploading'}
        />
        
        {file ? (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-indigo-900/20 border border-indigo-800/40 rounded-full mb-3 text-indigo-400 animate-pulse">
              <FileAudio className="w-10 h-10" />
            </div>
            <p className="font-semibold text-sm max-w-sm truncate text-indigo-200">{file.name}</p>
            <p className="text-xs text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); setFile(null); }}
              className="mt-3 text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-full mb-3 text-slate-500 group-hover:text-slate-400 transition-colors">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-300">Drag & drop your recording here, or browse files</p>
            <p className="text-xs text-slate-500 mt-1.5">Supports WAV and MP3 formats only</p>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      {status === 'error' && (
        <div className="mt-5 p-3.5 bg-red-950/30 border border-red-900/50 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Upload Failed</div>
            <div className="mt-0.5 text-red-300/80">{errorMessage}</div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-5 p-3.5 bg-green-950/30 border border-green-900/50 text-green-400 text-xs rounded-xl flex items-start gap-2.5">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Transcription Initiated</div>
            <div className="mt-0.5 text-green-300/80">Success! Transferring you to the Ticket Queue...</div>
          </div>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleStartTranscription}
        disabled={!file || status === 'uploading'}
        className="w-full mt-8 py-3 px-5 font-bold text-sm text-white rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2"
      >
        {status === 'uploading' ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyzing Voice Audio...
          </span>
        ) : (
          <>
            <span>Transcript</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
