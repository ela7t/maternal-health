"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  ClipboardCheck,
  Gift,
  HeartCrack,
  Slash,
  MessageSquare,
  Check,
} from "lucide-react";

export default function MotherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"appointments" | "messages">("appointments");

  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [deliveryPlace, setDeliveryPlace] = useState("Wolkite Health Center");
  const [babyName, setBabyName] = useState("");
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  // Sensitive Loss Modal State
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossReason, setLossReason] = useState("miscarriage");
  const [submittingLoss, setSubmittingLoss] = useState(false);

  // Custom SMS Modal State
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [customSmsText, setCustomSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleAptId, setRescheduleAptId] = useState<string | null>(null);
  const [newAptDate, setNewAptDate] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

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
    setSubmittingDelivery(true);
    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
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
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDelivery(false);
    }
  }

  async function handleRecordLoss(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingLoss(true);
    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_loss",
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

  async function handleOptOut() {
    if (!confirm("Immediately halt and stop all automated SMS reminders for this mother?")) {
      return;
    }
    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "opt_out" }),
      });
      if (!res.ok) throw new Error("Failed to process opt out");
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSendCustomSms(e: React.FormEvent) {
    e.preventDefault();
    if (!customSmsText.trim()) return;
    setSendingSms(true);
    setSmsFeedback(null);
    try {
      const res = await fetch(`/api/mothers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_sms",
          customMessage: customSmsText.trim(),
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to dispatch message");
      setSmsFeedback("SMS successfully dispatched via AfroMessage!");
      setCustomSmsText("");
      setTimeout(() => {
        setShowSmsModal(false);
        setSmsFeedback(null);
      }, 2000);
      await fetchProfile();
    } catch (err: any) {
      setSmsFeedback(`Dispatch error: ${err.message}`);
    } finally {
      setSendingSms(false);
    }
  }

  async function handleMarkAttended(aptId: number) {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: String(aptId), action: "attend" }),
      });
      if (!res.ok) throw new Error("Failed to mark attended");
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleAptId || !newAptDate) return;
    setSubmittingReschedule(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleAptId,
          action: "reschedule",
          newDate: newAptDate,
        }),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      setRescheduleAptId(null);
      setNewAptDate("");
      await fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReschedule(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm">
        Loading mother clinical profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-rose-600 font-semibold">{error || "Participant not found"}</p>
        <Link href="/mothers" className="text-teal-600 hover:underline text-xs">
          &larr; Back to Mothers Registry
        </Link>
      </div>
    );
  }

  const { participant, activePregnancy, clinicalMetrics } = data;
  const primaryPhone = participant.primaryPhone || participant.phones?.[0];
  const ga = clinicalMetrics?.ga;
  const status = participant.status;

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 font-bold text-lg flex items-center justify-center shrink-0">
              {participant.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {participant.fullName}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  {participant.studyCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {participant.facility.name} &bull; {participant.kebele} &bull; Enrolled:{" "}
                {new Date(participant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Clinical Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {status === "active_pregnant" && (
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
              >
                <Gift className="w-3.5 h-3.5" />
                Record Delivery
              </button>
            )}

            {(status === "active_pregnant" || status === "postnatal") && (
              <>
                <button
                  onClick={() => setShowLossModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition"
                >
                  <HeartCrack className="w-3.5 h-3.5" />
                  Sensitive Loss
                </button>
                <button
                  onClick={handleOptOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold transition"
                >
                  <Slash className="w-3.5 h-3.5" />
                  Opt-Out
                </button>
              </>
            )}

            <button
              onClick={() => setShowSmsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition"
            >
              <Send className="w-3.5 h-3.5 text-teal-600" />
              Send SMS
            </button>

            <Link
              href="/mothers"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Registry
            </Link>
          </div>
        </div>

        {/* Longitudinal Maternity Stepper */}
        <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              {
                num: "1",
                label: "1st Trimester",
                sub: "(1–13 wks)",
                completed: ga && ga.trimester >= 1,
                active: ga && ga.trimester === 1 && status === "active_pregnant",
              },
              {
                num: "2",
                label: "2nd Trimester",
                sub: "(14–27 wks)",
                completed: (ga && ga.trimester > 2) || status === "postnatal" || status === "completed",
                active: ga && ga.trimester === 2 && status === "active_pregnant",
              },
              {
                num: "3",
                label: "3rd Trimester",
                sub: "(28–40 wks)",
                completed: status === "postnatal" || status === "completed",
                active: ga && ga.trimester === 3 && status === "active_pregnant",
              },
              {
                num: "4",
                label: "Postnatal Care",
                sub: "(Day 1–42)",
                completed: status === "completed",
                active: status === "postnatal",
              },
              {
                num: "5",
                label: "Graduated",
                sub: "(6 Weeks)",
                completed: status === "completed",
                active: false,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border transition ${
                  step.active
                    ? "bg-teal-50 border-teal-400 text-teal-900 font-bold"
                    : step.completed
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {step.completed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  <span>{step.label}</span>
                </div>
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">{step.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Clinical Obstetric Profile + Telephony Card */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Left Column (4 cols): Obstetric & Gestational Profile */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Obstetric & Gestational Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500">Estimated Due Date (GC)</span>
              <div className="text-base font-bold text-slate-900 mt-1">
                {clinicalMetrics?.eddGregorian || "N/A"}
              </div>
              <span className="text-[10px] text-slate-400">Naegele&apos;s rule (LMP + 280d)</span>
            </div>

            <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40">
              <span className="text-[11px] font-medium text-teal-800">EDD in Ethiopian Calendar (ዓ.ም)</span>
              <div className="text-base font-bold text-teal-800 mt-1">
                {clinicalMetrics?.eddEthiopian || "N/A"}
              </div>
              <span className="text-[10px] text-teal-600">LMP (ዓ.ም): {clinicalMetrics?.lmpEthiopian || "N/A"}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500">Gestational Age Status</span>
              {clinicalMetrics?.protocol === "postnatal" ? (
                <div className="text-base font-bold text-purple-700 mt-1">
                  {clinicalMetrics.postnatalAge.formatted}
                </div>
              ) : ga ? (
                <div>
                  <div className="text-base font-bold text-slate-900 mt-1">{ga.formatted}</div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800 mt-0.5">
                    Trimester {ga.trimester} Active
                  </span>
                </div>
              ) : (
                <div className="text-slate-400 mt-1">—</div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500">Clinical Risk Assessment</span>
              <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                {activePregnancy?.riskStatus || "Low"} Risk
              </div>
              <span className="text-[10px] text-slate-400 uppercase">
                Dating Method: {activePregnancy?.datingMethod || "LMP"}
              </span>
            </div>

            {/* Confirmed Delivery Banner */}
            {activePregnancy?.deliveredAt && (
              <div className="sm:col-span-2 p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  Delivery Event Confirmed
                </div>
                <p className="mt-1 text-slate-700">
                  Delivered on{" "}
                  <strong>{new Date(activePregnancy.deliveredAt).toLocaleDateString()}</strong> at{" "}
                  <strong>{activePregnancy.deliveryPlace || "Health Center"}</strong>.
                </p>
                {activePregnancy.babies?.map((b: any) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-medium text-xs mt-2 mr-2"
                  >
                    <Baby className="w-3.5 h-3.5" />
                    {b.name || "Baby"} ({b.babyCode})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (3 cols): Contact & Automated Delivery */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Phone className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Contact & Automated Delivery
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500 block">Delivery Phone Number</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {primaryPhone ? primaryPhone.phoneNumber : "No phone recorded"}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold capitalize">
                  Owner: {primaryPhone ? primaryPhone.ownerType : "Unknown"}
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Non-diagnostic SMS
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500 block">Language & Message Tone</span>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {participant.preferredLanguage === "am"
                  ? "Amharic (አማርኛ)"
                  : participant.preferredLanguage === "gurage"
                  ? "Gurage"
                  : "English"}
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Tone:{" "}
                {participant.studyArm === "intervention_gain"
                  ? "Gain-framed (Encouraging benefits)"
                  : "Loss-framed (Risk awareness cautions)"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500 block">Assigned Health Facility</span>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {participant.facility.name}
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {participant.facility.woreda}, {participant.facility.zone} Zone
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Checkups & Visits + Dispatched SMS History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition ${
              activeTab === "appointments"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Checkups & Visits ({participant.appointments.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition ${
              activeTab === "messages"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Dispatched SMS Log ({participant.outboxMessages.length})
          </button>
        </div>

        {/* Tab 1: Checkups & Visits */}
        {activeTab === "appointments" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Visit Type</th>
                  <th className="px-6 py-3.5">Scheduled Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Recorded By</th>
                  <th className="px-6 py-3.5">Notes</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participant.appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No visits scheduled yet.
                    </td>
                  </tr>
                ) : (
                  participant.appointments.map((apt: any) => (
                    <tr key={apt.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">{apt.visitType}</span>
                        <span className="text-[11px] text-slate-400 uppercase">{apt.kind}</span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {new Date(apt.scheduledFor).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                            apt.status === "attended"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : apt.status === "missed"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : apt.status === "rescheduled"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-teal-50 text-teal-700 border border-teal-200"
                          }`}
                        >
                          {apt.status === "attended" ? <CheckCircle2 className="w-3 h-3" /> : null}
                          {apt.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">{apt.recordedBy}</td>

                      <td className="px-6 py-4 text-slate-500">{apt.notes}</td>

                      <td className="px-6 py-4 text-right">
                        {apt.status === "scheduled" || apt.status === "missed" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleMarkAttended(apt.id)}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold transition text-[11px]"
                            >
                              Attended
                            </button>
                            <button
                              onClick={() => {
                                setRescheduleAptId(String(apt.id));
                                setNewAptDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
                              }}
                              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition text-[11px]"
                            >
                              Reschedule
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Dispatched SMS Log */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">SMS Content</th>
                  <th className="px-6 py-3.5">Segments</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Scheduled / Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participant.outboxMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      No automated messages dispatched yet.
                    </td>
                  </tr>
                ) : (
                  participant.outboxMessages.map((msg: any) => (
                    <tr key={msg.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-slate-400">#{msg.id}</td>

                      <td className="px-6 py-4 max-w-md">
                        <p className="text-slate-800 line-clamp-2">{msg.messageBody}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                          {msg.segments} seg (UCS-2)
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                            msg.deliveryStatus === "delivered" || msg.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : msg.status === "sent" || msg.status === "submitted"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : msg.status === "cancelled"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {msg.deliveryStatus || msg.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {new Date(msg.sentAt || msg.scheduledFor).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Delivery */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Record Birth & Delivery</h3>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Recording delivery concludes pregnancy antenatal messages and begins the 6-week postnatal newborn care stream.
            </p>

            <form onSubmit={handleRecordDelivery} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Delivery Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Delivery Location</label>
                <select
                  value={deliveryPlace}
                  onChange={(e) => setDeliveryPlace(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value={participant.facility.name}>{participant.facility.name} (Facility Delivery)</option>
                  <option value="Home Delivery">Home Delivery</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Other Facility">Other Facility</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Baby Name / Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Baby Dawit"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelivery}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingDelivery ? "Recording..." : "Confirm Delivery & Switch Stream"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sensitive Loss Halt */}
      {showLossModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs border border-rose-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm">Emergency Sensitive Loss Halt</h3>
              </div>
              <button onClick={() => setShowLossModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-rose-700 font-medium leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-100">
              To protect the mother and family from severe distress, this immediately halts all automated SMS messages and creates an audit flag for supportive human follow-up.
            </p>

            <form onSubmit={handleRecordLoss} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Classification of Loss</label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="miscarriage">Early Miscarriage</option>
                  <option value="stillbirth">Stillbirth</option>
                  <option value="neonatal_death">Neonatal Mortality</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLossModal(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLoss}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingLoss ? "Halting..." : "Confirm & Halt All Messages"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Custom SMS */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Send Direct SMS to Mother</h3>
              </div>
              <button onClick={() => setShowSmsModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-slate-500">
              Sending immediate clinical reminder to <strong>{primaryPhone?.phoneNumber}</strong> ({primaryPhone?.ownerType}). Remember: Never include PII or diagnostic disclosures.
            </p>

            <form onSubmit={handleSendCustomSms} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Message Text (Amharic or English)</label>
                <textarea
                  rows={4}
                  required
                  value={customSmsText}
                  onChange={(e) => setCustomSmsText(e.target.value)}
                  placeholder="ጤና ይስጥልኝ! የቅድመ ወሊድ ክትትልዎን ለማድረግ እባክዎ ወደ ጤና ጣቢያ ይምጡ።"
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              {smsFeedback && (
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-semibold">
                  {smsFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSms}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {sendingSms ? "Sending..." : "Send Message Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Appointment */}
      {rescheduleAptId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Reschedule Appointment</h3>
              </div>
              <button onClick={() => setRescheduleAptId(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-slate-500">
              A new 72-hour reminder SMS will be automatically queued before this new visit date.
            </p>

            <form onSubmit={handleReschedule} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">New Appointment Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newAptDate}
                  onChange={(e) => setNewAptDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleAptId(null)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingReschedule ? "Updating..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
