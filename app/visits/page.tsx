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
  const [filter, setFilter] = useState("today");

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
            Clinical Visits & Triage
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ANC & PNC appointment scheduling, 72-hour reminders, and missed visit follow-ups.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        {[
          { id: "today", label: "Today's Clinic" },
          { id: "upcoming", label: "Upcoming (7 Days)" },
          { id: "missed", label: "Missed Follow-Ups" },
          { id: "all", label: "All Appointments" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`pb-3 border-b-2 transition ${
              filter === tab.id
                ? "border-teal-600 text-teal-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointment Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No appointments found under the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{apt.motherName}</span>
                    <span className="text-xs text-slate-400">({apt.studyCode})</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        apt.status === "attended"
                          ? "bg-emerald-50 text-emerald-700"
                          : apt.status === "missed"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-teal-50 text-teal-700"
                      }`}
                    >
                      {apt.visitType} • {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(apt.scheduledFor).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {apt.phone}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {apt.status !== "attended" && (
                    <>
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
                          setNewDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reschedule
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-teal-600" />
              Reschedule Appointment
            </h3>
            <p className="text-xs text-slate-500">
              Rescheduling {rescheduleApt.motherName}'s {rescheduleApt.visitType} appointment. A new 72-hour reminder will be scheduled automatically.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Appointment Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {rescheduling ? "Saving..." : "Save Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
