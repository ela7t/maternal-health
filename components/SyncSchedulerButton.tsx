"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncSchedulerButton() {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/activity", { method: "POST" });
      const data = await res.json();
      setMsg(`Dispatched ${data.dispatched || 0} SMS (${data.planned || 0} planned)`);
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg("Sync failed");
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${syncing ? "animate-spin" : ""}`} />
        <span>{syncing ? "Syncing..." : "Sync Scheduler Now"}</span>
      </button>
      {msg && (
        <span className="absolute top-full mt-1.5 right-0 whitespace-nowrap bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded shadow-lg z-50 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          {msg}
        </span>
      )}
    </div>
  );
}
