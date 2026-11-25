import Link from "next/link";
import prisma from "@/lib/prisma";
import { AppointmentTableActions } from "./AppointmentTableActions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AppointmentsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentFilter = params.filter || "all";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const next72h = new Date(now.getTime() + 72 * 3600 * 1000);

  const where: any = {};
  if (currentFilter === "today") {
    where.scheduledFor = { gte: todayStart, lte: todayEnd };
  } else if (currentFilter === "scheduled") {
    where.status = "scheduled";
    where.scheduledFor = { gte: now, lte: next72h };
  } else if (currentFilter === "missed") {
    where.OR = [
      { status: "missed" },
      { status: "scheduled", scheduledFor: { lt: now } },
    ];
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      participant: {
        include: {
          facility: true,
          phones: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Antenatal &amp; postnatal checkups</h1>
          <p className="mb-0 small" style={{ color: "var(--text-secondary)" }}>
            Track scheduled clinic visits, record attendance, and follow up on missed checkups.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2" role="group" aria-label="Visit filters">
          <Link
            href="/appointments?filter=all"
            className={`btn ${currentFilter === "all" ? "btn-medical" : "btn-outline-secondary"}`}
          >
            All visits
          </Link>
          <Link
            href="/appointments?filter=today"
            className={`btn ${currentFilter === "today" ? "btn-medical" : "btn-outline-secondary"}`}
          >
            Today&apos;s clinic
          </Link>
          <Link
            href="/appointments?filter=scheduled"
            className={`btn ${currentFilter === "scheduled" ? "btn-medical" : "btn-outline-secondary"}`}
          >
            Upcoming (72h SMS)
          </Link>
          <Link
            href="/appointments?filter=missed"
            className={`btn ${currentFilter === "missed" ? "btn-danger" : "btn-outline-danger"}`}
          >
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>Missed follow-ups</span>
          </Link>
        </div>
      </div>

      <div className="card-custom overflow-hidden">
        <div className="card-header-clean">
          <span className="fw-bold tabular-nums">
            <i className="bi bi-calendar2-check me-2"></i>
            Visit appointments ({appointments.length})
          </span>
          <span className="small" style={{ color: "var(--text-secondary)" }}>
            72-hour reminders automated
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother Profile</th>
                <th>Visit Stage</th>
                <th>Scheduled Date</th>
                <th>Facility</th>
                <th>Attendance Status</th>
                <th className="text-end">Clinical Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const isOverdue = apt.status === "scheduled" && apt.scheduledFor < now;
                const displayStatus = isOverdue ? "missed" : apt.status;
                const ph =
                  apt.participant.phones.find((p) => p.isPrimary) ||
                  apt.participant.phones[0];

                return (
                  <tr key={apt.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="patient-avatar">
                          {apt.participant.fullName ? apt.participant.fullName.charAt(0) : "M"}
                        </div>
                        <div>
                          <Link
                            href={`/participants/${apt.participant.id}`}
                            className="fw-bold text-dark text-decoration-none d-block"
                          >
                            {apt.participant.fullName}
                          </Link>
                          <small className="text-muted">
                            {ph ? ph.numberE164 : "No phone"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border fw-semibold">
                        {apt.kind === "anc" ? "Antenatal Checkup" : "Postnatal Checkup"}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-slate-900">
                        {apt.scheduledFor.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <small className="text-secondary">
                        {apt.scheduledFor.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </td>
                    <td>
                      <span className="small text-secondary">{apt.participant.facility.name}</span>
                    </td>
                    <td>
                      {displayStatus === "attended" && (
                        <span className="badge-clinical postnatal">
                          <i className="bi bi-check2"></i> Attended
                        </span>
                      )}
                      {displayStatus === "missed" && (
                        <span className="badge-clinical missed">
                          <i className="bi bi-exclamation-triangle"></i> Missed Checkup
                        </span>
                      )}
                      {displayStatus === "rescheduled" && (
                        <span className="badge-clinical opted-out">
                          <i className="bi bi-arrow-repeat"></i> Rescheduled
                        </span>
                      )}
                      {displayStatus === "scheduled" && (
                        <span className="badge-clinical pregnant">
                          <i className="bi bi-clock"></i> Scheduled
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <AppointmentTableActions
                        appointmentId={String(apt.id)}
                        participantName={apt.participant.fullName}
                        publicCode={apt.participant.publicCode}
                        status={displayStatus}
                      />
                    </td>
                  </tr>
                );
              })}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    No visits found under this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
