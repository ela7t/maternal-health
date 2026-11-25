import type { Metadata } from "next";
import Link from "next/link";
import { Activity, MapPin, Radio, UserPlus } from "lucide-react";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Clinical overview - Maternal & Newborn Care",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body>
        {/* Top Clinical Header */}
        <header className="clinic-header">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
              <span className="brand-mark-box">
                <Activity size={20} strokeWidth={2.5} />
              </span>
              <div>
                <span className="brand-title d-block">
                  Maternal &amp; Newborn Care
                </span>
                <small className="brand-subtitle d-block">
                  Wolkite &amp; Jimma Primary Health Program
                </small>
              </div>
            </Link>
            <span className="facility-pill d-none d-md-inline-flex">
              <MapPin size={14} />
              <span>Wolkite Health Center</span>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="gateway-pill d-none d-lg-inline-flex">
              <Radio size={14} className="text-success" />
              <span>SMS gateway: <strong>AfroMessage ready</strong></span>
            </span>
            <ThemeToggle />
            <Link href="/participants/new" className="btn-medical">
              <UserPlus size={16} />
              <span>Register mother</span>
            </Link>
          </div>
        </header>

        {/* Main Navigation Bar */}
        <NavLinks />

        {/* Content Workspace */}
        <main className="container-fluid px-3 px-md-4 py-4 flex-grow-1 workspace-shell">
          {children}
        </main>

        {/* Clinician Footer */}
        <footer className="clinic-footer mt-auto">
          <div className="container-fluid px-3 px-md-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
            <div>
              <strong>Automated Maternal &amp; Newborn SMS System</strong> &bull; Jimma &amp; Wolkite Clinical Model
            </div>
            <div className="footer-meta">
              Ethio Telecom &amp; Safaricom routing &bull; UCS-2 Ge&apos;ez safe &bull; Patient phone privacy compliant
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
