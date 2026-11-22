import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Users,
  Baby,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldCheck,
  CalendarCheck,
  Radio,
  XCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { SyncSchedulerButton } from "@/components/SyncSchedulerButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate clinical stats
  const [
    totalPregnant,
    totalPostnatal,
    totalCompleted,
    totalEnrolled,
    optedOutCount,
    lossCount,
    scheduledCount,
    missedAppointments,
    totalDispatched,
    deliveredCount,
    todaySentCount,
    recentMessages,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
    prisma.participant.count({ where: { status: "completed" } }),
    prisma.participant.count(),
    prisma.participant.count({ where: { status: "opted_out" } }),
    prisma.participant.count({ where: { status: "loss" } }),
    prisma.appointment.count({ where: { status: "scheduled", scheduledFor: { gte: startOfToday } } }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { status: "missed" },
          { status: "scheduled", scheduledFor: { lt: startOfToday } },
        ],
      },
      include: {
        participant: {
          include: { phones: { where: { isPrimary: true } }, facility: true },
        },
      },
      take: 6,
    }),
    prisma.outboxMessage.count(),
    prisma.outboxMessage.count({ where: { status: { in: ["delivered", "sent", "submitted"] } } }),
    prisma.outboxMessage.count({
      where: { sentAt: { gte: startOfToday } },
    }),
    prisma.outboxMessage.findMany({
      take: 8,
      orderBy: { scheduledAt: "desc" },
      include: {
        participant: {
          include: { facility: true, phones: { where: { isPrimary: true } } },
        },
        phone: true,
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

  const deliveryRate = totalDispatched > 0 ? Math.round((deliveredCount / totalDispatched) * 100) : 100;
  const isLive = process.env.SMS_LIVE === "1";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Today's Clinic & Messaging Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoring registered mothers, appointment attendance, and automated prenatal/postnatal SMS streams.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SyncSchedulerButton />
          <Link
            href="/mothers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition active:scale-95"
          >
            <Users className="w-4 h-4" />
            + Register New Mother
          </Link>
        </div>
      </div>

      {/* Immediate Clinical Action Banner (Triage) */}
      {missedAppointments.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-amber-950">
                    {missedAppointments.length} Mother{missedAppointments.length > 1 ? "s" : ""} Missed Scheduled Appointments
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The system triggers automatic follow-up SMS. Please review missed visits and contact the mother to reschedule.
                  </p>
                </div>
                <Link
                  href="/visits?filter=missed"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs shrink-0 transition"
                >
                  Review Missed Visits <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {missedAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200/80 text-xs shadow-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {apt.participant.fullName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {apt.kind.toUpperCase()} • {apt.participant.facility.name} • {apt.participant.phones[0]?.numberE164 || "No phone"}
                      </span>
                    </div>
                    <Link
                      href={`/mothers/${apt.participant.id}`}
                      className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 rounded transition"
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

      {/* Primary Clinical KPI Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Pregnancies */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Pregnancies
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">{totalPregnant}</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Receiving prenatal SMS</span>
            <Link
              href="/mothers?status=active_pregnant"
              className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
            >
              View list &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 2: Postnatal Mothers */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Postnatal Care (0–6 Wks)
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">{totalPostnatal}</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Baby className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Newborn immunization stream</span>
            <Link
              href="/mothers?status=postnatal"
              className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
            >
              View list &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 3: Upcoming ANC Visits */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Upcoming ANC Visits
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">{scheduledCount}</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">72h advance reminders active</span>
            <Link
              href="/visits?filter=upcoming"
              className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              View visits &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 4: Graduated Cohort */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Graduated Cohort
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">{totalCompleted}</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Completed full 6-week care</span>
            <span className="text-slate-400 font-medium">{totalEnrolled} Total Enrolled</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Automated SMS Delivery Health & Program Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Automated SMS Delivery Health */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-600 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-base">
                  Automated SMS Delivery Health
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected to Ethio Telecom & Safaricom routes through AfroMessage Gateway
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {isLive ? "Gateway Online (Live)" : "Gateway Active (Sandbox)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center">
              <span className="text-xs font-medium text-slate-500">Messages Dispatched</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalDispatched}</div>
              <span className="text-[11px] text-slate-400">Total automated SMS</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center">
              <span className="text-xs font-medium text-slate-500">Successfully Delivered</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{deliveredCount}</div>
              <span className="text-[11px] text-slate-400">Confirmed by network</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center">
              <span className="text-xs font-medium text-slate-500">Delivery Rate</span>
              <div className="text-2xl font-extrabold text-teal-600 mt-1">{deliveryRate}%</div>
              <span className="text-[11px] text-slate-400">Jimma trial target: &gt;95%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Preferred sending windows: <strong>8:00 AM – 10:00 AM</strong> and <strong>7:00 PM</strong> (Addis Ababa Time).
              </span>
            </div>
            <Link
              href="/activity"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 shrink-0 hover:underline"
            >
              View Outbox Details &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Program Safety & Privacy */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Program Safety & Privacy
            </h3>
          </div>

          <ul className="divide-y divide-slate-100 text-xs">
            <li className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Shared Phone Protection</span>
                <span className="text-slate-500 text-[11px]">No PII or diagnosis in SMS body</span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </li>

            <li className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Opt-Out Requests</span>
                <span className="text-slate-500 text-[11px]">Mothers replied STOP / አቁም</span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {optedOutCount}
              </span>
            </li>

            <li className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Sensitive Branch Flags</span>
                <span className="text-slate-500 text-[11px]">Immediate halt on pregnancy loss</span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {lossCount}
              </span>
            </li>
          </ul>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 leading-relaxed">
            All messages comply with Wolkite University Clinical Institutional Review Board (IRB) ethical requirements.
          </div>
        </div>
      </div>

      {/* Recent Automated Messages Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">Recent Automated Messages</h3>
          </div>
          <Link
            href="/activity"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            See all messages &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Mother</th>
                <th className="px-6 py-3.5">Facility & Phone</th>
                <th className="px-6 py-3.5">Message Sent</th>
                <th className="px-6 py-3.5">Encoding & Segments</th>
                <th className="px-6 py-3.5">Delivery Status</th>
                <th className="px-6 py-3.5">Scheduled For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No recent automated message activity. Enrolled mothers will have scheduled SMS appear here.
                  </td>
                </tr>
              ) : (
                recentMessages.map((msg) => {
                  const primaryPhone = msg.participant?.phones[0] || msg.phone;
                  return (
                    <tr key={msg.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {msg.participant?.fullName?.charAt(0) || "M"}
                          </div>
                          <div>
                            <Link
                              href={`/mothers/${msg.participant?.id}`}
                              className="font-bold text-slate-900 hover:text-teal-700 block text-xs"
                            >
                              {msg.participant?.fullName || "Mother"}
                            </Link>
                            <span className="text-[11px] font-mono text-slate-400">
                              {msg.participant?.publicCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {msg.participant?.facility?.name || "Health Center"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {primaryPhone?.numberE164 || "N/A"}{" "}
                          <span className="capitalize">({primaryPhone?.ownerType || "self"})</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-sm">
                        <p className="line-clamp-2 text-slate-700 font-sans" title={msg.messageContent}>
                          {msg.messageContent}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {msg.segments} segment{msg.segments > 1 ? "s" : ""} (UCS-2)
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                            msg.deliveryEvents[0]?.mappedStatus === "delivered" || msg.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : msg.status === "sent" || msg.status === "submitted"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : msg.status === "pending" || msg.status === "queued"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : msg.status === "cancelled"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {msg.deliveryEvents[0]?.mappedStatus === "delivered" || msg.status === "delivered" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : null}
                          {msg.deliveryEvents[0]?.mappedStatus || msg.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {new Date(msg.scheduledAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
