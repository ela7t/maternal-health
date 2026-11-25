import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateGestationalAge } from "@/lib/ethiopianCalendar";

export const dynamic = "force-dynamic";

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

function getRelativeDayLabel(targetDate: Date, now: Date): string {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / (1000 * 3600 * 24));
  if (diffDays === 0) return "is today";
  if (diffDays === 1) return "is tomorrow";
  return `is in ${diffDays} days`;
}

const ANC_WEEKS = [16, 20, 26, 30, 34, 36, 38, 42];

function getAgeYears(dob: Date | null | undefined, now: Date): number | null {
  if (!dob) return null;
  return Math.floor((now.getTime() - dob.getTime()) / (1000 * 3600 * 24 * 365.25));
}

function GestationalTracker({
  eddDate,
  calloutLabel,
}: {
  eddDate: Date | null | undefined;
  calloutLabel: string;
}) {
  if (!eddDate) return null;
  const gaInfo = calculateGestationalAge(eddDate);
  if (!gaInfo) return null;
  const gaWeeks = Math.min(42, Math.max(12, gaInfo.weeks));
  const pct = ((gaWeeks - 12) / 30) * 100;

  return (
    <div className="priority-center gestational-tracker-col">
      <div
        className="gestational-tracker"
        role="region"
        aria-label={`Gestational week tracker: Week ${gaInfo.weeks}`}
      >
        <div className="gt-desktop-track">
          <div className="gt-track-wrapper">
            <div className="gt-axis-labels">
              <span className="gt-axis-label">12w</span>
              <span className="gt-axis-label">20w</span>
              <span className="gt-axis-label">28w</span>
              <span className="gt-axis-label">36w</span>
              <span className="gt-axis-label">42w</span>
            </div>
            <div className="gt-bar-track">
              {[0, 13.3, 26.7, 46.7, 60, 73.3, 80, 86.7, 100].map((leftPct) => (
                <div key={leftPct} className="gt-tick" style={{ left: `${leftPct}%` }} />
              ))}
              <div className="gt-bar-fill" style={{ width: `clamp(4%, ${pct}%, 100%)` }} />
              {ANC_WEEKS.map((wk, idx) => {
                const tickPct = ((wk - 12) / 30) * 100;
                const isPast = wk <= gaWeeks;
                return (
                  <div
                    key={wk}
                    className={`gt-node-marker ${isPast ? "attended" : "upcoming"}`}
                    style={{ left: `${tickPct}%` }}
                    title={`ANC ${idx + 1}: ${wk}w`}
                  >
                    {isPast ? (
                      <svg
                        className="gt-node-icon"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="gt-node-idx">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
              <div className="gt-current-pin" style={{ left: `clamp(6%, ${pct}%, 94%)` }}>
                <span className="gt-pin-badge tabular-nums">Week {gaInfo.weeks}</span>
              </div>
            </div>
            <div
              className="gt-next-callout tabular-nums"
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px" }}
            >
              {calloutLabel}
            </div>
          </div>
        </div>

        <div className="gt-mobile-view">
          <div className="gt-mobile-progress-bar">
            <div className="gt-mobile-progress-fill" style={{ width: `clamp(5%, ${pct}%, 100%)` }} />
          </div>
          <div className="gt-mobile-text-line">
            <span className="gt-mobile-ga tabular-nums">
              <strong>Week {gaInfo.weeks}</strong> of 42
            </span>
            <span className="gt-mobile-divider">&bull;</span>
            <span className="gt-mobile-next tabular-nums">{calloutLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function TodayPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(startOfToday.getTime() + 7 * 24 * 3600 * 1000);

  const [
    missingOutcomes,
    missedAppointments,
    visitsThisWeek,
    failedSmsCount,
  ] = await Promise.all([
    prisma.pregnancy.findMany({
      where: {
        deliveredAt: null,
        outcome: "ongoing",
        eddDate: { lt: startOfToday },
        participant: { status: "active_pregnant" },
      },
      include: {
        participant: {
          include: {
            facility: true,
            phones: { where: { isPrimary: true } },
            outboxMessages: {
              where: { status: { in: ["sent", "delivered", "submitted"] } },
              orderBy: { sentAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { eddDate: "asc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { status: "missed" },
          { status: "scheduled", scheduledFor: { lt: startOfToday } },
        ],
      },
      include: {
        participant: {
          include: {
            facility: true,
            phones: { where: { isPrimary: true } },
            pregnancies: { orderBy: { id: "desc" }, take: 1 },
            outboxMessages: {
              where: { status: { in: ["sent", "delivered", "submitted"] } },
              orderBy: { sentAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: {
        status: "scheduled",
        scheduledFor: { gte: startOfToday, lte: nextWeek },
      },
      include: {
        participant: {
          include: {
            facility: true,
            phones: { where: { isPrimary: true } },
            pregnancies: { orderBy: { id: "desc" }, take: 1 },
            outboxMessages: {
              where: { status: { in: ["sent", "delivered", "submitted"] } },
              orderBy: { sentAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 25,
    }),
    prisma.outboxMessage.count({ where: { status: "failed" } }),
  ]);

  const missingCount = missingOutcomes.length;
  const missedCount = missedAppointments.length;
  const visitsDueCount = visitsThisWeek.length;
  const totalPriorityItems = missingCount + missedCount + visitsDueCount + failedSmsCount;

  const formattedToday = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="today-container">
      {/* Header matching Django screenshot */}
      <div className="today-header-row">
        <div>
          <h1 className="today-main-title">Today&apos;s priorities</h1>
          <p className="today-subtitle">
            {formattedToday} &bull; mothers assigned to you
          </p>
        </div>
        <div>
          <Link href="/participants/new" className="btn btn-primary btn-enroll-action">
            <svg className="icon-svg sm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Enroll pregnant mother</span>
          </Link>
        </div>
      </div>

      {/* 4 Actionable Triage Metric Cards */}
      <div className="today-metrics-grid" role="region" aria-label="Triage metric categories">
        <a
          href="#sec-missing-outcomes"
          className={`today-metric-card ${missingCount === 0 ? "is-zero" : "has-urgent"}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{missingCount}</div>
            <svg className="metric-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {missingCount > 0 && (
              <svg className="icon-svg xs alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>Birth outcomes</span>
          </div>
          <div className="metric-subtext">
            {missingCount > 0 ? "Past EDD, record birth" : "All birth outcomes logged"}
          </div>
        </a>

        <a
          href="#sec-missed-visits"
          className={`today-metric-card ${missedCount === 0 ? "is-zero" : "has-urgent"}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{missedCount}</div>
            <svg className="metric-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {missedCount > 0 && (
              <svg className="icon-svg xs alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>Missed visits</span>
          </div>
          <div className="metric-subtext">
            {missedCount > 0 ? "Call and reschedule / trace" : "All visits attended on time"}
          </div>
        </a>

        <a
          href="#sec-visits-due"
          className={`today-metric-card ${visitsDueCount === 0 ? "is-zero" : ""}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{visitsDueCount}</div>
            <svg className="metric-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {visitsDueCount > 0 && <span className="metric-dot amber" />}
            <span>Visits this week</span>
          </div>
          <div className="metric-subtext">
            {visitsDueCount > 0 ? "Planned clinical contacts" : "No upcoming visits this week"}
          </div>
        </a>

        <a
          href="#sec-phone-problems"
          className={`today-metric-card ${failedSmsCount === 0 ? "is-zero" : "has-urgent"}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{failedSmsCount}</div>
            <svg className="metric-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {failedSmsCount > 0 && (
              <svg className="icon-svg xs alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            <span>Phone problems</span>
          </div>
          <div className="metric-subtext">
            {failedSmsCount > 0 ? "SMS delivery failures" : "All telephone lines working"}
          </div>
        </a>
      </div>

      {/* Sub-bar matching screenshot */}
      <div className="today-subbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span>
            Showing <strong className="tabular-nums">{totalPriorityItems}</strong> priority{" "}
            {totalPriorityItems === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* SECTION 1: Birth outcomes */}
      <section id="sec-missing-outcomes" className="priority-section">
        {missingCount === 0 ? (
          <div className="zero-section-collapsed">
            <div className="zero-section-left">
              <svg className="icon-svg sm" width="16" height="16" style={{ color: "var(--status-success-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-section-title">Birth outcomes</span>
              <span style={{ color: "var(--text-muted)" }}>&bull; All birth outcomes logged</span>
            </div>
            <span className="zero-section-pill tabular-nums">0</span>
          </div>
        ) : (
          <div>
            <div className="section-header-row">
              <div className="section-title-wrap">
                <span>Birth outcomes</span>
                <span className="section-count-badge tabular-nums">{missingCount}</span>
              </div>
              <span className="section-right-notice">Past EDD without recorded delivery</span>
            </div>
            <div className="priority-cards-list">
              {missingOutcomes.map((preg) => {
                const daysPast = Math.max(1, Math.floor((now.getTime() - preg.eddDate.getTime()) / (1000 * 3600 * 24)));
                const dobAge = getAgeYears(preg.participant.dateOfBirth, now);
                const lastSms = preg.participant.outboxMessages[0];
                const eddLabel = preg.eddDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div key={preg.id} className="priority-row-card">
                    <div className="priority-left">
                      <div className="patient-meta-line">
                        <Link href={`/participants/${preg.participant.id}`} className="patient-name">
                          {preg.participant.fullName}
                        </Link>
                        {dobAge !== null && <span className="patient-age">{dobAge} years</span>}
                        <span className={`badge ${preg.riskStatus === "high" ? "badge-urgent" : "badge-success"}`}>
                          {preg.riskStatus === "high" ? "High risk" : "✓ Standard"}
                        </span>
                        <span className="mrn-badge tabular-nums">{preg.participant.publicCode}</span>
                      </div>

                      <div className="priority-alert-line alert-red">
                        <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Birth outcome overdue ({daysPast}d past EDD)</span>
                      </div>

                      <div className="priority-sub-line">
                        EDD {preg.eddDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} &bull; {formatKebele(preg.participant.kebele)}
                      </div>

                      {lastSms?.sentAt && (
                        <div className="priority-sms-line">
                          <span className="sms-icon-check">✓</span>
                          <span>
                            Reminder delivered {lastSms.sentAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>

                    <GestationalTracker eddDate={preg.eddDate} calloutLabel={`EDD: ${eddLabel}`} />

                    <div className="priority-right">
                      <Link href={`/participants/${preg.participant.id}`} className="btn btn-primary" style={{ minHeight: "44px" }}>
                        Record birth
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: Missed visits */}
      <section id="sec-missed-visits" className="priority-section">
        {missedCount === 0 ? (
          <div className="zero-section-collapsed">
            <div className="zero-section-left">
              <svg className="icon-svg sm" width="16" height="16" style={{ color: "var(--status-success-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-section-title">Missed visits</span>
              <span style={{ color: "var(--text-muted)" }}>&bull; All visits attended on time</span>
            </div>
            <span className="zero-section-pill tabular-nums">0</span>
          </div>
        ) : (
          <div>
            <div className="section-header-row">
              <div className="section-title-wrap">
                <span>Missed visits</span>
                <span className="section-count-badge tabular-nums">{missedCount}</span>
              </div>
              <span className="section-right-notice">Requires phone follow-up</span>
            </div>
            <div className="priority-cards-list">
              {missedAppointments.map((apt) => {
                const preg = apt.participant.pregnancies[0];
                const dobAge = getAgeYears(apt.participant.dateOfBirth, now);
                const lastSms = apt.participant.outboxMessages[0];
                const daysAgo = Math.max(1, Math.floor((startOfToday.getTime() - apt.scheduledFor.getTime()) / (1000 * 3600 * 24)));
                const dueShort = apt.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div key={apt.id} className="priority-row-card">
                    <div className="priority-left">
                      <div className="patient-meta-line">
                        <Link href={`/participants/${apt.participant.id}`} className="patient-name">
                          {apt.participant.fullName}
                        </Link>
                        {dobAge !== null && <span className="patient-age">{dobAge} years</span>}
                        <span className={`badge ${preg?.riskStatus === "high" ? "badge-urgent" : "badge-success"}`}>
                          {preg?.riskStatus === "high" ? "High risk" : "✓ Standard"}
                        </span>
                        <span className="mrn-badge tabular-nums">{apt.participant.publicCode}</span>
                      </div>

                      <div className="priority-alert-line alert-red">
                        <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{apt.kind === "anc" ? "Missed antenatal visit" : "Missed postnatal visit"}</span>
                      </div>

                      <div className="priority-sub-line">
                        Was due {apt.scheduledFor.toLocaleDateString("en-US", { month: "long", day: "numeric" })},{" "}
                        <strong>{daysAgo} {daysAgo === 1 ? "day" : "days"} ago</strong> &bull; {formatKebele(apt.participant.kebele)}
                      </div>

                      {lastSms?.sentAt && (
                        <div className="priority-sms-line">
                          <span className="sms-icon-check">✓</span>
                          <span>
                            Reminder delivered {lastSms.sentAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>

                    <GestationalTracker
                      eddDate={preg?.eddDate}
                      calloutLabel={`Due: ${apt.kind.toUpperCase()} (${dueShort})`}
                    />

                    <div className="priority-right">
                      <Link href="/appointments?filter=missed" className="btn btn-primary" style={{ minHeight: "44px" }}>
                        Review &amp; reschedule
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: Visits this week (Exact 3-column card matching Django screenshot) */}
      <section id="sec-visits-due" className="priority-section">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <span>Visits this week</span>
            <span className="section-count-badge tabular-nums">{visitsDueCount}</span>
          </div>
          <span className="section-right-notice">Scheduled contacts planned over the next 7 days</span>
        </div>

        {visitsDueCount === 0 ? (
          <div className="zero-section-collapsed">
            <div className="zero-section-left">
              <svg className="icon-svg sm" width="16" height="16" style={{ color: "var(--status-success-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-section-title">Visits this week</span>
              <span style={{ color: "var(--text-muted)" }}>&bull; No clinic visits scheduled over the next 7 days</span>
            </div>
            <span className="zero-section-pill tabular-nums">0</span>
          </div>
        ) : (
          <div className="priority-cards-list">
            {visitsThisWeek.map((apt) => {
              const preg = apt.participant.pregnancies[0];
              const lastSms = apt.participant.outboxMessages[0];
              const dobAge = getAgeYears(apt.participant.dateOfBirth, now);
              const dueShort = apt.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <div key={apt.id} className="priority-row-card">
                  {/* Left: Patient info */}
                  <div className="priority-left">
                    <div className="patient-meta-line">
                      <Link href={`/participants/${apt.participant.id}`} className="patient-name">
                        {apt.participant.fullName}
                      </Link>
                      {dobAge !== null && <span className="patient-age">{dobAge} years</span>}
                      <span className={`badge ${preg?.riskStatus === "high" ? "badge-urgent" : "badge-success"}`}>
                        {preg?.riskStatus === "high" ? "High risk" : "✓ Standard"}
                      </span>
                      <span className="mrn-badge tabular-nums">{apt.participant.publicCode}</span>
                    </div>

                    <div className="patient-action-line">
                      <svg className="icon-svg xs" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <strong>
                        {apt.kind === "anc" ? "Antenatal visit" : "Postnatal visit"}{" "}
                        {getRelativeDayLabel(apt.scheduledFor, now)}
                      </strong>
                    </div>

                    <div className="priority-sub-line">
                      <span className="tabular-nums">
                        {apt.scheduledFor.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at 9:00 AM
                      </span>
                      {" "}&bull;{" "}
                      <span>{formatKebele(apt.participant.kebele)}</span>
                    </div>

                    {lastSms?.sentAt && (
                      <div className="priority-sms-line">
                        <span className="sms-icon-check">✓</span>
                        <span>
                          Reminder delivered{" "}
                          {lastSms.sentAt.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center: Gestational Week 12-42 Tracker */}
                  <GestationalTracker
                    eddDate={preg?.eddDate}
                    calloutLabel={`Due: ${apt.kind.toUpperCase()} (${dueShort})`}
                  />

                  {/* Right: Record visit CTA */}
                  <div className="priority-right">
                    <Link
                      href={`/participants/${apt.participant.id}`}
                      className="btn btn-primary"
                      style={{ minHeight: "44px" }}
                    >
                      <svg className="icon-svg sm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Record visit</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: Phone problems */}
      <section id="sec-phone-problems" className="priority-section">
        {failedSmsCount === 0 ? (
          <div className="zero-section-collapsed">
            <div className="zero-section-left">
              <svg className="icon-svg sm" width="16" height="16" style={{ color: "var(--status-success-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-section-title">Phone problems</span>
              <span style={{ color: "var(--text-muted)" }}>&bull; All phone numbers reachable</span>
            </div>
            <span className="zero-section-pill tabular-nums">0</span>
          </div>
        ) : (
          <div className="section-header-row">
            <div className="section-title-wrap">
              <span>Phone problems</span>
              <span className="section-count-badge tabular-nums">{failedSmsCount}</span>
            </div>
            <Link href="/outbox?status=failed" className="btn btn-primary" style={{ minHeight: "44px" }}>
              Inspect {failedSmsCount} failed SMS
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
