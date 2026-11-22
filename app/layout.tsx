import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import {
  HeartPulse,
  Users,
  CalendarCheck2,
  BookOpenText,
  Send,
  Building2,
  ShieldAlert,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MNH Automated SMS Platform | Jimma & Wolkite Clinical Model",
  description:
    "Automated Ethiopian Maternal & Newborn Health reminder platform with AfroMessage integration and Ethiopian Calendar support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900`}>
        {/* Top Clinical Navigation Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand Logo & Clinical Context */}
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2.5 group">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:bg-teal-700 transition">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 text-lg tracking-tight block leading-tight">
                      MNH Reminder
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Jimma / Wolkite Clinical Protocol
                    </span>
                  </div>
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  href="/"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/mothers"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Mothers Registry
                </Link>
                <Link
                  href="/visits"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <CalendarCheck2 className="w-4 h-4 text-slate-400" />
                  Visits & Triage
                </Link>
                <Link
                  href="/messages"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <BookOpenText className="w-4 h-4 text-slate-400" />
                  Message Bank
                </Link>
                <Link
                  href="/activity"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4 text-slate-400" />
                  SMS Outbox
                </Link>
              </nav>

              {/* Facility & Quick Enrollment Button */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Wolkite Health Center</span>
                </div>
                <Link
                  href="/mothers/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition active:scale-[0.98]"
                >
                  + Enroll Mother
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Clinical Privacy & Protocol Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-600" />
              <span>
                <strong>Confidential Clinical System:</strong> Plain SMS text never reveals participant names or diagnoses.
              </span>
            </div>
            <div className="text-slate-400">
              AfroMessage Gateway • Ethiopian Calendar (ዓ.ም.) • Jimma RCT Protocol
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
