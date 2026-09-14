import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PickleballLive",
  description: "Professional Tournament Scoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <header style={{ background: '#111111', borderBottom: '1px solid #1a1a1a', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-0.5px' }}>PICKLEBALL</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#C9A959', letterSpacing: '-0.5px' }}>LIVE</span>
            </Link>
            <Link href="/admin" style={{ textDecoration: 'none', fontSize: '12px', fontWeight: '600', color: '#888888', border: '1px solid #2a2a2a', padding: '8px 16px', borderRadius: '4px' }}>
              ADMIN
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '24px', paddingBottom: '100px', boxSizing: 'border-box' }}>
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111111', borderTop: '1px solid #1a1a1a', padding: '16px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#C9A959', fontSize: '10px', fontWeight: '600' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>🏓</span> LIVE
          </Link>
          <Link href="/standings" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888888', fontSize: '10px', fontWeight: '600' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>📊</span> STANDINGS
          </Link>
          <Link href="/bracket" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888888', fontSize: '10px', fontWeight: '600' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>🏆</span> BRACKET
          </Link>
          <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888888', fontSize: '10px', fontWeight: '600' }}>
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>⚙️</span> ADMIN
          </Link>
        </nav>
      </body>
    </html>
  );
}