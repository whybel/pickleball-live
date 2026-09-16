import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import BottomNav from "./BottomNav";

export const metadata: Metadata = {
  title: "Pickleball Live",
  description: "Live scores, group standings and knockout bracket",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#ffffff", margin: 0 }}>
        <style>{`
          .app-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #111111; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 50; }
          .app-header a.brand { font-size: 22px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 1px; }
          .app-header a.brand span { color: #C9A959; }
          .admin-btn { background: none; border: 1px solid #2a2a2a; color: #888888; padding: 6px 14px; border-radius: 4px; font-size: 11px; letter-spacing: 1px; text-decoration: none; text-transform: uppercase; }
          .admin-btn:hover { color: #C9A959; border-color: #C9A959; }
          .app-main { padding: 24px; padding-bottom: 120px; max-width: 1600px; margin: 0 auto; }
          .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; align-items: center; background: #111111; border-top: 1px solid #1a1a1a; padding: 10px 8px calc(10px + env(safe-area-inset-bottom)); z-index: 50; }
          .nav-item { display: flex; flex-direction: column; align-items: center; gap: 5px; text-decoration: none; color: #888888; flex: 1; }
          .nav-item .nav-icon svg { width: 24px; height: 24px; display: block; }
          .nav-item .nav-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; }
          .nav-active { color: #C9A959; }
          @media (min-width: 768px) {
            .app-header a.brand { font-size: 28px; }
            .app-main { padding: 32px; padding-bottom: 140px; }
            .nav-item .nav-icon svg { width: 32px; height: 32px; }
            .nav-item .nav-label { font-size: 14px; letter-spacing: 2px; }
            .bottom-nav { padding: 14px 24px calc(14px + env(safe-area-inset-bottom)); }
          }
          /* Scale all page content with window size on desktop */
          @media (min-width: 1024px) { .app-main { zoom: 1.15; } }
          @media (min-width: 1440px) { .app-main { zoom: 1.3; } }
        `}</style>
        <header className="app-header">
          <Link href="/" className="brand">PICKLEBALL <span>LIVE</span></Link>
          <Link href="/admin" className="admin-btn">Admin</Link>
        </header>
        <main className="app-main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}