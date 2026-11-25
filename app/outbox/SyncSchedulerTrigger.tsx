"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncSchedulerTrigger() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setMessage(null);

    try {
      const res = await fetch("/api/activity", {
        method: "POST",
      });
      const data = await res.json();
      setMessage(data.message || `Dispatched ${data.dispatched ?? 0} reminders.`);
      router.refresh();
    } catch {
      setMessage("Error executing scheduler cycle.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleRun}>
        <button type="submit" disabled={running} className="btn btn-primary" style={{ minHeight: "44px" }}>
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{running ? "Checking queues..." : "Trigger scheduler check"}</span>
        </button>
      </form>
      {message && (
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.35rem", textAlign: "right" }}>
          {message}
        </div>
      )}
    </div>
  );
}
