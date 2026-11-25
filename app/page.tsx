import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateGestationalAge } from "@/lib/ethiopianCalendar";
import { SyncSchedulerButton } from "@/components/SyncSchedulerButton";

export const dynamic = "force-dynamic";

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

export default async function TodayPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(startOfToday.getTime() + 7 * 24 * 3600 * 1000);

  const [
    activePregnant,
    activePostnatal,
    missedAppointments,
    visitsThisWeek,
    failedSmsCount,
    recentMessages,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
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
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 25,
    }),
    prisma.outboxMessage.count({ where: { status: "failed" } }),
    prisma.outboxMessage.findMany({
      take: 8,
      orderBy: { scheduledAt: "desc" },
      include: {
        participant: { include: { facility: true } },
        phone: true,
      },
    }),
  ]);

  const missedCount = missedAppointments.length;
  const visitsDueCount = visitsThisWeek.length;
  const formattedToday = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const ancWeeks = [16, 20, 26, 30, 34, 36, 38, 40];

  return (
    <div className="today-container">
      {/* Header: Strong Visual Hierarchy (Exact Django today.html) */}
      <div className="today-header-row">
        <div>
          <h1 className="today-main-title">Today&apos;s priorities</h1>
          <p className="today-subtitle">
            {formattedToday} &bull;{" "}
            <span className="tabular-nums">{activePregnant + activePostnatal}</span> active mothers
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
          <SyncSchedulerButton />
          <Link href="/participants/new" className="btn btn-primary btn-enroll-action">
            <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Enroll pregnant mother</span>
          </Link>
        </div>
      </div>

      {/* 4 Actionable Triage Metric Cards */}
      <div className="today-metrics-grid" role="region" aria-label="Triage metric categories">
        {/* 1. Missed Visits */}
        <a
          href="#sec-missed-visits"
          className={`today-metric-card ${missedCount === 0 ? "is-zero" : "has-urgent"}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{missedCount}</div>
            <svg className="metric-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {missedCount > 0 && (
              <svg className="icon-svg xs alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        {/* 2. Visits This Week */}
        <a
          href="#sec-visits-due"
          className={`today-metric-card ${visitsDueCount === 0 ? "is-zero" : ""}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{visitsDueCount}</div>
            <svg className="metric-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {visitsDueCount > 0 && <span className="metric-dot amber" />}
            <span>Visits this week</span>
          </div>
          <div className="metric-subtext">
            {visitsDueCount > 0 ? "Scheduled next 7 days" : "No upcoming visits this week"}
          </div>
        </a>

        {/* 3. Active Care */}
        <Link
          href="/participants?status=active_pregnant"
          className={`today-metric-card ${activePregnant === 0 ? "is-zero" : ""}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{activePregnant}</div>
            <svg className="metric-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            <span>Active pregnancies</span>
          </div>
          <div className="metric-subtext tabular-nums">
            {activePostnatal} in postnatal care
          </div>
        </Link>

        {/* 4. Phone / Gateway Problems */}
        <Link
          href={failedSmsCount > 0 ? "/outbox?status=failed" : "/outbox"}
          className={`today-metric-card ${failedSmsCount === 0 ? "is-zero" : "has-urgent"}`}
        >
          <div className="metric-card-top">
            <div className="metric-big-num tabular-nums">{failedSmsCount}</div>
            <svg className="metric-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="metric-title-line">
            {failedSmsCount > 0 && (
              <svg className="icon-svg xs alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            <span>Phone problems</span>
          </div>
          <div className="metric-subtext">
            {failedSmsCount > 0 ? "SMS delivery failures" : "All lines reachable"}
          </div>
        </Link>
      </div>

      {/* SECTION 1: Missed Visits (Collapsed slim 44px strip when 0) */}
      <section id="sec-missed-visits" style={{ marginBottom: "1rem" }}>
        {missedCount === 0 ? (
          <div className="zero-state-strip">
            <div className="zero-state-left">
              <svg className="zero-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-title">Missed visits</span>
              <span className="zero-sub">All scheduled appointments attended on time</span>
            </div>
            <span className="zero-count-pill tabular-nums">0</span>
          </div>
        ) : (
          <div className="priority-section urgent">
            <div className="section-header-bar">
              <div className="section-title-group">
                <svg className="icon-svg sm" style={{ color: "var(--status-urgent-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h2>Missed visits requiring follow-up</h2>
              </div>
              <span className="badge badge-urgent tabular-nums">{missedCount}</span>
            </div>
            <div className="priority-list">
              {missedAppointments.map((apt) => {
                const ph = apt.participant.phones[0];
                return (
                  <div key={apt.id} className="priority-row">
                    <div className="row-main-info">
                      <div className="row-title-line">
                        <Link href={`/participants/${apt.participant.id}`} className="row-patient-name">
                          {apt.participant.fullName}
                        </Link>
                        <span className="mrn-badge">{apt.participant.publicCode}</span>
                        <span className="badge badge-urgent">
                          {apt.kind === "anc" ? "ANC Missed" : "PNC Missed"}
                        </span>
                      </div>
                      <div className="row-meta-line">
                        <span>{formatKebele(apt.participant.kebele)}</span>
                        <span>&bull;</span>
                        <span>{apt.participant.facility.name}</span>
                        <span>&bull;</span>
                        <span className="tabular-nums">
                          Due{" "}
                          {apt.scheduledFor.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {ph && (
                          <>
                            <span>&bull;</span>
                            <span className="tabular-nums">{ph.numberE164}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="row-actions">
                      <Link
                        href={`/appointments?filter=missed`}
                        className="btn btn-primary"
                        style={{ minHeight: "44px" }}
                      >
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

      {/* SECTION 2: Phone Problems (Collapsed slim 44px strip when 0) */}
      <section id="sec-phone-problems" style={{ marginBottom: "1.5rem" }}>
        {failedSmsCount === 0 ? (
          <div className="zero-state-strip">
            <div className="zero-state-left">
              <svg className="zero-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="zero-title">Phone problems</span>
              <span className="zero-sub">All participant phone numbers reachable</span>
            </div>
            <span className="zero-count-pill tabular-nums">0</span>
          </div>
        ) : (
          <div className="priority-section urgent">
            <div className="section-header-bar">
              <div className="section-title-group">
                <h2>Phone problems</h2>
              </div>
              <Link href="/outbox?status=failed" className="btn btn-primary" style={{ minHeight: "44px" }}>
                Inspect {failedSmsCount} failed SMS
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: Visits This Week (With Gestational Week 12-42 Tracker) */}
      <section id="sec-visits-due" className="priority-section">
        <div className="section-header-bar">
          <div className="section-title-group">
            <svg className="icon-svg sm" style={{ color: "var(--text-secondary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h2>Visits this week</h2>
          </div>
          <span className="badge badge-neutral tabular-nums">{visitsDueCount}</span>
        </div>

        {visitsDueCount === 0 ? (
          <div style={{ padding: "2rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            No clinic visits scheduled in the next 7 days.{" "}
            <Link href="/appointments" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              View all scheduled visits
            </Link>
          </div>
        ) : (
          <div className="priority-list">
            {visitsThisWeek.map((apt) => {
              const preg = apt.participant.pregnancies[0];
              const gaInfo = preg?.eddDate ? calculateGestationalAge(preg.eddDate) : null;
              const gaWeeks = gaInfo ? Math.min(42, Math.max(12, gaInfo.weeks)) : null;
              const pct = gaWeeks !== null ? ((gaWeeks - 12) / 30) * 100 : null;

              return (
                <div key={apt.id} className="priority-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div className="row-main-info">
                      <div className="row-title-line">
                        <Link href={`/participants/${apt.participant.id}`} className="row-patient-name">
                          {apt.participant.fullName}
                        </Link>
                        <span className="mrn-badge">{apt.participant.publicCode}</span>
                        <span className={`badge ${apt.kind === "anc" ? "badge-info" : "badge-success"}`}>
                          {apt.kind === "anc" ? "ANC Visit" : "PNC Visit"}
                        </span>
                        {gaInfo && (
                          <span className="badge badge-neutral tabular-nums">
                            {gaInfo.formatted}
                          </span>
                        )}
                      </div>
                      <div className="row-meta-line">
                        <span>{formatKebele(apt.participant.kebele)}</span>
                        <span>&bull;</span>
                        <span>{apt.participant.facility.name}</span>
                        <span>&bull;</span>
                        <span className="tabular-nums">
                          {apt.scheduledFor.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="row-actions">
                      <Link
                        href={`/participants/${apt.participant.id}`}
                        className="btn btn-primary"
                        style={{ minHeight: "44px" }}
                      >
                        Record visit
                      </Link>
                    </div>
                  </div>

                  {/* Gestational Week 12-42 Tracker */}
                  {gaWeeks !== null && pct !== null && (
                    <div className="gt-wrapper">
                      <div className="gt-desktop-view">
                        <div className="continuum-scale-bar">
                          <div
                            className="continuum-scale-fill"
                            style={{ width: `${pct}%` }}
                          />
                          {ancWeeks.map((wk) => {
                            const tickPct = ((wk - 12) / 30) * 100;
                            const isPast = wk <= gaWeeks;
                            return (
                              <div
                                key={wk}
                                className={`gt-tick ${isPast ? "is-attended" : "is-upcoming"}`}
                                style={{ left: `${tickPct}%` }}
                                title={`Week ${wk}`}
                              >
                                <span className="gt-tick-dot">
                                  {isPast ? "✓" : ""}
                                </span>
                                <span className="gt-tick-label tabular-nums">{wk}w</span>
                              </div>
                            );
                          })}
                          <div className="gt-here-pin" style={{ left: `${pct}%` }}>
                            <span className="gt-here-badge tabular-nums">Week {gaInfo?.weeks}</span>
                          </div>
                        </div>
                      </div>
                      <div className="gt-mobile-view">
                        <div className="gt-mobile-bar">
                          <div className="gt-mobile-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="gt-mobile-text tabular-nums">
                          Week {gaInfo?.weeks} of 42 &bull; Next checkup{" "}
                          {apt.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent SMS Activity */}
      <section className="card" style={{ marginTop: "1.5rem", padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">Recent automated SMS dispatches</h2>
          <Link href="/outbox" className="btn btn-outline" style={{ minHeight: "44px" }}>
            View full SMS log
          </Link>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mother</th>
                <th>Message</th>
                <th>Status</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No recent SMS activity.
                  </td>
                </tr>
              ) : (
                recentMessages.map((msg) => (
                  <tr key={msg.id}>
                    <td>
                      <Link
                        href={`/participants/${msg.participant.id}`}
                        style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                      >
                        {msg.participant.fullName}
                      </Link>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} className="tabular-nums">
                        {msg.participant.publicCode}
                      </div>
                    </td>
                    <td style={{ maxWidth: "360px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {msg.messageContent}
                    </td>
                    <td>
                      {msg.status === "sent" || msg.status === "delivered" || msg.status === "submitted" ? (
                        <span className="badge badge-success">Delivered</span>
                      ) : msg.status === "failed" ? (
                        <span className="badge badge-urgent">Failed</span>
                      ) : (
                        <span className="badge badge-info">Queued</span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {new Date(msg.scheduledAt).toLocaleDateString("en-US", {
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
      </section>
    </div>
  );
}
