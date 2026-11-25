import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  calculateGestationalAge,
  calculatePostnatalAge,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopianCalendar";
import { ParticipantActions } from "./ParticipantActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

export default async function ParticipantShowPage({ params }: Props) {
  const { id } = await params;

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    notFound();
  }

  const participant = await prisma.participant.findUnique({
    where: { id: numId },
    include: {
      facility: true,
      phones: true,
      pregnancies: {
        orderBy: { id: "desc" },
        include: { babies: true },
      },
      appointments: {
        orderBy: { scheduledFor: "desc" },
      },
      outboxMessages: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
      },
    },
  });

  if (!participant) {
    notFound();
  }

  const pregnancy = participant.pregnancies[0];
  const primaryPhone =
    participant.phones.find((p) => p.isPrimary) || participant.phones[0];

  let gaInfo = null;
  let eddEth = null;
  if (pregnancy?.eddDate) {
    gaInfo = calculateGestationalAge(pregnancy.eddDate);
    const eth = gregorianToEthiopian(pregnancy.eddDate);
    eddEth = {
      formatted_am: formatEthiopianDate(eth, "am"),
      formatted_en: formatEthiopianDate(eth, "en"),
    };
  }

  const pncInfo =
    participant.status === "postnatal" && pregnancy?.deliveredAt
      ? calculatePostnatalAge(pregnancy.deliveredAt)
      : null;

  const ancNodes = [
    { label: "16w", week: 16 },
    { label: "20w", week: 20 },
    { label: "26w", week: 26 },
    { label: "30w", week: 30 },
    { label: "34w", week: 34 },
    { label: "36w", week: 36 },
    { label: "38w", week: 38 },
    { label: "42w", week: 42 },
  ];
  const pncNodes = [
    { label: "24h", day: 1 },
    { label: "3d", day: 3 },
    { label: "7-14d", day: 10 },
    { label: "6w", day: 42 },
  ];

  const currentGaWeeks = gaInfo ? gaInfo.weeks : 0;
  const delivered = Boolean(pregnancy?.deliveredAt) || participant.status === "postnatal" || participant.status === "completed";
  const nextAppointment = participant.appointments.find((a) => a.status === "scheduled");

  return (
    <div className="patient-profile-wrapper">
      {/* Back to Directory */}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          href="/participants"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            minHeight: "44px",
          }}
        >
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Directory</span>
        </Link>
      </div>

      {/* Unified Patient Hero Card (Exact woman_detail.html) */}
      <div className="patient-hero-card" id="patient-hero">
        <div className="hero-name-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div className="hero-name-group" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h1 className="patient-hero-title" style={{ margin: 0, fontSize: "1.75rem" }}>
              {participant.fullName}
            </h1>
            <span className="mrn-badge tabular-nums">{participant.publicCode}</span>
            {pregnancy?.riskStatus === "high" && (
              <span className="badge badge-urgent">High Risk</span>
            )}
            {pregnancy?.riskStatus === "elevated" && (
              <span className="badge badge-warning">Elevated Risk</span>
            )}
            {participant.status === "postnatal" && (
              <span className="badge badge-success">Postpartum</span>
            )}
            {participant.status === "completed" && (
              <span className="badge badge-neutral">Graduated</span>
            )}
            {participant.status === "opted_out" && (
              <span className="badge badge-warning">Opted out</span>
            )}
            {participant.status === "loss" && (
              <span className="badge badge-urgent">Sensitive loss</span>
            )}
          </div>

          <div className="hero-action-group" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <ParticipantActions
              participantId={String(participant.id)}
              status={participant.status}
              facilityName={participant.facility.name}
            />
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
          {gaInfo && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Gestational age
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {gaInfo.formatted}
              </strong>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                (Trimester {gaInfo.trimester})
              </span>
            </div>
          )}
          {pncInfo && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Postpartum age
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {pncInfo.formatted}
              </strong>
            </div>
          )}
          {pregnancy?.eddDate && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Due date (EDD)
              </span>
              <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {pregnancy.eddDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
              {eddEth?.formatted_am && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  {" "}
                  &bull; {eddEth.formatted_am}
                </span>
              )}
            </div>
          )}
          {nextAppointment && (
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Next appointment
              </span>
              <strong style={{ color: "var(--text-primary)" }}>
                {nextAppointment.kind.toUpperCase()}
              </strong>{" "}
              <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                &bull;{" "}
                {nextAppointment.scheduledFor.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              Facility &amp; kebele
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {participant.facility.name} &bull; {formatKebele(participant.kebele)}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              Phone &amp; language
            </span>
            <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {primaryPhone ? primaryPhone.numberE164 : "No phone"} &bull;{" "}
              {participant.preferredLanguage === "am"
                ? "Amharic"
                : participant.preferredLanguage === "gurage"
                ? "Gurage"
                : "English"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CLINICAL VITALS RIBBON (Exact Django woman_detail.html) */}
      <div className="card vitals-ribbon" style={{ padding: "1.25rem 1.75rem", marginBottom: "1.5rem" }}>
        <div className="ribbon-grid">
          <div className="ribbon-col">
            <span className="ribbon-label">Gestational age</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {gaInfo ? gaInfo.formatted : pncInfo ? pncInfo.formatted : "Inactive"}
            </div>
            <div className="ribbon-sub">
              {gaInfo ? `Trimester ${gaInfo.trimester}` : participant.status === "postnatal" ? "Postpartum care" : "Completed"}
            </div>
            {gaInfo && (
              <div className="ribbon-bar">
                <div className="ribbon-fill" style={{ width: `${Math.min(100, Math.round((gaInfo.weeks / 40) * 100))}%` }} />
              </div>
            )}
          </div>

          <div className="ribbon-col">
            <span className="ribbon-label">Due date (EDD)</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {pregnancy?.eddDate
                ? pregnancy.eddDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
            <div className="ribbon-sub">
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{eddEth?.formatted_am || "—"}</span>
              {eddEth?.formatted_en && (
                <span style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }}>({eddEth.formatted_en})</span>
              )}
            </div>
          </div>

          <div className="ribbon-col">
            <span className="ribbon-label">Care continuum (WHO)</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {participant.appointments.filter((a) => a.status === "attended").length}{" "}
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
                / {Math.max(12, participant.appointments.length)} completed
              </span>
            </div>
            <div className="ribbon-sub tabular-nums">
              <span>
                {participant.appointments.filter((a) => a.kind === "anc" && a.status === "attended").length}/8 ANC
              </span>
              <span style={{ color: "var(--text-muted)", margin: "0 0.35rem" }}>&bull;</span>
              <span>
                {participant.appointments.filter((a) => a.kind === "pnc" && a.status === "attended").length}/4 PNC
              </span>
            </div>
          </div>

          <div className="ribbon-col" style={{ borderRight: "none" }}>
            <span className="ribbon-label">Contact &amp; telephony</span>
            <div className="ribbon-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {primaryPhone ? primaryPhone.numberE164 : "—"}
            </div>
            <div className="ribbon-sub">
              {participant.preferredLanguage === "am"
                ? "Amharic (አማርኛ)"
                : participant.preferredLanguage === "gurage"
                ? "Gurage"
                : "English"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--status-success-text)", fontWeight: 600, marginTop: "0.375rem" }}>
              {participant.status === "opted_out" ? "SMS opted out" : "✓ SMS notifications active"}
            </div>
          </div>
        </div>
      </div>

      {/* Longitudinal 13-Stage Care Continuum (8 ANC + EDD + 4 PNC) */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="care-continuum-panel" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
          <div className="continuum-header">
            <div>
              <div className="continuum-title">
                <svg className="icon-svg sm" style={{ color: "var(--text-secondary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span>Longitudinal care continuum</span>
              </div>
              <div className="continuum-sub">
                WHO integrated continuum: 8 antenatal contacts, institutional delivery, and 4 postnatal checks.
              </div>
            </div>
            <div className="continuum-pills">
              <span className={`badge ${delivered ? "badge-success" : "badge-info"}`}>
                {delivered ? "Postpartum phase" : "Antepartum phase"}
              </span>
            </div>
          </div>

          {/* Phase Headers */}
          <div className="stepper-phases-header">
            <div className="stepper-phase-group phase-anc">
              <span className="stepper-phase-title">Antenatal contacts</span>
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

          {/* 13-Stage Stepper Track */}
          <div className="continuum-stepper-track">
            {ancNodes.map((node, i) => {
              const attended = delivered || currentGaWeeks > node.week;
              const isCurrent = !delivered && currentGaWeeks >= node.week - 2 && currentGaWeeks <= node.week;
              return (
                <div key={node.label} className="c-step-item">
                  {isCurrent && <span className="c-step-next-badge">Current</span>}
                  <div
                    className={`c-step-node ${
                      attended ? "is-attended" : isCurrent ? "is-next" : "is-upcoming"
                    }`}
                  >
                    {attended ? "✓" : i + 1}
                  </div>
                  <span className="c-step-label tabular-nums">{node.label}</span>
                </div>
              );
            })}

            <div className="c-step-item is-milestone">
              <div className={`c-step-node is-edd-milestone ${delivered ? "is-delivered" : ""}`}>
                {delivered ? "✓" : "EDD"}
              </div>
              <span className="c-step-label">{delivered ? "Birth" : "EDD"}</span>
            </div>

            {pncNodes.map((node, i) => {
              const pncDays = pregnancy?.deliveredAt
                ? Math.floor((Date.now() - pregnancy.deliveredAt.getTime()) / (1000 * 3600 * 24))
                : -1;
              const attended = delivered && pncDays >= node.day;
              return (
                <div key={node.label} className="c-step-item">
                  <div className={`c-step-node ${attended ? "is-attended" : "is-upcoming"}`}>
                    {attended ? "✓" : i + 1}
                  </div>
                  <span className="c-step-label tabular-nums">{node.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Appointments & Checkups Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title tabular-nums">
            Checkups &amp; visits ({participant.appointments.length})
          </h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Visit type</th>
                <th>Scheduled date</th>
                <th>Status</th>
                <th>Recorded by</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {participant.appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No visits scheduled yet.
                  </td>
                </tr>
              ) : (
                participant.appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <span className="badge badge-info">{apt.kind.toUpperCase()}</span>
                    </td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>
                      {apt.scheduledFor.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {apt.status === "attended" && <span className="badge badge-success">Attended</span>}
                      {apt.status === "missed" && <span className="badge badge-urgent">Missed</span>}
                      {apt.status === "scheduled" && <span className="badge badge-neutral">Scheduled</span>}
                      {apt.status === "rescheduled" && <span className="badge badge-warning">Rescheduled</span>}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {apt.recordedBy || "System"}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {apt.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outbox SMS History Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title tabular-nums">
            Scheduled SMS dispatches ({participant.outboxMessages.length})
          </h2>
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
              {participant.outboxMessages.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No SMS dispatches queued for this participant.
                  </td>
                </tr>
              ) : (
                participant.outboxMessages.map((msg) => (
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
    </div>
  );
}
