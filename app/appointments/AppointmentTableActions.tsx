"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AppointmentTableActions({
  appointmentId,
  participantName,
  publicCode,
  status,
}: {
  appointmentId: string;
  participantName: string;
  publicCode: string;
  status: string;
}) {
  const router = useRouter();
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAttend = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          action: "attended",
        }),
      });
      if (!res.ok) throw new Error("Failed to mark as attended");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          action: "reschedule",
          newDate,
        }),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      setShowReschedule(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to reschedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!["scheduled", "missed"].includes(status)) {
    return (
      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
        Completed
      </span>
    );
  }

  return (
    <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={handleAttend}
        disabled={submitting}
        className="btn btn-primary"
        style={{ minHeight: "44px", padding: "0 14px" }}
      >
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Attended</span>
      </button>
      <button
        type="button"
        onClick={() => setShowReschedule(true)}
        disabled={submitting}
        className="btn btn-outline"
        style={{ minHeight: "44px", padding: "0 14px" }}
      >
        <span>Reschedule</span>
      </button>

      {showReschedule && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReschedule(false);
          }}
        >
          <div className="card modal-content" style={{ maxWidth: "460px", width: "100%", padding: "24px", textAlign: "left" }}>
            <form onSubmit={handleReschedule}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Reschedule appointment
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  className="btn btn-outline"
                  style={{ minHeight: "44px", minWidth: "44px", padding: 0 }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Mother: <strong style={{ color: "var(--text-primary)" }}>{participantName}</strong> ({publicCode})
              </p>
              <div className="form-group">
                <label className="form-label">New appointment date &amp; time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
                <div className="form-hint">
                  A new 72-hour reminder will be automatically queued for this date.
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: "44px" }}
                  onClick={() => setShowReschedule(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minHeight: "44px" }}
                >
                  {submitting ? "Rescheduling..." : "Confirm reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
