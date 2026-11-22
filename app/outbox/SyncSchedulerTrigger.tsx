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
        <button type="submit" disabled={running} className="btn-medical shadow-sm">
          {running ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
              Checking Queues...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-repeat"></i> Trigger Scheduler Check
            </>
          )}
        </button>
      </form>
      {message && (
        <div className="small text-muted mt-1 text-end">{message}</div>
      )}
    </div>
  );
}
