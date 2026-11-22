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

  // Delivery form state
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [deliveryPlace, setDeliveryPlace] = useState(facilityName);
  const [babyName, setBabyName] = useState("");

  // Loss form state
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
      <div className="d-flex flex-wrap gap-2">
        {status === "active_pregnant" && (
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-1 shadow-sm"
            onClick={() => setShowDeliveryModal(true)}
            disabled={submitting}
          >
            <i className="bi bi-gift-fill"></i> Record Delivery
          </button>
        )}

        {["active_pregnant", "postnatal"].includes(status) && (
          <>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
              onClick={() => setShowLossModal(true)}
              disabled={submitting}
            >
              <i className="bi bi-heartbreak"></i> Sensitive Loss
            </button>
            <button
              type="button"
              onClick={handleOptOut}
              disabled={submitting}
              className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
            >
              <i className="bi bi-slash-circle"></i> Opt-Out
            </button>
          </>
        )}
      </div>

      {/* Modal: Record Delivery */}
      {showDeliveryModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleDelivery}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="bi bi-gift-fill text-success me-2"></i>Record Birth & Delivery
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeliveryModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <p className="text-secondary small mb-3">
                    Recording delivery automatically concludes antenatal pregnancy messages and starts the 6-week postnatal newborn care stream.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Delivery Date & Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Delivery Location</label>
                    <select
                      className="form-select"
                      value={deliveryPlace}
                      onChange={(e) => setDeliveryPlace(e.target.value)}
                    >
                      <option value={facilityName}>{facilityName} (Facility Delivery)</option>
                      <option value="Home Delivery">Home Delivery</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Other Facility">Other Facility</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-secondary">Baby Name / Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Baby Dawit"
                      value={babyName}
                      onChange={(e) => setBabyName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowDeliveryModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-success fw-bold">
                    {submitting ? "Saving..." : "Confirm Delivery & Switch Stream"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Sensitive Loss */}
      {showLossModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content border-danger shadow">
              <form onSubmit={handleLoss}>
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>Emergency Sensitive Loss Halt
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowLossModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <p className="text-danger fw-semibold small mb-3">
                    To protect the mother and family from severe distress, this immediately halts all automated SMS messages and creates an audit flag for supportive human follow-up.
                  </p>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-secondary">Classification of Loss</label>
                    <select
                      className="form-select"
                      value={lossOutcome}
                      onChange={(e) => setLossOutcome(e.target.value)}
                      required
                    >
                      <option value="miscarriage">Early Miscarriage</option>
                      <option value="stillbirth">Stillbirth</option>
                      <option value="neonatal_death">Neonatal Mortality</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowLossModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-danger fw-bold">
                    {submitting ? "Processing..." : "Confirm & Halt All Automated Messages"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
