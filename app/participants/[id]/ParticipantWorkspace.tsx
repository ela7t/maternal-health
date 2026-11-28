"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SerializedAppointment {
  id: number;
  kind: string;
  scheduledFor: string;
  status: string;
  recordedBy: string | null;
  notes: string | null;
}

export interface SerializedBaby {
  id: number;
  name: string | null;
  status: string;
}

export interface SerializedOutbox {
  id: number;
  scheduledAt: string;
  sentAt: string | null;
  messageContent: string;
  segments: number;
  status: string;
}

export interface ParticipantWorkspaceProps {
  participant: {
    id: number;
    publicCode: string;
    fullName: string;
    kebele: string;
    preferredLanguage: string;
    status: string;
    enrolledAt: string;
    ageYears: number | null;
    facilityName: string;
    phoneNumber: string | null;
    phoneOwner: string | null;
    consentActive: boolean;
  };
  pregnancy: {
    eddIso: string | null;
    eddShort: string;
    eddLong: string;
    eddEthAm: string;
    eddEthEn: string;
    lmpShort: string;
    lmpEthAm: string;
    datingMethod: string;
    riskStatus: string;
    deliveredAtShort: string | null;
    deliveryPlace: string | null;
    outcome: string;
    babies: SerializedBaby[];
  } | null;
  ga: {
    weeks: number;
    formatted: string;
    trimester: number;
    daysUntilEdd: number | null;
    progressPct: number;
  } | null;
  pnc: {
    formatted: string;
    daysSinceDelivery: number;
  } | null;
  appointments: SerializedAppointment[];
  outboxMessages: SerializedOutbox[];
}

const ANC_SCHEDULE = [
  { num: 1, week: 16 },
  { num: 2, week: 20 },
  { num: 3, week: 26 },
  { num: 4, week: 30 },
  { num: 5, week: 34 },
  { num: 6, week: 36 },
  { num: 7, week: 38 },
  { num: 8, week: 42 },
];

