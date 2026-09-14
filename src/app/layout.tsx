import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pickleball Live | AIWM Charity",
  description: "Live scores, standings, and brackets for the AIWM Charity Pickleball Tournament",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col font-sans">
        {/* Header */}
        <header className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">AIWM</span>
              <span className="text-amber-400 text-sm font-medium hidden sm:block">Charity Pickleball</span>
            </Link>
            <Link href="/admin" className="text-xs text-blue-200 hover:text-white border border-blue-700 px-3 py-1 rounded-full">
              Admin
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 pb-24">
          {children}
        </main>

        {/* Bottom Nav for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-around sm:hidden z-50">
          <Link href="/" className="flex flex-col items-center text-blue-900 text-xs font-semibold">
            <span className="text-xl mb-1">🏓</span> Live
          </Link>
          <Link href="/admin" className="flex flex-col items-center text-gray-500 text-xs font-semibold">
            <span className="text-xl mb-1">⚙️</span> Admin
          </Link>
        </nav>
      </body>
    </html>
  );
}