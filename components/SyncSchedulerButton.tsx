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
    } catch {
      setMsg("Sync failed");
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="btn btn-outline"
        style={{ minHeight: "44px" }}
      >
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span>{syncing ? "Syncing..." : "Sync scheduler"}</span>
      </button>
      {msg && (
        <span
          className="badge badge-success"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            whiteSpace: "nowrap",
            zIndex: 40,
          }}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
