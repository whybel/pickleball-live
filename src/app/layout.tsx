import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PickleballLive | Tournament Scoring",
  description: "Professional pickleball tournament scoring and live results",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white font-sans antialiased min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-[#111] border-b border-[#1a1a1a] p-6 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight text-white">PICKLEBALL</span>
              <span className="text-2xl font-bold tracking-tight text-[#C9A959]">LIVE</span>
            </Link>
            <Link 
              href="/admin" 
              className="text-xs font-medium text-[#888] hover:text-[#C9A959] border border-[#2a2a2a] hover:border-[#C9A959] px-4 py-2 rounded transition-all"
            >
              ADMIN
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-6 pb-24">
          {children}
        </main>

        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#1a1a1a] p-4 flex justify-around sm:hidden z-50">
          <Link href="/" className="flex flex-col items-center text-[#C9A959] text-xs font-medium">
            <span className="text-xl mb-1">🏓</span>
            LIVE
          </Link>
          <Link href="/admin" className="flex flex-col items-center text-[#888] text-xs font-medium">
            <span className="text-xl mb-1">⚙️</span>
            ADMIN
          </Link>
        </nav>
      </body>
    </html>
  );
}