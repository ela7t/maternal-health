import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Users,
  Baby,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate clinical stats
  const [
    totalPregnant,
    totalPostnatal,
    missedAppointments,
    todaySentCount,
    recentMessages,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { status: "missed" },
          { status: "scheduled", scheduledFor: { lt: startOfToday } },
        ],
      },
      include: {
        participant: {
          include: { phones: { where: { isPrimary: true } } },
        },
      },
      take: 5,
    }),
    prisma.outboxMessage.count({
      where: {
        sentAt: { gte: startOfToday },
      },
    }),
    prisma.outboxMessage.findMany({
      take: 6,
      orderBy: { scheduledAt: "desc" },
      include: {
        participant: true,
        variant: {
          include: { template: true },
        },
        deliveryEvents: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const isLive = process.env.SMS_LIVE === "1";

  return (
    <div className="space-y-8">
      {/* Page Title & Clinical Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            MNH Clinical Command Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automated SMS reminder system for Jimma RCT & Wolkite Health Center protocol.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/mothers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition active:scale-95"
          >
            <Users className="w-4 h-4" />
            + Enroll Mother
          </Link>
        </div>
      </div>

      {/* Missed Appointments Urgent Triage Banner */}
      {missedAppointments.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-amber-900">
                  {missedAppointments.length} Missed Clinic Visit{missedAppointments.length > 1 ? "s" : ""} Requiring Follow-Up
                </h3>
                <Link
                  href="/visits?filter=missed"
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 group"
                >
                  View All Missed <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Protocols require timely rescheduling to prevent dropouts from WHO ANC 8-contact cascade.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {missedAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-amber-200 text-xs shadow-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {apt.participant.fullName}
                      </span>
                      <span className="text-slate-400">
                        {apt.kind.toUpperCase()} • {apt.participant.phones[0]?.numberE164 || "No phone"}
                      </span>
                    </div>
                    <Link
                      href={`/mothers/${apt.participant.id}`}
                      className="px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition"
                    >
                      Follow up
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Clinical KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Pregnancies */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Active Pregnancies
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalPregnant}</p>
            <p className="text-xs text-teal-600 mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Receiving ANC reminders
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Postnatal Mothers */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Postnatal Protocol
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalPostnatal}</p>
            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Day 1 - 42 Newborn Care
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Baby className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Today's SMS Outbox */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              SMS Sent Today
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{todaySentCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              AfroMessage Automated Dispatch
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Gateway Health */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              AfroMessage Gateway
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {isLive ? "LIVE PRODUCTION" : "SANDBOX MODE"}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> E.164 (+251) Verified
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Quick Clinical Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Outbox Messages Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Message Activity</h2>
            <Link
              href="/activity"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 group"
            >
              Full Outbox Log <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No recent SMS activity yet. Dispatches will appear here automatically.
              </div>
            ) : (
              recentMessages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {msg.participant?.fullName || "Participant"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-600">
                        {msg.variant?.template?.stream || "clinical"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 italic font-serif">
                      "{msg.messageContent}"
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(msg.scheduledAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Template: {msg.variant?.template?.code || "MANUAL"}</span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      msg.deliveryEvents[0]?.mappedStatus === "delivered" || msg.status === "delivered"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : msg.status === "sent"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : msg.status === "failed"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {msg.deliveryEvents[0]?.mappedStatus || msg.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Protocols & Safety Procedures */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Clinical Safeguards</h2>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm text-xs text-slate-600">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Ethiopian Calendar (ዓ.ም.)
              </h4>
              <p className="mt-1 text-slate-500 leading-relaxed">
                All LMP dating supports 13 Ethiopian months (Meskerem - Pagume) with automatic Naegele's rule calculation for accurate gestational age.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Shared Phone Privacy
              </h4>
              <p className="mt-1 text-slate-500 leading-relaxed">
                Messages NEVER mention mother names, HIV status, or sensitive diagnoses because phones are frequently shared with spouses or neighbors.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Sensitive Loss Immediate Halt
              </h4>
              <p className="mt-1 text-slate-500 leading-relaxed">
                In the event of miscarriage or stillbirth, clinicians can halt all scheduled messages in 1-click to prevent traumatic automated reminders.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                UCS-2 Ge'ez Encoding
              </h4>
              <p className="mt-1 text-slate-500 leading-relaxed">
                Amharic Ge'ez script automatically uses 70-character single segment counting with live ETB billing previews.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
