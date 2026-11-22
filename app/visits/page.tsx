"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Phone,
  User,
  Filter,
  ArrowRight,
} from "lucide-react";

interface AppointmentItem {
  id: string;
  pregnancyId: string;
  visitType: string;
  scheduledFor: string;
  status: string;
  attendedAt: string | null;
  rescheduledTo: string | null;
  motherName: string;
  studyCode: string;
  phone: string;
  facility: string;
}

export default function VisitsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Reschedule Modal
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?filter=${filter}`);
      const data = await res.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markAttended(id: string) {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "attend" }),
      });
      if (res.ok) fetchAppointments();
    } catch (err) {
      alert("Failed to mark attended");
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleApt || !newDate) return;
    setRescheduling(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rescheduleApt.id, action: "reschedule", newDate }),
      });
      if (res.ok) {
        setRescheduleApt(null);
        setNewDate("");
        fetchAppointments();
      }
    } catch (err) {
      alert("Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Antenatal & Postnatal Checkups
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track scheduled clinic visits, record attendance, and follow up on missed checkups.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
          {[
            { id: "all", label: "All Visits" },
            { id: "today", label: "Today's Clinic" },
            { id: "upcoming", label: "Upcoming (72h SMS)" },
            { id: "missed", label: "Missed Follow-ups", isDanger: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === tab.id
                  ? tab.isDanger
                    ? "bg-white text-rose-700 shadow-xs"
                    : "bg-white text-teal-700 shadow-xs"
                  : tab.isDanger
                  ? "text-rose-600 hover:text-rose-800"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visits Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Visit Appointments ({appointments.length})
          </span>
          <span className="text-xs text-slate-400">
            72-hour reminders automated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Mother Profile</th>
                <th className="px-6 py-3.5">Visit Stage</th>
                <th className="px-6 py-3.5">Scheduled Date</th>
                <th className="px-6 py-3.5">Facility</th>
                <th className="px-6 py-3.5">Attendance Status</th>
                <th className="px-6 py-3.5 text-right">Clinical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading clinic visits...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No visit appointments found under this filter.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {apt.motherName.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/mothers/${apt.pregnancyId}`}
                            className="font-bold text-slate-900 hover:text-teal-700 block text-xs"
                          >
                            {apt.motherName}
                          </Link>
                          <span className="text-[11px] font-mono text-slate-400">
                            {apt.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                        {apt.visitType === "ANC" ? "Antenatal Checkup" : "Postnatal Checkup"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">
                        {new Date(apt.scheduledFor).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(apt.scheduledFor).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {apt.facility}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          apt.status === "attended"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : apt.status === "missed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : apt.status === "rescheduled"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-teal-50 text-teal-700 border border-teal-200"
                        }`}
                      >
                        {apt.status === "attended" ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {apt.status === "missed" ? <AlertTriangle className="w-3 h-3" /> : null}
                        {apt.status === "attended"
                          ? "Attended"
                          : apt.status === "missed"
                          ? "Missed Checkup"
                          : apt.status === "rescheduled"
                          ? "Rescheduled"
                          : "Scheduled"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {apt.status !== "attended" && apt.status !== "rescheduled" ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => markAttended(apt.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Attended
                          </button>
                          <button
                            onClick={() => {
                              setRescheduleApt(apt);
                              setNewDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reschedule
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Reschedule Appointment</h3>
              </div>
              <button onClick={() => setRescheduleApt(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-slate-500">
              Mother: <strong>{rescheduleApt.motherName}</strong> ({rescheduleApt.studyCode}). A new 72-hour reminder will be automatically queued for this date.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">New Appointment Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {rescheduling ? "Updating..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
