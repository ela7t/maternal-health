import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import {
  HeartPulse,
  Users,
  CalendarCheck,
  BookOpenText,
  Send,
  Building2,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Maternal & Newborn Care System | Wolkite & Jimma Protocol",
  description: "Automated SMS Reminder System for Maternal & Newborn Health in Ethiopia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.className} min-h-screen flex flex-col bg-slate-50 text-slate-900`}>
        {/* Top Clinical Header Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-700" />
              Wolkite Health Center & Jimma Primary Hospital
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 hidden sm:inline">MNH Automated SMS Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AfroMessage Gateway Live
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Ethiopian Calendar (ዓ.ም.) Active</span>
          </div>
        </div>

        {/* Main Dark Slate Navigation Bar */}
        <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-500 transition">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-base tracking-tight leading-none">
                    MNH Reminder
                  </span>
                  <span className="text-[10px] text-teal-400 font-medium mt-0.5">
                    Jimma / Wolkite Clinical Protocol
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1 h-full">
                <Link
                  href="/"
                  className="px-3.5 h-full flex items-center text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border-b-2 border-transparent hover:border-teal-400 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/mothers"
                  className="px-3.5 h-full flex items-center text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border-b-2 border-transparent hover:border-teal-400 transition gap-1.5"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Mothers Registry
                </Link>
                <Link
                  href="/visits"
                  className="px-3.5 h-full flex items-center text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border-b-2 border-transparent hover:border-teal-400 transition gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4 text-slate-400" />
                  Visits & Triage
                </Link>
                <Link
                  href="/messages"
                  className="px-3.5 h-full flex items-center text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border-b-2 border-transparent hover:border-teal-400 transition gap-1.5"
                >
                  <BookOpenText className="w-4 h-4 text-slate-400" />
                  Message Bank
                </Link>
                <Link
                  href="/activity"
                  className="px-3.5 h-full flex items-center text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border-b-2 border-transparent hover:border-teal-400 transition gap-1.5"
                >
                  <Send className="w-4 h-4 text-slate-400" />
                  SMS Outbox
                </Link>
              </nav>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/mothers/new"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition active:scale-95"
                >
                  + Register Mother
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Clinical Privacy & Protocol Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>
                <strong>Confidential Clinical System:</strong> Automated SMS text never discloses patient names or sensitive diagnoses due to shared household phones.
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
