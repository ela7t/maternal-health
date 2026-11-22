"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Phone,
  Radio,
} from "lucide-react";

interface OutboxItem {
  id: string;
  recipientPhone: string;
  messageBody: string;
  clinicalStage: string;
  status: string;
  deliveryStatus: string | null;
  scheduledFor: string;
  sentAt: string | null;
  deliveredAt: string | null;
  motherName: string;
  studyCode: string;
  templateCode: string;
  framingVariant: string;
  languageCode: string;
}

export default function ActivityPage() {
  const [messages, setMessages] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, [statusFilter]);

  async function fetchActivity() {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity?status=${statusFilter}`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/activity", { method: "POST" });
      const data = await res.json();
      setSyncResult(
        `Dispatched ${data.dispatched || 0} messages (${data.planned || 0} newly planned schedules).`
      );
      fetchActivity();
    } catch (err) {
      setSyncResult("Dispatch run failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated SMS Activity Log
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time tracking of prenatal educational messages, 72-hour appointment reminders, and network delivery receipts.
          </p>
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Checking & Dispatching..." : "Trigger Scheduler Check"}
        </button>
      </div>

      {syncResult && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            {syncResult}
          </span>
          <button onClick={() => setSyncResult(null)} className="text-teal-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Outbox Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-teal-600" />
            Dispatched & Scheduled Messages ({messages.length})
          </span>

          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            {[
              { id: "all", label: "All" },
              { id: "delivered", label: "Delivered" },
              { id: "pending", label: "Queued" },
              { id: "failed", label: "Failed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-md transition ${
                  statusFilter === tab.id
                    ? "bg-white text-teal-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Mother</th>
                <th className="px-6 py-3.5">Recipient Phone</th>
                <th className="px-6 py-3.5">SMS Text Preview</th>
                <th className="px-6 py-3.5">Segments (UCS-2)</th>
                <th className="px-6 py-3.5">Network Status</th>
                <th className="px-6 py-3.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading SMS activity...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No messages currently in the outbox matching this filter.
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">{m.motherName}</span>
                      <span className="text-[11px] font-mono text-slate-400">{m.studyCode}</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-slate-800 block">
                        {m.recipientPhone}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {m.templateCode}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-sm">
                      <p className="line-clamp-2 text-slate-700 font-sans">{m.messageBody}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        {Array.from(m.messageBody).length > 70 ? "2 seg" : "1 seg"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          m.deliveryStatus === "delivered" || m.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : m.status === "sent" || m.status === "submitted"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : m.status === "cancelled"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : m.status === "pending" || m.status === "queued"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {m.deliveryStatus === "delivered" || m.status === "delivered" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : null}
                        {m.deliveryStatus || m.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {new Date(m.sentAt || m.scheduledFor).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
