import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AIWM Charity Pickleball | Live Scores",
  description: "Official live scoring for the AIWM Charity Pickleball Tournament",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 group">
              {/* AIWM Logo Placeholder / Text */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 font-bold text-lg">15</div>
                <span className="text-2xl font-bold text-white tracking-tight">AIWM</span>
              </div>
              <span className="text-amber-400 text-sm font-medium hidden sm:block border-l border-slate-700 pl-3 ml-1">
                Charity Pickleball
              </span>
            </Link>
            <Link 
              href="/admin" 
              className="text-xs font-semibold text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-500/50 px-4 py-2 rounded-full transition-all bg-slate-800/50"
            >
              Admin Login
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto w-full p-4 pb-24">
          {children}
        </main>

        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-3 flex justify-around sm:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Link href="/" className="flex flex-col items-center text-amber-400 text-xs font-bold">
            <span className="text-xl mb-1">🏓</span> Live Scores
          </Link>
          <Link href="/admin" className="flex flex-col items-center text-slate-500 text-xs font-semibold">
            <span className="text-xl mb-1">⚙️</span> Admin
          </Link>
        </nav>
      </body>
    </html>
  );
}