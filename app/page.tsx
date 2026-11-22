import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SyncSchedulerButton } from "@/components/SyncSchedulerButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate clinical stats
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
    prisma.appointment.count({ where: { status: "scheduled", scheduledFor: { gte: startOfToday } } }),
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
    prisma.outboxMessage.count({ where: { status: { in: ["delivered", "sent", "submitted"] } } }),
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
  const deliverySuccessRate = totalSms > 0 ? Math.round((sentSms / totalSms) * 100) : 100;

  return (
    <>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-slate-900">Today&apos;s Clinic &amp; Messaging Overview</h3>
          <p className="text-secondary mb-0 small">
            Monitoring registered mothers, appointment attendance, and automated prenatal/postnatal SMS streams.
          </p>
        </div>
        <div className="d-flex gap-2">
          <SyncSchedulerButton />
          <Link href="/participants/new" className="btn-medical btn-sm shadow-sm">
            <i className="bi bi-person-plus-fill"></i> Register New Mother
          </Link>
        </div>
      </div>

      {/* Immediate Clinical Action Banner (Triage) */}
      {missedAppointments > 0 && (
        <div className="action-banner danger shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-danger bg-opacity-10 p-2 text-danger fs-5 d-flex align-items-center justify-content-center"
              style={{ width: "40px", height: "40px" }}
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div>
              <div className="fw-bold">
                {missedAppointments} Mother{missedAppointments > 1 ? "s" : ""} Missed Scheduled Appointments
              </div>
              <div className="small">
                The system sent an automatic rescheduling SMS. Please review and call to arrange a new visit date.
              </div>
            </div>
          </div>
          <Link href="/appointments?filter=missed" className="btn btn-sm btn-danger fw-semibold px-3 text-nowrap">
            Review Missed Visits <i className="bi bi-arrow-right ms-1"></i>
          </Link>
        </div>
      )}

      {/* Primary Clinical Metrics Row */}
      <div className="row g-3 mb-4">
        {/* Active Pregnancies */}
        <div className="col-xl-3 col-md-6">
          <div className="card-custom p-3 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-secondary small fw-semibold text-uppercase tracking-wider">
                  Active Pregnancies
                </span>
                <h2 className="fw-bold text-slate-900 mt-2 mb-0">{activePregnant}</h2>
              </div>
              <div
                className="rounded-3 p-2"
                style={{ backgroundColor: "var(--app-primary-light)", color: "var(--app-primary)" }}
              >
                <i className="bi bi-person-heart fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between text-secondary small">
              <span>Receiving prenatal SMS</span>
              <Link
                href="/participants?status=active_pregnant"
                className="text-decoration-none fw-semibold"
                style={{ color: "var(--app-primary)" }}
              >
                View list &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Postnatal Mothers */}
        <div className="col-xl-3 col-md-6">
          <div className="card-custom p-3 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-secondary small fw-semibold text-uppercase tracking-wider">
                  Postnatal Care (0–6 Wks)
                </span>
                <h2 className="fw-bold text-slate-900 mt-2 mb-0">{activePostnatal}</h2>
              </div>
              <div
                className="rounded-3 p-2"
                style={{ backgroundColor: "var(--app-success-light)", color: "var(--app-success)" }}
              >
                <i className="bi bi-flower1 fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between text-secondary small">
              <span>Newborn immunization stream</span>
              <Link href="/participants?status=postnatal" className="text-decoration-none fw-semibold text-success">
                View list &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Today & Upcoming Visits */}
        <div className="col-xl-3 col-md-6">
          <div className="card-custom p-3 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-secondary small fw-semibold text-uppercase tracking-wider">
                  Upcoming ANC Visits
                </span>
                <h2 className="fw-bold text-slate-900 mt-2 mb-0">{scheduledAppointments}</h2>
              </div>
              <div
                className="rounded-3 p-2"
                style={{ backgroundColor: "var(--app-info-light)", color: "var(--app-info)" }}
              >
                <i className="bi bi-calendar-check fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between text-secondary small">
              <span>72h advance reminders active</span>
              <Link href="/appointments?filter=scheduled" className="text-decoration-none fw-semibold text-info">
                View visits &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Completed Program */}
        <div className="col-xl-3 col-md-6">
          <div className="card-custom p-3 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-secondary small fw-semibold text-uppercase tracking-wider">
                  Graduated Cohort
                </span>
                <h2 className="fw-bold text-slate-900 mt-2 mb-0">{completed}</h2>
              </div>
              <div className="rounded-3 bg-light p-2 text-secondary">
                <i className="bi bi-shield-check fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between text-secondary small">
              <span>Completed full 6-week care</span>
              <span className="text-muted">{totalEnrolled} Total Enrolled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Delivery Performance & Telephony Status */}
      <div className="row g-3 mb-4">
        {/* Messaging & Delivery Status Card */}
        <div className="col-lg-8">
          <div className="card-custom p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-1">
                  <i className="bi bi-broadcast me-2" style={{ color: "var(--app-primary)" }}></i>
                  Automated SMS Delivery Health
                </h5>
                <small className="text-secondary">
                  Connected to Ethio Telecom &amp; Safaricom routes through AfroMessage Gateway
                </small>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1">
                <i className="bi bi-circle-fill me-1 text-success" style={{ fontSize: "0.5rem" }}></i> Gateway Online
              </span>
            </div>

            <div className="row g-3 my-1">
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="text-secondary small fw-medium">Messages Dispatched</div>
                  <div className="fs-3 fw-bold text-slate-900 mt-1">{totalSms}</div>
                  <div className="text-muted small">Total automated SMS</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="text-secondary small fw-medium">Successfully Delivered</div>
                  <div className="fs-3 fw-bold text-success mt-1">{sentSms}</div>
                  <div className="text-muted small">Confirmed by network</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-3 rounded border bg-light text-center">
                  <div className="text-secondary small fw-medium">Delivery Rate</div>
                  <div className="fs-3 fw-bold text-primary mt-1">{deliverySuccessRate}%</div>
                  <div className="text-muted small">Jimma trial target: &gt;95%</div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 rounded bg-light border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
              <div className="small text-secondary">
                <i className="bi bi-clock-history me-1" style={{ color: "var(--app-primary)" }}></i>
                Preferred sending windows: <strong>8:00 AM – 10:00 AM</strong> and <strong>7:00 PM</strong> (Addis Ababa
                Time).
              </div>
              <Link href="/outbox" className="btn btn-sm btn-outline-secondary text-nowrap">
                View Outbox Details
              </Link>
            </div>
          </div>
        </div>

        {/* Clinical Safety & Program Compliance */}
        <div className="col-lg-4">
          <div className="card-custom p-4 h-100">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-shield-shaded me-2" style={{ color: "var(--app-primary)" }}></i>
              Program Safety &amp; Privacy
            </h5>
            <ul className="list-unstyled mb-0">
              <li className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold text-slate-900 small">Shared Phone Protection</div>
                  <small className="text-secondary">No PII or diagnosis in SMS body</small>
                </div>
                <span className="badge bg-light text-success border">
                  <i className="bi bi-check-lg"></i> Active
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold text-slate-900 small">Opt-Out Requests</div>
                  <small className="text-secondary">Mothers replied STOP / አቁም</small>
                </div>
                <span className="badge bg-light text-dark border">{optedOut}</span>
              </li>
              <li className="d-flex justify-content-between align-items-center py-2">
                <div>
                  <div className="fw-semibold text-slate-900 small">Sensitive Branch Flags</div>
                  <small className="text-secondary">Immediate halt on pregnancy loss</small>
                </div>
                <span className="badge bg-light text-danger border">{lossCount}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Mother Activity Table */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-clock-history" style={{ color: "var(--app-primary)" }}></i>
            <span>Recent Automated Messages</span>
          </div>
          <Link href="/outbox" className="btn btn-sm btn-outline-secondary">
            See all messages
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother</th>
                <th>Facility &amp; Phone</th>
                <th>Message Sent</th>
                <th>Encoding &amp; Segments</th>
                <th>Delivery Status</th>
                <th>Scheduled For</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
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
                            className="fw-bold text-decoration-none text-dark d-block"
                          >
                            {msg.participant.fullName}
                          </Link>
                          <span className="text-muted small">{msg.participant.publicCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="small fw-semibold text-dark">{msg.participant.facility.name}</div>
                      <small className="text-secondary">
                        {msg.phone?.numberE164} ({msg.phone?.ownerType ? msg.phone.ownerType.charAt(0).toUpperCase() + msg.phone.ownerType.slice(1) : "Self"})
                      </small>
                    </td>
                    <td style={{ maxWidth: "380px" }}>
                      <div className="small text-truncate" title={msg.messageContent}>
                        {msg.messageContent}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border small">
                        {msg.segments} segment{msg.segments > 1 ? "s" : ""}
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
                    <td className="text-secondary small">
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