const PNC_SCHEDULE = [
  { num: 1, label: "24h", day: 1 },
  { num: 2, label: "3d", day: 3 },
  { num: 3, label: "7-14d", day: 10 },
  { num: 4, label: "6w", day: 42 },
];

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)}...${phone.slice(-2)}`;
}

function formatLanguage(code: string): string {
  if (code === "am") return "Amharic";
  if (code === "gurage") return "Gurage";
  return "English";
}

function formatOwner(owner: string | null): string {
  if (!owner || owner === "self") return "Own phone";
  if (owner === "husband") return "Husband's phone";
  if (owner === "family") return "Family phone";
  return owner;
}

function formatDatingMethod(method: string | null): string {
  if (method === "lmp") return "Last Menstrual Period (LMP)";
  if (method === "ultrasound") return "Ultrasound";
  if (method === "edd") return "Direct EDD";
  return method || "LMP";
}

function getAncSlotIdx(scheduledForIso: string, eddIso: string | null | undefined): number {
  if (!eddIso) return 0;
  const weeksBeforeEdd = (new Date(eddIso).getTime() - new Date(scheduledForIso).getTime()) / (1000 * 3600 * 24 * 7);
  const gaAtVisit = 40 - weeksBeforeEdd;
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < ANC_SCHEDULE.length; i++) {
    const diff = Math.abs(ANC_SCHEDULE[i].week - gaAtVisit);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function ParticipantWorkspace({
  participant,
  pregnancy,
  ga,
  pnc,
  appointments,
  outboxMessages,
}: ParticipantWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"timeline" | "messages">("timeline");
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [showAllPlanned, setShowAllPlanned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [visitModal, setVisitModal] = useState<{
    open: boolean;
    appointmentId: number | null;
    kind: string;
    visitDate: string;
    notes: string;
  }>({
    open: false,
    appointmentId: null,
    kind: "anc",
    visitDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Form states
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [deliveryPlace, setDeliveryPlace] = useState(participant.facilityName);
  const [babyName, setBabyName] = useState("");
  const [phoneInput, setPhoneInput] = useState(participant.phoneNumber || "");
  const [ownerInput, setOwnerInput] = useState(participant.phoneOwner || "self");
  const [smsText, setSmsText] = useState("");
  const [lossOutcome, setLossOutcome] = useState("miscarriage");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackLog, setFeedbackLog] = useState<Array<{ note: string; date: string }>>([]);

  useEffect(() => {
    const heroEl = document.getElementById("patient-hero");
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest(".dropdown-wrapper")) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const delivered =
    Boolean(pregnancy?.deliveredAtShort) ||
    participant.status === "postnatal" ||
    participant.status === "completed";

  const ancVisits = appointments
    .filter((a) => a.kind === "anc")
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  const pncVisits = appointments
    .filter((a) => a.kind === "pnc")
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const ancAttended = ancVisits.filter((a) => a.status === "attended").length;
  const pncAttended = pncVisits.filter((a) => a.status === "attended").length;
  const totalAttended = ancAttended + pncAttended;

  // Build full 8-slot WHO ANC schedule (merging DB appointments + projected WHO dates)
  const fullAncTimeline: Array<SerializedAppointment & { slotIdx: number }> = ANC_SCHEDULE.map((node, idx) => {
    const existing = ancVisits.find((a) => getAncSlotIdx(a.scheduledFor, pregnancy?.eddIso) === idx);
    if (existing) return { ...existing, slotIdx: idx };
    const projectedDate = pregnancy?.eddIso
      ? new Date(new Date(pregnancy.eddIso).getTime() - (40 - node.week) * 7 * 24 * 3600 * 1000)
      : new Date();
    return {
      id: -(idx + 1), // negative synthetic id for projected WHO slot
      kind: "anc",
      scheduledFor: projectedDate.toISOString(),
      status: "scheduled",
      recordedBy: null,
      notes: null,
      slotIdx: idx,
    };
  });

  const nextVisit =
    appointments
      .filter((a) => a.status === "scheduled" || a.status === "missed")
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0] ||
    fullAncTimeline.find((a) => a.status === "scheduled") ||
    null;

  const isNextVisitOverdue = Boolean(
    nextVisit &&
      (nextVisit.status === "missed" ||
        new Date(nextVisit.scheduledFor) < new Date(new Date().setHours(0, 0, 0, 0)))
  );

  const nextAncSlotIdx = nextVisit?.kind === "anc" ? getAncSlotIdx(nextVisit.scheduledFor, pregnancy?.eddIso) : -1;
  const nextAncLabel =
    nextVisit?.kind === "anc"
      ? `ANC Contact ${nextAncSlotIdx + 1} (${ANC_SCHEDULE[nextAncSlotIdx]?.week || 26} weeks)`
      : nextVisit
      ? `PNC Contact`
      : null;

  // Split ANC visits into attended/next + 1 planned vs remaining planned for collapse
  const firstPlannedIdx = fullAncTimeline.findIndex((x) => x.status === "scheduled" || x.status === "missed");
  const visibleAncVisits = showAllPlanned
    ? fullAncTimeline
    : fullAncTimeline.filter((v, idx) => {
        if (v.status === "attended" || v.status === "missed") return true;
        if (nextVisit && v.id === nextVisit.id) return true;
        return firstPlannedIdx >= 0 && idx <= firstPlannedIdx + 1;
      });
  const hiddenPlannedCount = Math.max(0, fullAncTimeline.length - visibleAncVisits.length);

  async function postAction(payload: Record<string, unknown>, onSuccess?: () => void) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mothers/${participant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${participant.fullName} (${participant.publicCode})?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mothers/${participant.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      router.push("/participants");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setSubmitting(false);
    }
  }

  const actionButtons = (
    <>
      <button
        type="button"
        className="btn btn-primary"
        style={{ minHeight: "44px", padding: "0 16px", fontWeight: 600 }}
        onClick={() =>
          setVisitModal({
            open: true,
            appointmentId: nextVisit?.id ?? null,
            kind: delivered ? "pnc" : "anc",
            visitDate: new Date().toISOString().slice(0, 10),
            notes: "",
          })
        }
        disabled={submitting}
      >
        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Record Visit</span>
      </button>

      {!delivered && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ minHeight: "44px", padding: "0 14px" }}
          onClick={() => setShowBirthModal(true)}
          disabled={submitting}
        >
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Record Birth</span>
        </button>
      )}

      <div className={`dropdown-wrapper ${menuOpen ? "open" : ""}`}>
        <button
          type="button"
          className="dropdown-trigger"
          style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="More options"
        >
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
        {menuOpen && (
          <div className="dropdown-menu" style={{ display: "block" }}>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setMenuOpen(false);
                setShowPhoneModal(true);
              }}
            >
              <span>Update Phone Number</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setMenuOpen(false);
                setShowSmsModal(true);
              }}
            >
              <span>Send Immediate SMS</span>
            </button>
            {["active_pregnant", "postnatal"].includes(participant.status) && (
              <>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowLossModal(true);
                  }}
                >
                  <span>Record Sensitive Loss</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm("Immediately stop all automated SMS for this mother?")) {
                      postAction({ action: "opt_out", reason: "Clinician requested STOP" });
                    }
                  }}
                >
                  <span>Revoke SMS Consent</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={() => {
                setMenuOpen(false);
                handleDelete();
              }}
            >
              <span>Delete Record...</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="patient-profile-wrapper">
      {/* Back to Directory */}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          href="/participants"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Directory</span>
        </Link>
      </div>

      {/* Sticky Quick Action Bar (Revealed only when hero card scrolls out of view) */}
      {showStickyBar && (
        <div className="profile-sticky-actions is-visible">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
              {participant.fullName}
            </span>
            <span className="mrn-badge">MRN: {participant.publicCode}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {actionButtons}
          </div>
        </div>
      )}

      {/* 1. UNIFIED PATIENT HERO CARD */}
      <div className="patient-hero-card" id="patient-hero">
        <div
          className="hero-name-row"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}
        >
          <div className="hero-name-group" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h1 className="patient-hero-title" style={{ margin: 0, fontSize: "1.75rem" }}>
              {participant.fullName}
            </h1>
            <span className="mrn-badge">MRN: {participant.publicCode}</span>
            {pregnancy?.riskStatus === "high" && <span className="badge badge-urgent">High Risk</span>}
            {pregnancy?.riskStatus === "elevated" && <span className="badge badge-warning">Elevated Risk</span>}
            {participant.status === "postnatal" && <span className="badge badge-success">Postpartum</span>}
            {participant.status === "opted_out" && <span className="badge badge-warning">Opted Out</span>}
            {participant.status === "loss" && <span className="badge badge-urgent">Sensitive Loss</span>}
          </div>

          <div className="hero-action-group" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {actionButtons}
          </div>
        </div>

        {/* Hero Meta Row */}
        <div
          className="hero-meta-row"
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 24px",
            fontSize: "0.875rem",
          }}
        >
          {ga && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Gestational Age
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{ga.formatted}</strong>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                ({ga.trimester === 1 ? "1st" : ga.trimester === 2 ? "2nd" : "3rd"} Trimester)
              </span>
            </div>
          )}
          {pnc && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Postpartum Age
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{pnc.formatted}</strong>
            </div>
          )}
          {pregnancy?.eddIso && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Due Date (EDD)
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{pregnancy.eddShort}</strong>
              {pregnancy.eddEthAm && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}> &bull; {pregnancy.eddEthAm}</span>
              )}
            </div>
          )}
          {nextVisit && (
            <div>
              <span
                style={{
                  color: isNextVisitOverdue ? "var(--status-urgent-text)" : "var(--text-muted)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                }}
              >
                {isNextVisitOverdue ? "Missed Appointment" : "Next Appointment"}
              </span>
              <strong style={{ color: isNextVisitOverdue ? "var(--status-urgent-text)" : "var(--text-primary)" }}>
                {nextAncLabel}
              </strong>{" "}
              <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                &bull; {new Date(nextVisit.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              Age &amp; Location
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {participant.ageYears ? `${participant.ageYears} yrs` : "—"} &bull; {participant.kebele}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              HEW / Midwife
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>admin</span>
          </div>
        </div>
      </div>

      {/* 2. CLINICAL VITALS RIBBON */}
      <div className="card vitals-ribbon" style={{ padding: "1.25rem 1.75rem", marginBottom: "1.5rem" }}>
        <div className="ribbon-grid">
          <div className="ribbon-col">
            <span className="ribbon-label">Gestational Age</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {ga ? ga.formatted : pnc ? pnc.formatted : "Not Pregnant"}
            </div>
            <div className="ribbon-sub">
              {ga
                ? `${ga.trimester === 1 ? "1st" : ga.trimester === 2 ? "2nd" : "3rd"} Trimester • G1 P0`
                : delivered
                ? "Postpartum Care"
                : "Episode Inactive"}
            </div>
            {ga && (
              <div className="ribbon-bar">
                <div className="ribbon-fill" style={{ width: `${ga.progressPct}%` }} />
              </div>
            )}
          </div>

          <div className="ribbon-col">
            <span className="ribbon-label">Due Date (EDD)</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {pregnancy?.eddShort || "—"}
            </div>
            <div className="ribbon-sub">
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{pregnancy?.eddEthAm || "—"}</span>
              {pregnancy?.eddEthEn && (
                <span style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }}>({pregnancy.eddEthEn})</span>
              )}
            </div>
            {ga?.daysUntilEdd !== null && ga?.daysUntilEdd !== undefined && ga.daysUntilEdd > 0 && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.375rem" }}>
                <strong>{ga.daysUntilEdd}</strong> days to delivery
              </div>
            )}
          </div>

          <div className="ribbon-col">
            <span className="ribbon-label">Care Continuum (WHO 2016)</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {totalAttended}{" "}
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
                / 12 Completed
              </span>
            </div>
            <div className="ribbon-sub tabular-nums">
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ancAttended}/8 ANC</span>
              <span style={{ color: "var(--text-muted)", margin: "0 0.35rem" }}>&bull;</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{pncAttended}/4 PNC</span>
            </div>
            <div style={{ height: "4px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "9999px", overflow: "hidden", display: "flex", marginTop: "0.5rem" }}>
              <div style={{ width: `${Math.round((ancAttended / 8) * 66.7)}%`, background: "#10b981", height: "100%" }} />
              <div style={{ width: "1px", background: "var(--border-color)", height: "100%" }} />
              <div style={{ width: `${Math.round((pncAttended / 4) * 33.3)}%`, background: "#06b6d4", height: "100%" }} />
            </div>
          </div>

          <div className="ribbon-col" style={{ borderRight: "none" }}>
            <span className="ribbon-label">Contact &amp; Telephony</span>
            <div className="ribbon-value tabular-nums" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", color: "var(--text-primary)" }}>
              {participant.phoneNumber ? (
                <>
                  <span>{phoneRevealed ? participant.phoneNumber : maskPhone(participant.phoneNumber)}</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ minHeight: "24px", padding: "0 0.5rem", fontSize: "0.6875rem" }}
                    onClick={() => setPhoneRevealed((v) => !v)}
                  >
                    {phoneRevealed ? "Hide" : "Reveal"}
                  </button>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="ribbon-sub">
              {formatLanguage(participant.preferredLanguage)} &bull; Morning (8:00 - 10:00)
            </div>
            <div style={{ fontSize: "0.75rem", color: participant.consentActive ? "#10b981" : "var(--status-urgent-text)", fontWeight: 600, marginTop: "0.375rem" }}>
              {participant.consentActive ? "✓ SMS Notifications Active" : "SMS Opted Out"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN BALANCED WORKSPACE */}
      <div className="workspace-grid">
        {/* LEFT: Primary Interactive Clinical Tabs */}
        <div className="workspace-main">
          <div className="tabs-header">
            <button
              type="button"
              className={`tab-pill ${activeTab === "timeline" ? "active" : ""}`}
              onClick={() => setActiveTab("timeline")}
            >
              <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span>Clinical Encounters &amp; Timeline ({appointments.length})</span>
            </button>
            <button
              type="button"
              className={`tab-pill ${activeTab === "messages" ? "active" : ""}`}
              onClick={() => setActiveTab("messages")}
            >
              <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>SMS Dispatches ({outboxMessages.length})</span>
            </button>
          </div>

          {activeTab === "timeline" ? (
            <div className="card" style={{ padding: "1.5rem" }}>
              {/* Longitudinal Care Continuum Panel */}
              <div className="care-continuum-panel">
                <div className="continuum-header">
                  <div>
                    <div className="continuum-title">
                      <svg className="icon-svg sm" style={{ color: "var(--text-secondary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <span>Longitudinal Care Continuum</span>
                    </div>
                    <div className="continuum-sub">
                      WHO integrated continuum: 8 antenatal contacts, institutional delivery, and 4 postnatal checks.
                    </div>
                  </div>
                  <div className="continuum-pills">
                    <span className="mrn-badge tabular-nums">{totalAttended} / 12 Completed</span>
                    <span className={`badge ${delivered ? "badge-success" : "badge-info"}`}>
                      {delivered ? "Postpartum Phase" : "Antepartum Phase"}
                    </span>
                  </div>
                </div>

                <div className="stepper-phases-header">
                  <div className="stepper-phase-group phase-anc">
                    <span className="stepper-phase-title">Antenatal Contacts</span>
                    <span className="stepper-phase-bracket" />
                  </div>
                  <div className="stepper-phase-group phase-delivery">
                    <span className="stepper-phase-title">Delivery</span>
                    <span className="stepper-phase-bracket" />
                  </div>
                  <div className="stepper-phase-group phase-pnc">
                    <span className="stepper-phase-title">Postnatal</span>
                    <span className="stepper-phase-bracket" />
                  </div>
                </div>

                <div className="continuum-stepper-track">
                  {ANC_SCHEDULE.map((node, i) => {
                    const matchedApt = fullAncTimeline[i];
                    const attended = Boolean(matchedApt && matchedApt.status === "attended");
                    const isNext = !delivered && nextVisit && matchedApt?.id === nextVisit.id;
                    const isMissedNode = Boolean(
                      !attended &&
                        matchedApt &&
                        (matchedApt.status === "missed" ||
                          (isNext && isNextVisitOverdue))
                    );
                    return (
                      <div key={node.num} className="c-step-item">
                        {isNext && (
                          <span
                            className="c-step-next-badge"
                            style={isMissedNode ? { background: "#ef4444", color: "#ffffff" } : undefined}
                          >
                            {isMissedNode ? "MISSED" : "NEXT"}
                          </span>
                        )}
                        <div
                          className={`c-step-node ${attended ? "is-attended" : isNext ? "is-next" : "is-upcoming"}`}
                          style={isMissedNode ? { borderColor: "#ef4444", color: "#ef4444" } : undefined}
                        >
                          {attended ? "✓" : isMissedNode ? "!" : node.num}
                        </div>
                        <span className="c-step-label tabular-nums">{node.week}w</span>
                        {matchedApt && (
                          <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>
                            {new Date(matchedApt.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <div className="c-step-item is-milestone">
                    <div className={`c-step-node is-edd-milestone ${delivered ? "is-delivered" : ""}`}>
                      {delivered ? "✓" : "EDD"}
                    </div>
                    <span className="c-step-label">{delivered ? "Birth" : "EDD"}</span>
                    {pregnancy?.eddShort && (
                      <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>
                        {pregnancy.eddShort.replace(/,\s*\d{4}$/, "")}
                      </span>
                    )}
                  </div>

                  {PNC_SCHEDULE.map((node, i) => {
                    const matchedPnc = pncVisits[i];
                    const attended = Boolean(matchedPnc && matchedPnc.status === "attended");
                    return (
                      <div key={node.num} className="c-step-item">
                        <div className={`c-step-node ${attended ? "is-attended" : "is-upcoming"}`}>
                          {attended ? "✓" : node.num}
                        </div>
                        <span className="c-step-label tabular-nums">{node.label}</span>
                      </div>
                    );
                  })}
                </div>

                {!delivered && ga ? (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    &bull; <strong>Active Gestation:</strong>{" "}
                    {ga.trimester === 1 ? "1st" : ga.trimester === 2 ? "2nd" : "3rd"} Trimester ({ga.formatted})
                    {ga.daysUntilEdd !== null && ga.daysUntilEdd > 0 ? `, ${ga.daysUntilEdd} days to delivery.` : "."}
                  </div>
                ) : delivered && pnc ? (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    &bull; <strong>Postpartum Care:</strong> {pnc.formatted}
                    {pregnancy?.deliveredAtShort ? ` (delivered ${pregnancy.deliveredAtShort})` : ""}.
                  </div>
                ) : null}
              </div>

              {/* Chronological Care Encounters */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "0.625rem", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Chronological Care Encounters
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>
                    Integrated flow from antenatal visits through institutional birth and postpartum recovery.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    setVisitModal({
                      open: true,
                      appointmentId: null,
                      kind: delivered ? "pnc" : "anc",
                      visitDate: new Date().toISOString().slice(0, 10),
                      notes: "",
                    })
                  }
                >
                  + Record Encounter
                </button>
              </div>

              <div className="timeline">
                {visibleAncVisits.map((visit) => {
                  const isNext = nextVisit?.id === visit.id;
                  const slotIdx = visit.slotIdx;
                  const ancNum = slotIdx + 1;
                  const targetWk = ANC_SCHEDULE[slotIdx]?.week;
                  return (
                    <div
                      key={visit.id}
                      className={`timeline-item ${visit.status !== "attended" ? "is-planned-encounter" : ""} ${isNext ? "is-dominant-next" : ""}`}
                    >
                      <div className={`timeline-marker ${visit.status === "attended" ? "completed" : visit.status === "missed" ? "missed" : "scheduled"}`}>
                        {visit.status === "attended" ? "✓" : visit.status === "missed" ? "!" : "•"}
                      </div>
                      <div
                        className="timeline-box"
                        style={isNext ? { borderLeft: "3px solid #0284c7", background: "var(--bg-surface)" } : undefined}
                      >
                        <div className="timeline-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span className="badge badge-info" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>ANC</span>
                            <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                              ANC Contact {ancNum} {targetWk ? `(${targetWk} weeks)` : ""}
                            </strong>
                            <span className={`badge ${visit.status === "attended" ? "badge-success" : visit.status === "missed" ? "badge-urgent" : "badge-neutral"}`} style={{ fontSize: "0.75rem" }}>
                              {visit.status === "attended" ? "Attended" : visit.status === "missed" ? "Missed" : "Planned"}
                            </span>
                            {isNext && (
                              <span className="badge badge-info" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>NEXT UP</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                            <span className="timeline-date">
                              {new Date(visit.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} &bull; 9:00 AM
                            </span>
                            {visit.status !== "attended" && (
                              <button
                                type="button"
                                className={`btn ${isNext ? "btn-primary" : "btn-outline"}`}
                                style={{ minHeight: "36px", padding: "0 14px", fontWeight: 600, fontSize: "0.8125rem" }}
                                onClick={() =>
                                  setVisitModal({
                                    open: true,
                                    appointmentId: visit.id > 0 ? visit.id : null,
                                    kind: "anc",
                                    visitDate: new Date(visit.scheduledFor).toISOString().slice(0, 10),
                                    notes: "",
                                  })
                                }
                              >
                                ✓ {isNext ? "Record Visit" : "Record"}
                              </button>
                            )}
                          </div>
                        </div>
                        {visit.notes && (
                          <div className="timeline-body">
                            <div style={{ marginTop: "0.4rem", fontStyle: "italic", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                              &ldquo;{visit.notes}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(hiddenPlannedCount > 0 || showAllPlanned) && fullAncTimeline.length > 3 && (
                  <div style={{ textAlign: "center", margin: "0.75rem 0 1rem" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ width: "100%", minHeight: "38px" }}
                      onClick={() => setShowAllPlanned((v) => !v)}
                    >
                      {showAllPlanned
                        ? "Hide remaining planned contacts \u2303"
                        : `Show ${hiddenPlannedCount} more planned contacts \u2304`}
                    </button>
                  </div>
                )}

                {/* EDD / Delivery Milestone */}
                <div className="timeline-item milestone-item">
                  {delivered ? (
                    <>
                      <div className="timeline-marker completed" style={{ background: "#10b981", color: "#ffffff" }}>✓</div>
                      <div className="timeline-box" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.35)" }}>
                        <div className="timeline-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span className="badge badge-success">DELIVERY</span>
                            <strong style={{ color: "var(--text-primary)" }}>
                              {pregnancy?.outcome === "live_birth" ? "Live Birth" : pregnancy?.outcome} &bull; {pregnancy?.deliveryPlace || participant.facilityName}
                            </strong>
                          </div>
                          <span className="timeline-date" style={{ color: "#10b981", fontWeight: 700 }}>
                            {pregnancy?.deliveredAtShort}
                          </span>
                        </div>
                        {pregnancy?.babies && pregnancy.babies.length > 0 && (
                          <div className="timeline-body" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                            {pregnancy.babies.map((b) => (
                              <span key={b.id} className="badge badge-success">
                                {b.name || "Newborn"} ({b.status})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="timeline-marker scheduled" style={{ border: "2px dashed #f59e0b", color: "#f59e0b" }}>⚑</div>
                      <div className="timeline-box" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border-color)" }}>
                        <div className="timeline-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span className="badge badge-warning">MILESTONE</span>
                            <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                              Expected Institutional Delivery (EDD)
                            </strong>
                            {ga?.daysUntilEdd !== null && ga?.daysUntilEdd !== undefined && (
                              <span className="badge badge-neutral">{ga.daysUntilEdd} days away</span>
                            )}
                          </div>
                          <span className="timeline-date">{pregnancy?.eddShort || "—"}</span>
                        </div>
                        <div className="timeline-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.25rem" }}>
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", maxWidth: "460px" }}>
                            Target EDD: <strong style={{ color: "var(--text-secondary)" }}>{pregnancy?.eddLong || "—"}</strong>. Recording delivery automatically transitions mother to postpartum care and triggers PNC scheduling.
                          </div>
                          <button type="button" className="btn btn-outline" style={{ minHeight: "40px" }} onClick={() => setShowBirthModal(true)}>
                            + Record Birth Outcome
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* PNC Pathway */}
                {!delivered ? (
                  <div className="timeline-item">
                    <div className="timeline-marker scheduled" style={{ fontSize: "0.625rem" }}>PNC</div>
                    <div className="timeline-box" style={{ opacity: 0.75 }}>
                      <div className="timeline-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span className="badge badge-neutral">PNC</span>
                          <strong style={{ color: "var(--text-primary)" }}>Postnatal Care Continuum Pathway (4 Contacts)</strong>
                        </div>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600 }}>ACTIVATES POST-BIRTH</span>
                      </div>
                      <div className="timeline-body" style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        WHO 4-visit protocol: PNC 1 (within 24h) &bull; PNC 2 (Day 3) &bull; PNC 3 (Day 7–14) &bull; PNC 4 (Week 6).
                      </div>
                    </div>
                  </div>
                ) : (
                  pncVisits.map((visit, idx) => (
                    <div key={visit.id} className="timeline-item">
                      <div className={`timeline-marker ${visit.status === "attended" ? "completed" : "scheduled"}`}>
                        {visit.status === "attended" ? "✓" : "•"}
                      </div>
                      <div className="timeline-box">
                        <div className="timeline-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span className="badge badge-info">PNC</span>
                            <strong style={{ color: "var(--text-primary)" }}>PNC Contact {idx + 1}</strong>
                            <span className={`badge ${visit.status === "attended" ? "badge-success" : "badge-neutral"}`}>
                              {visit.status}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span className="timeline-date">
                              {new Date(visit.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            {visit.status !== "attended" && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  setVisitModal({
                                    open: true,
                                    appointmentId: visit.id,
                                    kind: "pnc",
                                    visitDate: new Date().toISOString().slice(0, 10),
                                    notes: "",
                                  })
                                }
                              >
                                ✓ Record
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: SMS Dispatches */
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Scheduled SMS Dispatches ({outboxMessages.length})
                  </h3>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowSmsModal(true)}>
                  + Send Immediate SMS
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Scheduled</th>
                      <th>Message body</th>
                      <th>Segments</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outboxMessages.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                          No SMS dispatches queued for this participant.
                        </td>
                      </tr>
                    ) : (
                      outboxMessages.map((msg) => (
                        <tr key={msg.id}>
                          <td className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {new Date(msg.scheduledAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ fontSize: "0.875rem", color: "var(--text-primary)", maxWidth: "460px" }}>
                            {msg.messageContent}
                          </td>
                          <td>
                            <span className="badge badge-neutral tabular-nums">{msg.segments} seg</span>
                          </td>
                          <td>
                            {["sent", "delivered", "submitted"].includes(msg.status) && (
                              <span className="badge badge-success">Delivered</span>
                            )}
                            {msg.status === "pending" && <span className="badge badge-info">Queued</span>}
                            {msg.status === "failed" && <span className="badge badge-urgent">Failed</span>}
                            {msg.status === "cancelled" && <span className="badge badge-neutral">Cancelled</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Patient Dossier Sidebar */}
        <div className="workspace-sidebar">
          <details className="sidebar-accordion" open>
            <summary>
              <span className="sidebar-summary-title">
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Telephony &amp; Preferences</span>
              </span>
              <svg className="sidebar-summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </summary>
            <div className="sidebar-accordion-body">
              <div className="dossier-row">
                <span className="dossier-label">Phone Ownership</span>
                <span className="dossier-value">{formatOwner(participant.phoneOwner)}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-label">Preferred Window</span>
                <span className="dossier-value">Morning (8:00 - 10:00)</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-label">Language</span>
                <span className="dossier-value">{formatLanguage(participant.preferredLanguage)}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-label">Consent Status</span>
                <span className="dossier-value">
                  <span className={`badge ${participant.consentActive ? "badge-success" : "badge-urgent"}`} style={{ fontSize: "0.6875rem" }}>
                    {participant.consentActive ? "Active" : "Opted Out"}
                  </span>
                </span>
              </div>
              <div className="dossier-row" style={{ borderBottom: "none" }}>
                <span className="dossier-label">Consent Date</span>
                <span className="dossier-value">{participant.enrolledAt} (Verbal Consent)</span>
              </div>
            </div>
          </details>

          <details className="sidebar-accordion" open>
            <summary>
              <span className="sidebar-summary-title">
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Clinical Dating (Dual-Calendar)</span>
              </span>
              <svg className="sidebar-summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </summary>
            <div className="sidebar-accordion-body">
              {pregnancy ? (
                <>
                  <div className="dossier-row">
                    <span className="dossier-label">LMP (Gregorian)</span>
                    <span className="dossier-value">{pregnancy.lmpShort}</span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">LMP (Ethiopian)</span>
                    <span className="dossier-value" style={{ color: "var(--primary)", fontWeight: 600 }}>
                      {pregnancy.lmpEthAm}
                    </span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">EDD (Gregorian)</span>
                    <span className="dossier-value">{pregnancy.eddShort}</span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">EDD (Ethiopian)</span>
                    <span className="dossier-value" style={{ color: "var(--primary)", fontWeight: 600 }}>
                      {pregnancy.eddEthAm}
                    </span>
                  </div>
                  <div className="dossier-row">
                    <span className="dossier-label">Dating Method</span>
                    <span className="dossier-value">{formatDatingMethod(pregnancy.datingMethod)}</span>
                  </div>
                  <div className="dossier-row" style={{ borderBottom: "none" }}>
                    <span className="dossier-label">Enrolment Date</span>
                    <span className="dossier-value">{participant.enrolledAt}</span>
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>No active pregnancy episode.</div>
              )}
            </div>
          </details>

          <details className="sidebar-accordion">
            <summary>
              <span className="sidebar-summary-title">
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Demographic Profile</span>
              </span>
              <svg className="sidebar-summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </summary>
            <div className="sidebar-accordion-body">
              <div className="dossier-row">
                <span className="dossier-label">Age</span>
                <span className="dossier-value">{participant.ageYears ? `${participant.ageYears} years` : "—"}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-label">Residence</span>
                <span className="dossier-value">{participant.kebele}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-label">Assigned Facility</span>
                <span className="dossier-value">{participant.facilityName}</span>
              </div>
              <div className="dossier-row" style={{ borderBottom: "none" }}>
                <span className="dossier-label">Registered</span>
                <span className="dossier-value">{participant.enrolledAt}</span>
              </div>
            </div>
          </details>

          <details className="sidebar-accordion">
            <summary>
              <span className="sidebar-summary-title">
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Participant Feedback</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.6875rem", padding: "2px 8px", minHeight: "24px" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowFeedbackModal(true);
                  }}
                >
                  + Log
                </button>
                <svg className="sidebar-summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </summary>
            <div className="sidebar-accordion-body">
              {feedbackLog.length === 0 ? (
                <div style={{ padding: "0.5rem 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No participant feedback logged yet.
                </div>
              ) : (
                feedbackLog.map((f, idx) => (
                  <div key={idx} className="dossier-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                    <span style={{ fontSize: "0.78125rem", color: "var(--text-primary)" }}>&ldquo;{f.note}&rdquo;</span>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{f.date} &bull; admin</span>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </div>

      {/* MODAL: Record Visit */}
      {visitModal.open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setVisitModal((v) => ({ ...v, open: false }))}>
          <div className="card modal-content" style={{ maxWidth: "460px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Record Clinical Encounter
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction(
                  {
                    action: "record_visit",
                    appointmentId: visitModal.appointmentId,
                    visitKind: visitModal.kind,
                    visitDate: visitModal.visitDate,
                    notes: visitModal.notes,
                  },
                  () => setVisitModal((v) => ({ ...v, open: false }))
                );
              }}
            >
              {!visitModal.appointmentId && (
                <div className="form-group">
                  <label className="form-label">Encounter Type</label>
                  <select
                    className="form-select"
                    value={visitModal.kind}
                    onChange={(e) => setVisitModal((v) => ({ ...v, kind: e.target.value }))}
                  >
                    <option value="anc">Antenatal Care (ANC)</option>
                    <option value="pnc">Postnatal Care (PNC)</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={visitModal.visitDate}
                  onChange={(e) => setVisitModal((v) => ({ ...v, visitDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={visitModal.notes}
                  onChange={(e) => setVisitModal((v) => ({ ...v, notes: e.target.value }))}
                  placeholder="BP, fetal heart rate, iron/folate dispensed..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setVisitModal((v) => ({ ...v, open: false }))}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Confirm Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Birth */}
      {showBirthModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowBirthModal(false)}>
          <div className="card modal-content" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Record Birth &amp; Delivery
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction(
                  { action: "record_delivery", deliveryDate, deliveryPlace, babyName },
                  () => setShowBirthModal(false)
                );
              }}
            >
              <div className="form-group">
                <label className="form-label">Delivery Date &amp; Time</label>
                <input type="datetime-local" className="form-input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Place</label>
                <input type="text" className="form-input" value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Baby Name (Optional)</label>
                <input type="text" className="form-input" value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="e.g. Dawit" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBirthModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Phone */}
      {showPhoneModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowPhoneModal(false)}>
          <div className="card modal-content" style={{ maxWidth: "440px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Update Phone Number
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction(
                  { action: "update_phone", phoneNumber: phoneInput, ownerType: ownerInput },
                  () => setShowPhoneModal(false)
                );
              }}
            >
              <div className="form-group">
                <label className="form-label">Phone Number (E.164)</label>
                <input type="tel" className="form-input" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+251911223344" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Ownership</label>
                <select className="form-select" value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)}>
                  <option value="self">Own phone</option>
                  <option value="husband">Husband&apos;s phone</option>
                  <option value="family">Family phone</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPhoneModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Save Number</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Send Immediate SMS */}
      {showSmsModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowSmsModal(false)}>
          <div className="card modal-content" style={{ maxWidth: "460px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Send Immediate SMS
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction({ action: "send_sms", customMessage: smsText }, () => {
                  setSmsText("");
                  setShowSmsModal(false);
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">Message Content</label>
                <textarea className="form-textarea" rows={4} value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="Type reminder or clinical follow-up..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowSmsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Send SMS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sensitive Loss */}
      {showLossModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowLossModal(false)}>
          <div className="card modal-content" style={{ maxWidth: "440px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--status-urgent-text)" }}>
              Record Sensitive Loss
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction({ action: "record_loss", outcome: lossOutcome }, () => setShowLossModal(false));
              }}
            >
              <div className="form-group">
                <label className="form-label">Outcome Type</label>
                <select className="form-select" value={lossOutcome} onChange={(e) => setLossOutcome(e.target.value)}>
                  <option value="miscarriage">Miscarriage</option>
                  <option value="stillbirth">Stillbirth</option>
                  <option value="neonatal_loss">Neonatal Loss</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowLossModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Confirm &amp; Halt SMS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Participant Feedback */}
      {showFeedbackModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="card modal-content" style={{ maxWidth: "440px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Log Participant Feedback
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!feedbackNote.trim()) return;
                setFeedbackLog((prev) => [
                  { note: feedbackNote.trim(), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                  ...prev,
                ]);
                setFeedbackNote("");
                setShowFeedbackModal(false);
              }}
            >
              <div className="form-group">
                <label className="form-label">Feedback / Comment</label>
                <textarea className="form-textarea" rows={3} value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
