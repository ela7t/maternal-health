import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const [queued, sent, delivered, failed, lastSent, lastDelivered] = await Promise.all([
    prisma.outboxMessage.count({ where: { status: { in: ["pending", "queued"] } } }),
    prisma.outboxMessage.count({ where: { status: { in: ["sent", "submitted"] } } }),
    prisma.outboxMessage.count({ where: { status: "delivered" } }),
    prisma.outboxMessage.count({ where: { status: "failed" } }),
    prisma.outboxMessage.findFirst({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.outboxMessage.findFirst({
      where: { deliveredAt: { not: null } },
      orderBy: { deliveredAt: "desc" },
      select: { deliveredAt: true },
    }),
  ]);

  const now = Date.now();
  const elapsedMinutes = lastDelivered?.deliveredAt
    ? Math.max(1, Math.round((now - lastDelivered.deliveredAt.getTime()) / 60000))
    : null;

  const gatewayStatus =
    elapsedMinutes === null
      ? "idle"
      : elapsedMinutes < 60
      ? "healthy"
      : elapsedMinutes < 1440
      ? "warning"
      : "idle";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            System health &amp; infrastructure
          </h1>
          <span className="badge badge-success">
            <span className="status-dot pulse" />
            <span>Operational</span>
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
          Telecom gateway route telemetry, queue latency, and sending window monitoring.
        </p>
      </div>

      {/* Queue Telemetry Summary Cards */}
      <div className="metric-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{queued}</div>
            <div className="metric-label">Queued for dispatch</div>
          </div>
          <div>
            <div className="metric-sub">Awaiting dispatch window / worker</div>
            <div className="metric-progress-bar">
              <div className="metric-progress-fill" style={{ width: queued > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{sent}</div>
            <div className="metric-label">Sent (in-flight)</div>
          </div>
          <div>
            <div className="metric-sub">Awaiting DLR confirmation</div>
            <div className="metric-progress-bar">
              <div className="metric-progress-fill" style={{ width: sent > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{delivered}</div>
            <div className="metric-label">Delivered (handset)</div>
          </div>
          <div>
            <div className="metric-sub">Confirmed handset deliveries</div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${delivered > 0 ? "is-success" : ""}`}
                style={{ width: delivered > 0 ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{failed}</div>
            <div className="metric-label">Delivery failures</div>
          </div>
          <div>
            <div className="metric-sub">Exceeded retries / unreachable</div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${failed > 0 ? "is-warning" : ""}`}
                style={{ width: failed > 0 ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Routes Health Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">SMS gateway routes telemetry</h2>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Route identifier</th>
                <th>Health status</th>
                <th>Last dispatched</th>
                <th>Last delivered</th>
                <th style={{ textAlign: "right" }}>Elapsed</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 700 }}>AfroMessage</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Primary Ethio Telecom &amp; Safaricom Gateway (AfroMessage API)
                  </span>
                </td>
                <td>
                  {gatewayStatus === "healthy" ? (
                    <span className="badge badge-success">Healthy (&lt; 1 hour)</span>
                  ) : gatewayStatus === "warning" ? (
                    <span className="badge badge-warning">Active (&lt; 24 hours)</span>
                  ) : (
                    <span className="badge badge-neutral">Standby / No recent deliveries</span>
                  )}
                </td>
                <td className="tabular-nums" style={{ fontSize: "0.8125rem" }}>
                  {lastSent?.sentAt
                    ? lastSent.sentAt.toISOString().slice(0, 16).replace("T", " ")
                    : "None"}
                </td>
                <td className="tabular-nums" style={{ fontSize: "0.8125rem" }}>
                  {lastDelivered?.deliveredAt
                    ? lastDelivered.deliveredAt.toISOString().slice(0, 16).replace("T", " ")
                    : "None"}
                </td>
                <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 600 }}>
                  {elapsedMinutes !== null ? `${elapsedMinutes} mins ago` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
