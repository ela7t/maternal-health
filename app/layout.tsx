import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "Clinical Overview - Maternal & Newborn Care",
  description: "Automated SMS Reminder System for Maternal and Newborn Health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
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
        {/* Hospital & Clinician Top Strip */}
        <header className="clinic-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-heart-pulse fs-3" style={{ color: "var(--app-primary)" }}></i>
              <div>
                <span className="fw-bold fs-6 tracking-tight d-block text-dark">
                  Maternal &amp; Newborn Care
                </span>
                <small className="text-secondary">Wolkite &amp; Jimma Primary Health Program</small>
              </div>
            </div>
            <div className="vr mx-2 d-none d-md-block text-muted"></div>
            <span className="badge bg-light text-dark border d-none d-md-inline-flex align-items-center gap-1 px-2 py-1">
              <i className="bi bi-geo-alt" style={{ color: "var(--app-primary)" }}></i> Wolkite Health Center
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small d-none d-sm-inline">
              <i className="bi bi-broadcast text-success me-1"></i> SMS Gateway:{" "}
              <strong>AfroMessage Ready</strong>
            </span>
            <Link href="/participants/new" className="btn-medical shadow-sm">
              <i className="bi bi-person-plus-fill"></i> Register Mother
            </Link>
          </div>
        </header>

        {/* Main Navigation Bar */}
        <NavLinks />

        {/* Content Workspace */}
        <main className="container-fluid px-4 py-4 flex-grow-1">{children}</main>

        {/* Clinician Footer */}
        <footer className="bg-white border-top py-3 text-secondary small text-center mt-auto">
          <div className="container-fluid px-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
            <div>
              <strong>Automated Maternal &amp; Newborn SMS System</strong> &bull; Jimma &amp; Wolkite Clinical Model
            </div>
            <div>
              <span className="text-muted">
                Ethio Telecom &amp; Safaricom routing &bull; UCS-2 Ge&apos;ez safe &bull; Patient phone privacy compliant
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
