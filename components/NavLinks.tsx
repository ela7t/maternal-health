"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();

  const isToday = pathname === "/";
  const isDirectory =
    pathname.startsWith("/participants") || pathname.startsWith("/mothers");
  const isVisits =
    pathname.startsWith("/appointments") || pathname.startsWith("/visits");
  const isSmsLog =
    pathname.startsWith("/outbox") || pathname.startsWith("/activity");
  const isTemplates = pathname.startsWith("/messages");

  return (
    <nav className="nav-links" aria-label="Primary Navigation">
      <Link href="/" className={`nav-item ${isToday ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Today</span>
      </Link>

      <Link href="/participants" className={`nav-item ${isDirectory ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Directory</span>
      </Link>

      <Link href="/appointments" className={`nav-item ${isVisits ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span>Visits</span>
      </Link>

      <Link href="/outbox" className={`nav-item ${isSmsLog ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>SMS Log</span>
      </Link>

      <Link href="/messages" className={`nav-item ${isTemplates ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>Templates</span>
      </Link>
    </nav>
  );
}
