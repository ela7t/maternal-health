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

  const filters = [
    { key: "all", label: "All visits" },
    { key: "today", label: "Today's clinic" },
    { key: "scheduled", label: "Upcoming (72h SMS)" },
    { key: "missed", label: "Missed follow-ups" },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Antenatal &amp; postnatal checkups
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Track scheduled clinic visits, record attendance, and follow up on missed checkups.
          </p>
        </div>
        <div className="filter-chips-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {filters.map((f) => (
            <Link
              key={f.key}
              href={`/appointments?filter=${f.key}`}
              className={`filter-chip ${currentFilter === f.key ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title tabular-nums">Visit appointments ({appointments.length})</h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            72-hour reminders automated
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mother profile</th>
                <th>Visit stage</th>
                <th>Scheduled date</th>
                <th>Facility</th>
                <th>Attendance status</th>
                <th style={{ textAlign: "right" }}>Clinical action</th>
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
                      <Link
                        href={`/participants/${apt.participant.id}`}
                        style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", display: "block" }}
                      >
                        {apt.participant.fullName}
                      </Link>
                      <span className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {ph ? ph.numberE164 : "No phone"}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {apt.kind === "anc" ? "Antenatal checkup" : "Postnatal checkup"}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      <div style={{ fontWeight: 600 }}>
                        {apt.scheduledFor.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {apt.scheduledFor.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {apt.participant.facility.name}
                    </td>
                    <td>
                      {displayStatus === "attended" && <span className="badge badge-success">Attended</span>}
                      {displayStatus === "missed" && <span className="badge badge-urgent">Missed checkup</span>}
                      {displayStatus === "rescheduled" && <span className="badge badge-warning">Rescheduled</span>}
                      {displayStatus === "scheduled" && <span className="badge badge-info">Scheduled</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
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
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    No visits found under this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
