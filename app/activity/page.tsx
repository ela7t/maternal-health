"use client";

import { useState, useEffect } from "react";
import {
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Phone,
  Sparkles,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SMS Outbox & Delivery Audit
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automated AfroMessage dispatch records, delivery receipts, and gateway callbacks.
          </p>
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Dispatching..." : "Sync & Dispatch Outbox"}
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

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Outbox Messages</option>
            <option value="pending">Pending / Queued</option>
            <option value="sent">Sent to AfroMessage</option>
            <option value="delivered">Delivered to Handset</option>
            <option value="failed">Failed Delivery</option>
            <option value="cancelled">Cancelled (Loss / Opt-out)</option>
          </select>
        </div>

        <span className="text-slate-400">
          Showing up to 100 recent entries
        </span>
      </div>

      {/* Outbox Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading SMS activity...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No outbox messages found. Click "Sync & Dispatch Outbox" to trigger the engine.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Recipient & Mother</th>
                  <th className="px-5 py-3.5">Template & Stage</th>
                  <th className="px-5 py-3.5">Message Content</th>
                  <th className="px-5 py-3.5">Scheduled Time</th>
                  <th className="px-5 py-3.5">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">
                          {m.motherName}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {m.recipientPhone}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-mono font-semibold text-slate-800 block">
                          {m.templateCode}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {m.clinicalStage} • {m.framingVariant}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-800 font-sans italic">
                        "{m.messageBody}"
                      </p>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(m.scheduledFor).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          m.deliveryStatus === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : m.status === "sent"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : m.status === "failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : m.status === "cancelled"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {m.deliveryStatus || m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
