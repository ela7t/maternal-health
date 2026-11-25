import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    facilities,
    activeWomen,
    totalAncPlanned,
    ancAttended,
    totalBirths,
    facilityBirths,
    pncAttended,
    totalSmsDispatched,
    deliveredSms,
  ] = await Promise.all([
    prisma.facility.findMany({
      include: {
        participants: {
          include: {
            pregnancies: true,
            appointments: true,
            outboxMessages: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.participant.count({
      where: { status: { in: ["active_pregnant", "postnatal"] } },
    }),
    prisma.appointment.count({ where: { kind: "anc" } }),
    prisma.appointment.count({ where: { kind: "anc", status: "attended" } }),
    prisma.pregnancy.count({ where: { deliveredAt: { not: null } } }),
    prisma.pregnancy.count({
      where: {
        deliveredAt: { not: null },
        deliveryPlace: { not: null },
      },
    }),
    prisma.appointment.count({ where: { kind: "pnc", status: "attended" } }),
    prisma.outboxMessage.count(),
    prisma.outboxMessage.count({
      where: { status: { in: ["sent", "delivered", "submitted"] } },
    }),
  ]);

  const ancRate = totalAncPlanned > 0 ? Math.round((ancAttended / totalAncPlanned) * 100) : null;
  const birthRate = totalBirths > 0 ? Math.round((facilityBirths / totalBirths) * 100) : null;
  const pncRate = totalBirths > 0 ? Math.min(100, Math.round((pncAttended / totalBirths) * 100)) : null;
  const smsRate = totalSmsDispatched > 0 ? Math.round((deliveredSms / totalSmsDispatched) * 100) : null;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Facility &amp; district health dashboard
            </h1>
            <span className="badge badge-neutral">Strictly de-identified</span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Wolkite &amp; Jimma Primary Health Program &bull; Maternal &amp; newborn care monitoring
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="/api/reports/export?format=csv" className="btn btn-outline" style={{ minHeight: "44px" }}>
            CSV export
          </a>
          <Link href="/reports" className="btn btn-primary" style={{ minHeight: "44px" }}>
            Full clinical reports
          </Link>
        </div>
      </div>

      {/* 4-Column KPI Grid */}
      <div className="metric-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{activeWomen}</div>
            <div className="metric-label">Active enrolled mothers</div>
          </div>
          <div>
            <div className="metric-sub">In active care pathway</div>
            <div className="metric-progress-bar">
              <div className="metric-progress-fill" style={{ width: activeWomen > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{ancRate !== null ? `${ancRate}%` : "—"}</div>
            <div className="metric-label">ANC contacts attended</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {totalAncPlanned > 0 ? `${ancAttended} / ${totalAncPlanned} contacts attended` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${ancRate !== null && ancRate >= 80 ? "is-success" : ""}`}
                style={{ width: `${ancRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{birthRate !== null ? `${birthRate}%` : "—"}</div>
            <div className="metric-label">Facility birth share</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {totalBirths > 0 ? `${facilityBirths} / ${totalBirths} institutional deliveries` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${birthRate !== null && birthRate >= 90 ? "is-success" : ""}`}
                style={{ width: `${birthRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{smsRate !== null ? `${smsRate}%` : "—"}</div>
            <div className="metric-label">SMS delivery rate</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {totalSmsDispatched > 0 ? `${deliveredSms} / ${totalSmsDispatched} delivered` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${smsRate !== null && smsRate >= 95 ? "is-success" : ""}`}
                style={{ width: `${smsRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Facility Comparison Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">Cross-facility comparison</h2>
          <span className="badge badge-neutral tabular-nums">{facilities.length} facilities</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Facility code &amp; name</th>
                <th style={{ textAlign: "right" }}>Active mothers</th>
                <th style={{ textAlign: "right" }}>ANC attended</th>
                <th style={{ textAlign: "right" }}>Deliveries</th>
                <th style={{ textAlign: "right" }}>PNC attended</th>
                <th style={{ textAlign: "right" }}>SMS delivery</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac) => {
                const facActive = fac.participants.filter((p) =>
                  ["active_pregnant", "postnatal"].includes(p.status)
                ).length;
                const facAncAll = fac.participants.flatMap((p) =>
                  p.appointments.filter((a) => a.kind === "anc")
                );
                const facAncDone = facAncAll.filter((a) => a.status === "attended").length;
                const facAncPct =
                  facAncAll.length > 0 ? Math.round((facAncDone / facAncAll.length) * 100) : null;
                const facDeliveries = fac.participants.flatMap((p) =>
                  p.pregnancies.filter((g) => g.deliveredAt !== null)
                ).length;
                const facPncDone = fac.participants.flatMap((p) =>
                  p.appointments.filter((a) => a.kind === "pnc" && a.status === "attended")
                ).length;
                const facSmsAll = fac.participants.flatMap((p) => p.outboxMessages);
                const facSmsOk = facSmsAll.filter((m) =>
                  ["sent", "delivered", "submitted"].includes(m.status)
                ).length;
                const facSmsPct =
                  facSmsAll.length > 0 ? Math.round((facSmsOk / facSmsAll.length) * 100) : null;

                return (
                  <tr key={fac.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{fac.name}</div>
                      <span className="mrn-badge">{fac.code}</span>
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 700 }}>
                      {facActive}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facAncPct !== null ? (
                        <span className={`badge ${facAncPct >= 80 ? "badge-success" : "badge-neutral"}`}>
                          {facAncPct}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facDeliveries}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facPncDone}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 600 }}>
                      {facSmsPct !== null ? `${facSmsPct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
              {facilities.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No facilities registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PNC Snapshot */}
      <div style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }} className="tabular-nums">
        Postnatal coverage summary: {pncAttended} PNC contacts attended across {totalBirths} recorded deliveries
        {pncRate !== null ? ` (${pncRate}%)` : ""}.
      </div>
    </div>
  );
}
