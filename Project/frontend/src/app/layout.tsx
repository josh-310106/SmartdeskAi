import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Antigravity Transcription Desk",
  description: "AI-powered Audio Transcription and Ticketing System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans select-none selection:bg-indigo-500 selection:text-white">
        
        {/* Navigation Header */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                🎫 Antigravity Desk
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-950 text-indigo-400 border border-indigo-800 rounded">
                Prototype v2.0
              </span>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                📥 Audio Intake
              </Link>
              <Link href="/tickets" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                ✏️ Create Ticket
              </Link>
              <Link href="/history" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                🗃️ Ticket Queue
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/20 py-6 text-center text-xs text-slate-600">
          Antigravity Support Platform © 2026. Built with Next.js, Express, and PostgreSQL.
        </footer>
      </body>
    </html>
  );
}
