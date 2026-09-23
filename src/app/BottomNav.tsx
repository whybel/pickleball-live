"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PaddleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="10.5" cy="8.5" rx="6.2" ry="7.2" />
    <path d="M10.5 15.7V21" strokeWidth="2.6" />
    <circle cx="19.2" cy="17.5" r="2.6" />
    <circle cx="18.4" cy="16.9" r="0.35" fill="currentColor" stroke="none" />
    <circle cx="20.0" cy="16.9" r="0.35" fill="currentColor" stroke="none" />
    <circle cx="19.2" cy="18.4" r="0.35" fill="currentColor" stroke="none" />
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <rect x="7" y="11" width="3" height="7" rx="1" />
    <rect x="12" y="6" width="3" height="12" rx="1" />
    <rect x="17" y="13" width="3" height="5" rx="1" />
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const MedalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="14.5" r="5.5" />
    <path d="M12 12l.8 1.6 1.8.27-1.3 1.27.3 1.79-1.6-.84-1.6.84.3-1.79-1.3-1.27 1.8-.27z" fill="currentColor" stroke="none" />
    <path d="M9 9.2 6.5 2h3.6l1.9 4.6" />
    <path d="M15 9.2 17.5 2h-3.6L12 6.6" />
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "LIVE", icon: <PaddleIcon /> },
    { href: "/standings", label: "STANDINGS", icon: <ChartIcon /> },
    { href: "/bracket", label: "BRACKET", icon: <TrophyIcon /> },
    { href: "/results", label: "RESULTS", icon: <MedalIcon /> },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={"nav-item" + (active ? " nav-active" : "")}>
            <span className="nav-icon">{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}