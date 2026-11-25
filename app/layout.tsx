import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

export const metadata: Metadata = {
  title: "Maternal & Newborn Care",
  description: "Automated SMS Reminder System for Maternal and Newborn Health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0f766e" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark')document.documentElement.classList.add('dark-theme');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="app-shell">
        {/* Single-Row Minimalist Clinical Header (Exact Django base.html Layout) */}
        <header className="app-header">
          <div className="header-container">
            <div className="header-left">
              <Link href="/" className="brand-wrapper" aria-label="Maternal SMS Home" title="Maternal & Newborn Care">
                <svg className="brand-pulse-icon" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span className="brand-title">
                  <span className="brand-full">Maternal &amp; Newborn</span>
                  <span className="brand-short">Maternal</span>
                </span>
              </Link>

              <div className="header-divider" />

              <NavLinks />
            </div>

            <div className="header-actions">
              <LanguageToggle />
              <ThemeToggle />
              <Link href="/participants/new" className="btn btn-primary btn-enroll-primary">
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Enroll Mother</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="main-container">{children}</main>

        {/* Footer */}
        <footer className="app-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", maxWidth: "1280px", margin: "0 auto" }}>
            <span>
              <strong>Maternal &amp; Newborn Care</strong> &bull; Wolkite &amp; Jimma Primary Health Program
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Ethio Telecom &amp; Safaricom &bull; Dual Calendar (E.C. / G.C.)
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
