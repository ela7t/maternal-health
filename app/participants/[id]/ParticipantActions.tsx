"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ParticipantActions({
  participantId,
  status,
  facilityName,
}: {
  participantId: string;
  status: string;
  facilityName: string;
}) {
  const router = useRouter();
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [deliveryPlace, setDeliveryPlace] = useState(facilityName);
  const [babyName, setBabyName] = useState("");
  const [lossOutcome, setLossOutcome] = useState("miscarriage");

  const handleDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mothers/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_delivery",
          deliveryDate,
          deliveryPlace,
          babyName,
        }),
      });
      if (!res.ok) throw new Error("Failed to record delivery");
      setShowDeliveryModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to record delivery");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mothers/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_loss",
          outcome: lossOutcome,
        }),
      });
      if (!res.ok) throw new Error("Failed to record loss");
      setShowLossModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to record loss");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptOut = async () => {
    if (!confirm("Immediately stop all automated SMS for this mother?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mothers/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "opt_out",
          reason: "Clinician requested STOP",
        }),
      });
      if (!res.ok) throw new Error("Failed to opt out");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to opt out");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {status === "active_pregnant" && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: "44px", padding: "0 16px" }}
            onClick={() => setShowDeliveryModal(true)}
            disabled={submitting}
          >
            Record delivery
          </button>
        )}

        {["active_pregnant", "postnatal"].includes(status) && (
          <>
            <button
              type="button"
              className="btn btn-outline"
              style={{ minHeight: "44px", color: "var(--status-urgent-text)", borderColor: "var(--status-urgent-border)" }}
              onClick={() => setShowLossModal(true)}
              disabled={submitting}
            >
              Sensitive loss
            </button>
            <button
              type="button"
              onClick={handleOptOut}
              disabled={submitting}
              className="btn btn-outline"
              style={{ minHeight: "44px" }}
            >
              Opt-out
            </button>
          </>
        )}
      </div>

      {/* Modal: Record Delivery */}
      {showDeliveryModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeliveryModal(false);
          }}
        >
          <div className="card modal-content" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
            <form onSubmit={handleDelivery}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Record birth &amp; delivery
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="btn btn-outline"
                  style={{ minHeight: "44px", minWidth: "44px", padding: 0 }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Recording delivery concludes antenatal pregnancy messages and initiates the 6-week postnatal newborn care stream.
              </p>
              <div className="form-group">
                <label className="form-label">Delivery date &amp; time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery location</label>
                <select
                  className="form-select"
                  value={deliveryPlace}
                  onChange={(e) => setDeliveryPlace(e.target.value)}
                >
                  <option value={facilityName}>{facilityName} (Facility delivery)</option>
                  <option value="Home Delivery">Home delivery</option>
                  <option value="In Transit">In transit</option>
                  <option value="Other Facility">Other facility</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Baby name / code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Baby Dawit"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: "44px" }}
                  onClick={() => setShowDeliveryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minHeight: "44px" }}
                >
                  {submitting ? "Saving..." : "Confirm delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Sensitive Loss */}
      {showLossModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLossModal(false);
          }}
        >
          <div className="card modal-content" style={{ maxWidth: "480px", width: "100%", padding: "24px", borderColor: "var(--status-urgent-border)" }}>
            <form onSubmit={handleLoss}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--status-urgent-text)" }}>
                  Emergency sensitive loss halt
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLossModal(false)}
                  className="btn btn-outline"
                  style={{ minHeight: "44px", minWidth: "44px", padding: 0 }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--status-urgent-text)", marginBottom: "16px" }}>
                This immediately halts all automated SMS messages and flags the participant for supportive human follow-up.
              </p>
              <div className="form-group">
                <label className="form-label">Classification of loss</label>
                <select
                  className="form-select"
                  value={lossOutcome}
                  onChange={(e) => setLossOutcome(e.target.value)}
                  required
                >
                  <option value="miscarriage">Early miscarriage</option>
                  <option value="stillbirth">Stillbirth</option>
                  <option value="neonatal_death">Neonatal mortality</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: "44px" }}
                  onClick={() => setShowLossModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minHeight: "44px", backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }}
                >
                  {submitting ? "Processing..." : "Confirm & halt all SMS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
