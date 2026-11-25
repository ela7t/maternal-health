import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Radio,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SyncSchedulerButton } from "@/components/SyncSchedulerButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    activePregnant,
    activePostnatal,
    completed,
    totalEnrolled,
    scheduledAppointments,
    missedAppointmentsList,
    optedOut,
    lossCount,
    totalSms,
    sentSms,
    recentMessages,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
    prisma.participant.count({ where: { status: "completed" } }),
    prisma.participant.count(),
    prisma.appointment.count({
      where: { status: "scheduled", scheduledFor: { gte: startOfToday } },
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
          include: { phones: { where: { isPrimary: true } } },
        },
      },
    }),
    prisma.participant.count({ where: { status: "opted_out" } }),
    prisma.participant.count({ where: { status: "loss" } }),
    prisma.outboxMessage.count(),
    prisma.outboxMessage.count({
      where: { status: { in: ["delivered", "sent", "submitted"] } },
    }),
    prisma.outboxMessage.findMany({
      take: 8,
      orderBy: { scheduledAt: "desc" },
      include: {
        participant: {
          include: { facility: true },
        },
        phone: true,
      },
    }),
  ]);

  const missedAppointments = missedAppointmentsList.length;
  const deliverySuccessRate =
    totalSms > 0 ? Math.round((sentSms / totalSms) * 100) : null;

  return (
    <>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">
            Today&apos;s clinic &amp; messaging overview
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-secondary)" }}>
            Monitoring registered mothers, appointment attendance, and automated prenatal/postnatal SMS streams.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <SyncSchedulerButton />
          <Link href="/participants/new" className="btn-medical">
            <UserPlus size={16} />
            <span>Register new mother</span>
          </Link>
        </div>
      </div>

      {/* Clinical Triage Banner (Expanded when > 0, slim 44px strip when 0) */}
      {missedAppointments > 0 ? (
        <div className="action-banner danger">
          <div className="d-flex align-items-center gap-3">
            <AlertTriangle size={22} className="flex-shrink-0" />
            <div>
              <div className="fw-bold">
                {missedAppointments} {missedAppointments === 1 ? "mother" : "mothers"} missed scheduled appointments
              </div>
              <div className="small">
                An automatic rescheduling SMS was queued. Review and call to arrange a new visit date.
              </div>
            </div>
          </div>
          <Link
            href="/appointments?filter=missed"
            className="btn btn-danger fw-semibold px-3 text-nowrap"
          >
            <span>Review missed visits</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="zero-strip">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={18} style={{ color: "var(--success-text)" }} />
            <span className="fw-medium">
              All scheduled clinic visits are up to date &mdash; no missed appointments requiring tracing.
            </span>
          </div>
          <span className="badge-clinical postnatal tabular-nums">0 missed</span>
        </div>
      )}

      {/* 4 Actionable Clinical KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <Link
            href="/participants?status=active_pregnant"
            className={`kpi-card-link ${activePregnant === 0 ? "is-muted" : ""}`}
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="kpi-label">Active pregnancies</span>
                <div className="kpi-value">{activePregnant}</div>
              </div>
              <span className="badge-clinical pregnant">
                <HeartPulse size={16} />
              </span>
            </div>
            <div
              className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between small"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>Receiving prenatal SMS</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        </div>

        <div className="col-xl-3 col-md-6">
          <Link
            href="/participants?status=postnatal"
            className={`kpi-card-link ${activePostnatal === 0 ? "is-muted" : ""}`}
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="kpi-label">Postnatal care (0&ndash;6 wks)</span>
                <div className="kpi-value">{activePostnatal}</div>
              </div>
              <span className="badge-clinical postnatal">
                <CheckCircle2 size={16} />
              </span>
            </div>
            <div
              className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between small"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>Newborn follow-up stream</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        </div>

        <div className="col-xl-3 col-md-6">
          <Link
            href="/appointments?filter=scheduled"
            className={`kpi-card-link ${scheduledAppointments === 0 ? "is-muted" : ""}`}
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="kpi-label">Upcoming ANC visits</span>
                <div className="kpi-value">{scheduledAppointments}</div>
              </div>
              <span className="badge-clinical pregnant">
                <CalendarCheck2 size={16} />
              </span>
            </div>
            <div
              className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between small"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>72h advance reminders active</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        </div>

        <div className="col-xl-3 col-md-6">
          <Link
            href="/participants?status=completed"
            className={`kpi-card-link ${completed === 0 ? "is-muted" : ""}`}
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="kpi-label">Graduated cohort</span>
                <div className="kpi-value">{completed}</div>
              </div>
              <span className="badge-clinical completed">
                <ShieldCheck size={16} />
              </span>
            </div>
            <div
              className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between small"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="tabular-nums">{totalEnrolled} total enrolled</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        </div>
      </div>

      {/* Delivery Performance & Program Safety */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card-custom p-4 h-100">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <h2 className="h5 fw-bold mb-1 d-flex align-items-center gap-2">
                  <Radio size={18} />
                  <span>Automated SMS delivery health</span>
                </h2>
                <small style={{ color: "var(--text-secondary)" }}>
                  Connected to Ethio Telecom &amp; Safaricom routes through AfroMessage gateway
                </small>
              </div>
              <span className="badge-clinical postnatal">
                <CheckCircle2 size={14} />
                <span>Gateway online</span>
              </span>
            </div>

            <div className="row g-3 my-1">
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="small fw-medium" style={{ color: "var(--text-secondary)" }}>
                    Messages dispatched
                  </div>
                  <div className="fs-3 fw-bold mt-1 tabular-nums">{totalSms}</div>
                  <div className="small" style={{ color: "var(--text-muted)" }}>
                    Total automated SMS
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="small fw-medium" style={{ color: "var(--text-secondary)" }}>
                    Successfully delivered
                  </div>
                  <div
                    className="fs-3 fw-bold mt-1 tabular-nums"
                    style={{ color: sentSms > 0 ? "var(--success-text)" : "var(--text-primary)" }}
                  >
                    {sentSms}
                  </div>
                  <div className="small" style={{ color: "var(--text-muted)" }}>
                    Confirmed by network
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="small fw-medium" style={{ color: "var(--text-secondary)" }}>
                    Delivery rate
                  </div>
                  <div
                    className="fs-3 fw-bold mt-1 tabular-nums"
                    style={{
                      color:
                        deliverySuccessRate !== null && deliverySuccessRate >= 95
                          ? "var(--success-text)"
                          : "var(--text-primary)",
                    }}
                  >
                    {deliverySuccessRate !== null ? `${deliverySuccessRate}%` : "—"}
                  </div>
                  <div className="small" style={{ color: "var(--text-muted)" }}>
                    {deliverySuccessRate !== null ? "Target: > 95%" : "No data yet"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 rounded bg-light border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
              <div className="small d-flex align-items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <Clock size={15} />
                <span>
                  Sending windows: <strong>8:00 AM &ndash; 10:00 AM</strong> and{" "}
                  <strong>7:00 PM</strong> (Addis Ababa)
                </span>
              </div>
              <Link href="/outbox" className="btn btn-outline-secondary text-nowrap">
                View outbox details
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-custom p-4 h-100">
            <h2 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <ShieldCheck size={18} />
              <span>Program safety &amp; privacy</span>
            </h2>
            <ul className="list-unstyled mb-0">
              <li className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold small">Shared phone protection</div>
                  <small style={{ color: "var(--text-secondary)" }}>
                    No PII or diagnosis in SMS body
                  </small>
                </div>
                <span className="badge-clinical postnatal">
                  <CheckCircle2 size={13} /> Active
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold small">Opt-out requests</div>
                  <small style={{ color: "var(--text-secondary)" }}>
                    Mothers replied STOP / አቁም
                  </small>
                </div>
                <span className="badge-clinical completed tabular-nums">{optedOut}</span>
              </li>
              <li className="d-flex justify-content-between align-items-center py-2">
                <div>
                  <div className="fw-semibold small">Sensitive branch flags</div>
                  <small style={{ color: "var(--text-secondary)" }}>
                    Immediate halt on pregnancy loss
                  </small>
                </div>
                <span className={`badge-clinical ${lossCount > 0 ? "missed" : "completed"} tabular-nums`}>
                  {lossCount}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Mother Activity Table */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean">
          <div className="d-flex align-items-center gap-2">
            <Clock size={16} />
            <span>Recent automated messages</span>
          </div>
          <Link href="/outbox" className="btn btn-outline-secondary">
            See all messages
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother</th>
                <th>Facility &amp; phone</th>
                <th>Message sent</th>
                <th>Segments</th>
                <th>Delivery status</th>
                <th>Scheduled for</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: "var(--text-secondary)" }}>
                    No recent outbox activity. Register a mother to initiate automated scheduling.
                  </td>
                </tr>
              ) : (
                recentMessages.map((msg) => (
                  <tr key={msg.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="patient-avatar">
                          {msg.participant.fullName ? msg.participant.fullName.slice(0, 1) : "M"}
                        </div>
                        <div>
                          <Link
                            href={`/participants/${msg.participant.id}`}
                            className="fw-bold text-decoration-none d-block"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {msg.participant.fullName}
                          </Link>
                          <span className="small tabular-nums" style={{ color: "var(--text-secondary)" }}>
                            {msg.participant.publicCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="small fw-semibold">{msg.participant.facility.name}</div>
                      <small className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {msg.phone?.numberE164} (
                        {msg.phone?.ownerType
                          ? msg.phone.ownerType.charAt(0).toUpperCase() + msg.phone.ownerType.slice(1)
                          : "Self"}
                        )
                      </small>
                    </td>
                    <td style={{ maxWidth: "360px" }}>
                      <div className="small text-truncate" title={msg.messageContent}>
                        {msg.messageContent}
                      </div>
                    </td>
                    <td>
                      <span className="badge-clinical completed tabular-nums">
                        {msg.segments} {msg.segments === 1 ? "segment" : "segments"}
                      </span>
                    </td>
                    <td>
                      {msg.status === "sent" || msg.status === "delivered" || msg.status === "submitted" ? (
                        <span className="badge-clinical postnatal">
                          <i className="bi bi-check2"></i> Delivered
                        </span>
                      ) : msg.status === "pending" || msg.status === "queued" ? (
                        <span className="badge-clinical opted-out">
                          <i className="bi bi-hourglass-split"></i> Queued
                        </span>
                      ) : msg.status === "cancelled" ? (
                        <span className="badge-clinical completed">
                          <i className="bi bi-dash-circle"></i> Cancelled
                        </span>
                      ) : (
                        <span className="badge-clinical missed">
                          <i className="bi bi-x-circle"></i> Failed
                        </span>
                      )}
                    </td>
                    <td className="small tabular-nums" style={{ color: "var(--text-secondary)" }}>
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
      </div>
    </>
  );
}
