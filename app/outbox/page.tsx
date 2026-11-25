import Link from "next/link";
import prisma from "@/lib/prisma";
import { SyncSchedulerTrigger } from "./SyncSchedulerTrigger";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function OutboxListPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentStatus = params.status || "";

  const where: any = {};
  if (currentStatus === "submitted") {
    where.status = { in: ["sent", "delivered", "submitted"] };
  } else if (currentStatus === "pending") {
    where.status = "pending";
  } else if (currentStatus === "failed") {
    where.status = "failed";
  }

  const messages = await prisma.outboxMessage.findMany({
    where,
    include: {
      participant: true,
      phone: true,
    },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });

  const filters = [
    { key: "", label: "All" },
    { key: "submitted", label: "Delivered" },
    { key: "pending", label: "Queued" },
    { key: "failed", label: "Failed" },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Messages log
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Transmission log of prenatal educational messages, 72-hour reminders, and delivery receipts.
          </p>
        </div>
        <SyncSchedulerTrigger />
      </div>

      <div className="card" style={{ padding: "14px 20px", marginBottom: "14px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "4px" }}>
          Quick view:
        </span>
        {filters.map((f) => {
          const href = f.key ? `/outbox?status=${f.key}` : "/outbox";
          return (
            <Link
              key={f.label}
              href={href}
              className={`filter-chip ${currentStatus === f.key ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title tabular-nums">
            Dispatched &amp; scheduled messages ({messages.length})
          </h2>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Recipient phone</th>
                <th>Message content</th>
                <th>Segments</th>
                <th>Status</th>
                <th>Gateway ref</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => {
                const ph = msg.phone;
                return (
                  <tr key={msg.id}>
                    <td>
                      <Link
                        href={`/participants/${msg.participant.id}`}
                        style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", display: "block" }}
                      >
                        {msg.participant.fullName}
                      </Link>
                      <span className="mrn-badge tabular-nums" style={{ marginTop: "4px", display: "inline-block" }}>
                        {msg.participant.publicCode}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                        {ph ? ph.numberE164 : "—"}
                      </div>
                      <span className="badge badge-neutral" style={{ marginTop: "2px" }}>
                        {ph?.ownerType || "device"}&apos;s phone
                      </span>
                    </td>
                    <td style={{ maxWidth: "360px", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {msg.messageContent}
                    </td>
                    <td>
                      <span className="badge badge-neutral tabular-nums">{msg.segments} seg</span>
                    </td>
                    <td>
                      {["sent", "delivered", "submitted"].includes(msg.status) && (
                        <span className="badge badge-success">
                          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Delivered</span>
                        </span>
                      )}
                      {msg.status === "pending" && (
                        <span className="badge badge-info">
                          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Queued</span>
                        </span>
                      )}
                      {msg.status === "cancelled" && (
                        <span className="badge badge-neutral">Cancelled</span>
                      )}
                      {msg.status === "failed" && (
                        <span className="badge badge-urgent">
                          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      {msg.gatewayMsgId || "Pending"}
                    </td>
                    <td className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {(msg.sentAt || msg.scheduledAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    No messages currently in the outbox.
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
