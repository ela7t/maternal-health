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
    return <span className="text-muted small">Completed</span>;
  }

  return (
    <div className="d-inline-flex gap-2">
      <button
        type="button"
        onClick={handleAttend}
        disabled={submitting}
        className="btn btn-sm btn-outline-success fw-semibold"
      >
        <i className="bi bi-check-lg"></i> Attended
      </button>
      <button
        type="button"
        onClick={() => setShowReschedule(true)}
        disabled={submitting}
        className="btn btn-sm btn-outline-secondary fw-semibold"
      >
        <i className="bi bi-calendar-plus"></i> Reschedule
      </button>

      {showReschedule && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow text-start">
              <form onSubmit={handleReschedule}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Reschedule Appointment</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReschedule(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <p className="small text-muted mb-3">
                    Mother: <strong>{participantName}</strong> ({publicCode})
                  </p>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-secondary">
                      New Appointment Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                    />
                    <small className="text-muted">
                      A new 72-hour reminder will be automatically queued for this date.
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowReschedule(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary fw-bold">
                    {submitting ? "Rescheduling..." : "Confirm Reschedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
