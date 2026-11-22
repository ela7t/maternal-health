"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  Baby,
  Calendar,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  ShieldAlert,
  Send,
  Sparkles,
} from "lucide-react";

export default function MotherProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [babySex, setBabySex] = useState("unknown");
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  // Sensitive Loss Modal State
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [submittingLoss, setSubmittingLoss] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mothers/${id}`);
      if (!res.ok) throw new Error("Participant not found");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.activePregnancy) return;
    setSubmittingDelivery(true);

    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_delivery",
          pregnancyId: data.activePregnancy.id,
          deliveryDate,
          babySex,
          deliveryOutcome: "live_birth",
        }),
      });

      if (!res.ok) throw new Error("Failed to record delivery");
      setShowDeliveryModal(false);
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDelivery(false);
    }
  }

  async function handleRecordLoss(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.activePregnancy) return;
    setSubmittingLoss(true);

    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_loss",
          pregnancyId: data.activePregnancy.id,
          lossReason,
        }),
      });

      if (!res.ok) throw new Error("Failed to record loss");
      setShowLossModal(false);
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingLoss(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Loading participant profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-rose-600 font-semibold">{error || "Participant not found"}</p>
        <Link href="/mothers" className="text-teal-600 hover:underline text-sm">
          ← Back to Mothers Registry
        </Link>
      </div>
    );
  }

  const { participant, activePregnancy, clinicalMetrics } = data;
  const primaryPhone = participant.phones?.[0];
  const ga = clinicalMetrics?.ga;

  return (
    <div className="space-y-6">
      {/* Back button & Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/mothers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
            Back to Mothers Registry
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {participant.fullName}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                activePregnancy?.status === "active"
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : activePregnancy?.status === "postnatal"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : activePregnancy?.status === "loss"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {activePregnancy?.status || "Inactive"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Study ID: <span className="font-mono font-medium text-slate-600">{participant.studyCode}</span> • Facility: {participant.facility.name} • Registered: {new Date(participant.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activePregnancy?.status === "active" && (
            <>
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Baby className="w-4 h-4" />
                Record Delivery
              </button>
              <button
                onClick={() => setShowLossModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Halt Protocol (Loss)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clinical Milestone Progress Stepper */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Clinical Continuum of Care
        </h3>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { label: "Trimester 1", sub: "Weeks 1-12", active: ga && ga.trimester >= 1 },
            { label: "Trimester 2", sub: "Weeks 13-26", active: ga && ga.trimester >= 2 },
            { label: "Trimester 3", sub: "Weeks 27-40", active: ga && ga.trimester >= 3 },
            { label: "Delivery", sub: "Facility Birth", active: activePregnancy?.status === "postnatal" },
            { label: "Postnatal", sub: "Day 1-42", active: activePregnancy?.status === "postnatal" },
          ].map((stage, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border transition ${
                stage.active
                  ? "bg-teal-50 border-teal-300 text-teal-900 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <div>{stage.label}</div>
              <div className="text-[10px] font-normal text-slate-400 mt-0.5">{stage.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gestational / Postnatal Age */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            {clinicalMetrics?.protocol === "postnatal" ? "Postnatal Age" : "Gestational Age"}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {clinicalMetrics?.protocol === "postnatal"
              ? `${clinicalMetrics.postnatalAge.days} Days Postpartum`
              : ga
              ? `${ga.weeks}w ${ga.days}d`
              : "N/A"}
          </p>
          <span className="text-xs text-teal-600 mt-0.5 block font-medium">
            {clinicalMetrics?.protocol === "postnatal"
              ? "Day 1-42 Newborn Follow-up"
              : ga
              ? `Trimester ${ga.trimester}`
              : "Protocol Inactive"}
          </span>
        </div>

        {/* Card 2: EDD in Ethiopian Calendar */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            EDD (ዓመተ ምሕረት)
          </span>
          <p className="text-xl font-bold text-teal-900 mt-1">
            {clinicalMetrics?.eddEthiopian || "N/A"}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            LMP (ET): {clinicalMetrics?.lmpEthiopian || "N/A"}
          </span>
        </div>

        {/* Card 3: EDD in Gregorian */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            EDD (Gregorian)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {clinicalMetrics?.eddGregorian || "N/A"}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Standard Naegele Dating
          </span>
        </div>

        {/* Card 4: Contact & Phone Ownership */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            AfroMessage Phone
          </span>
          <p className="text-base font-bold font-mono text-slate-900 mt-1">
            {primaryPhone?.phoneNumber || "N/A"}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block capitalize">
            Ownership: {primaryPhone?.ownerType || "self"} • {participant.preferredLanguage.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Grid: Appointments & Outbox History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Clinical Appointments</h3>
            </div>
            <Link
              href="/visits"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Manage Visits →
            </Link>
          </div>

          {activePregnancy?.appointments?.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No appointments scheduled.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activePregnancy?.appointments?.map((apt: any) => (
                <div key={apt.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{apt.visitType}</span>
                    <span className="text-slate-400 block">
                      {new Date(apt.scheduledFor).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                      apt.status === "attended"
                        ? "bg-emerald-50 text-emerald-700"
                        : apt.status === "missed"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Delivery History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Dispatched & Scheduled SMS</h3>
            </div>
            <span className="text-xs text-slate-400">
              Framing: <strong className="capitalize">{activePregnancy?.framingVariant || "Gain"}</strong>
            </span>
          </div>

          {activePregnancy?.outboxMessages?.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No SMS messages in queue yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {activePregnancy?.outboxMessages?.map((msg: any) => (
                <div key={msg.id} className="py-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {msg.templateVariant?.messageTemplate?.templateCode || msg.clinicalStage}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                        msg.deliveryStatus === "delivered"
                          ? "bg-emerald-50 text-emerald-700"
                          : msg.status === "sent"
                          ? "bg-blue-50 text-blue-700"
                          : msg.status === "cancelled"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {msg.deliveryStatus || msg.status}
                    </span>
                  </div>
                  <p className="text-slate-600 italic font-serif line-clamp-2">
                    "{msg.messageBody}"
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    Scheduled: {new Date(msg.scheduledFor).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Baby className="w-5 h-5 text-teal-600" />
                Record Facility Delivery
              </h3>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Recording delivery transitions this mother to the <strong>Postnatal Care Protocol (Day 1 - 42)</strong> and halts remaining antenatal pregnancy messages.
            </p>

            <form onSubmit={handleRecordDelivery} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Baby Sex
                </label>
                <select
                  value={babySex}
                  onChange={(e) => setBabySex(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="male">Male (ወንድ)</option>
                  <option value="female">Female (ሴት)</option>
                  <option value="unknown">Not Specified</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelivery}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingDelivery ? "Saving..." : "Confirm Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Loss Modal */}
      {showLossModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border-t-4 border-rose-600">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Sensitive Loss Immediate Halt
              </h3>
              <button
                onClick={() => setShowLossModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs leading-relaxed">
              <strong>Emergency Clinical Protocol:</strong> This action permanently cancels ALL pending automated SMS messages for this participant to avoid sending painful reminders to a grieving family.
            </div>

            <form onSubmit={handleRecordLoss} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Notes / Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spontaneous miscarriage at 16 weeks documented by clinic midwife."
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLossModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLoss}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingLoss ? "Halting..." : "Halt All Reminders Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
