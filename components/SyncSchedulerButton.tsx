"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncSchedulerButton() {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="d-inline position-relative">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
      >
        <i className={`bi bi-arrow-repeat ${syncing ? "spin" : ""}`}></i>
        <span>{syncing ? "Syncing..." : "Sync Scheduler Now"}</span>
      </button>
      {msg && (
        <span
          className="badge bg-dark text-white position-absolute start-0 top-100 mt-1 shadow-sm px-2 py-1 z-3"
          style={{ whiteSpace: "nowrap" }}
        >
          <i className="bi bi-check-circle-fill text-success me-1"></i> {msg}
        </span>
      )}
    </div>
  );
}
