import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [
    totalEnrolled,
    activePregnant,
    postnatal,
    completed,
    totalAnc,
    attendedAnc,
    totalMissed,
    totalBirths,
    facilityBirths,
    pncAttended,
    totalSms,
    deliveredSms,
  ] = await Promise.all([
    prisma.participant.count(),
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
    prisma.participant.count({ where: { status: "completed" } }),
    prisma.appointment.count({ where: { kind: "anc" } }),
    prisma.appointment.count({ where: { kind: "anc", status: "attended" } }),
    prisma.appointment.count({ where: { status: "missed" } }),
    prisma.pregnancy.count({ where: { deliveredAt: { not: null } } }),
    prisma.pregnancy.count({ where: { deliveredAt: { not: null }, deliveryPlace: { not: null } } }),
    prisma.appointment.count({ where: { kind: "pnc", status: "attended" } }),
    prisma.outboxMessage.count(),
    prisma.outboxMessage.count({ where: { status: { in: ["sent", "delivered", "submitted"] } } }),
  ]);

  const benchmarks = [
    {
      name: "ANC contacts attended",
      num: attendedAnc,
      den: totalAnc,
      target: 80,
      baseline: "34%",
    },
    {
      name: "Facility birth share",
      num: facilityBirths,
      den: totalBirths,
      target: 90,
      baseline: "48%",
    },
    {
      name: "PNC contacts attended",
      num: pncAttended,
      den: totalBirths,
      target: 80,
      baseline: "34%",
    },
    {
      name: "SMS delivery rate",
      num: deliveredSms,
      den: totalSms,
      target: 95,
      baseline: "—",
    },
  ];

  const cascade = [
    { label: "Total enrolled", value: totalEnrolled },
    { label: "Active pregnant", value: activePregnant },
    { label: "Deliveries recorded", value: totalBirths },
    { label: "Postnatal active", value: postnatal },
    { label: "Graduated", value: completed },
    { label: "Missed visits", value: totalMissed },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Clinical health indicators &amp; research reports
            </h1>
            <span className="badge badge-neutral">Strictly de-identified</span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            WHO care continuum benchmarks &amp; research microdata exports
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="/api/reports/export?format=csv" className="btn btn-outline" style={{ minHeight: "44px" }}>
            Export CSV
          </a>
          <a href="/api/reports/export?format=json" className="btn btn-primary" style={{ minHeight: "44px" }}>
            Export JSON dataset
          </a>
        </div>
      </div>

      {/* Care Continuum Cascade */}
      <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <h2 className="card-title" style={{ marginBottom: "1rem" }}>
          Care continuum cascade
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {cascade.map((step) => (
            <div
              key={step.label}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "0.875rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {step.label}
              </div>
              <div className="tabular-nums" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {step.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmarking Matrix */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">Clinical health indicators &amp; benchmarking matrix</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinical health indicator</th>
                <th style={{ textAlign: "right" }}>Numerator</th>
                <th style={{ textAlign: "right" }}>Denominator</th>
                <th>Observed rate</th>
                <th style={{ textAlign: "right" }}>WHO target</th>
                <th style={{ textAlign: "right" }}>EDHS baseline</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => {
                const rate = b.den > 0 ? Math.min(100, Math.round((b.num / b.den) * 100)) : null;
                return (
                  <tr key={b.name}>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>{b.num}</td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>{b.den}</td>
                    <td>
                      {rate !== null ? (
                        <span className={`badge ${rate >= b.target ? "badge-success" : "badge-neutral"} tabular-nums`}>
                          {rate}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                          &mdash; (No data yet)
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 600 }}>
                      {b.target}%
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                      {b.baseline}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
