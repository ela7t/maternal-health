"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS = {
  en: {
    today: "Today",
    directory: "Directory",
    dashboard: "Dashboard",
    visits: "Visits",
    smsLog: "SMS Log",
    templates: "Templates",
    reports: "Reports",
    health: "Health",
  },
  am: {
    today: "ዛሬ",
    directory: "ማውጫ",
    dashboard: "ዳሽቦርድ",
    visits: "ቀጠሮዎች",
    smsLog: "SMS መዝገብ",
    templates: "ቅጾች",
    reports: "ሪፖርቶች",
    health: "ጤና",
  },
};

export function NavLinks() {
  const pathname = usePathname();
  const [lang, setLang] = useState<"en" | "am">("en");

  useEffect(() => {
    const saved = (localStorage.getItem("ui_lang") as "en" | "am") || "en";
    setLang(saved);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as "en" | "am";
      if (detail) setLang(detail);
    };
    window.addEventListener("mnh-lang-change", onChange);
    return () => window.removeEventListener("mnh-lang-change", onChange);
  }, []);

  const t = LABELS[lang];

  const isToday = pathname === "/";
  const isDirectory =
    pathname.startsWith("/participants") || pathname.startsWith("/mothers");
  const isDashboard = pathname.startsWith("/dashboard");
  const isVisits =
    pathname.startsWith("/appointments") || pathname.startsWith("/visits");
  const isSmsLog =
    pathname.startsWith("/outbox") || pathname.startsWith("/activity");
  const isTemplates = pathname.startsWith("/messages");
  const isReports = pathname.startsWith("/reports");
  const isHealth = pathname.startsWith("/health");

  return (
    <nav className="nav-links" aria-label="Primary Navigation">
      <Link href="/" className={`nav-item ${isToday ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{t.today}</span>
      </Link>

      <Link href="/participants" className={`nav-item ${isDirectory ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>{t.directory}</span>
      </Link>

      <Link href="/dashboard" className={`nav-item ${isDashboard ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span>{t.dashboard}</span>
      </Link>

      <Link href="/appointments" className={`nav-item ${isVisits ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span>{t.visits}</span>
      </Link>

      <Link href="/outbox" className={`nav-item ${isSmsLog ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>{t.smsLog}</span>
      </Link>

      <Link href="/messages" className={`nav-item ${isTemplates ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>{t.templates}</span>
      </Link>

      <Link href="/reports" className={`nav-item ${isReports ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <span>{t.reports}</span>
      </Link>

      <Link href="/health" className={`nav-item ${isHealth ? "active" : ""}`}>
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>{t.health}</span>
      </Link>
    </nav>
  );
}
