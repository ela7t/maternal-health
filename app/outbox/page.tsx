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

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-slate-900">Automated SMS Activity Log</h3>
          <p className="text-secondary mb-0 small">
            Real-time tracking of prenatal educational messages, 72-hour appointment reminders, and network delivery receipts.
          </p>
        </div>
        <SyncSchedulerTrigger />
      </div>

      {/* Outbox Card */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean bg-light d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-send text-teal" style={{ color: "var(--app-primary)" }}></i>
            <span className="fw-bold text-dark">Dispatched & Scheduled Messages ({messages.length})</span>
          </div>
          <div className="btn-group btn-group-sm">
            <Link
              href="/outbox"
              className={`btn btn-outline-secondary ${!currentStatus ? "active" : ""}`}
            >
              All
            </Link>
            <Link
              href="/outbox?status=submitted"
              className={`btn btn-outline-secondary ${currentStatus === "submitted" ? "active" : ""}`}
            >
              Delivered
            </Link>
            <Link
              href="/outbox?status=pending"
              className={`btn btn-outline-secondary ${currentStatus === "pending" ? "active" : ""}`}
            >
              Queued
            </Link>
            <Link
              href="/outbox?status=failed"
              className={`btn btn-outline-danger ${currentStatus === "failed" ? "active" : ""}`}
            >
              Failed
            </Link>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother</th>
                <th>Recipient Phone</th>
                <th>SMS Text Preview</th>
                <th>Segments (UCS-2)</th>
                <th>Network Status</th>
                <th>Gateway Ref</th>
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
                        className="fw-bold text-dark text-decoration-none"
                      >
                        {msg.participant.fullName}
                      </Link>
                      <div className="text-secondary small font-monospace">
                        {msg.participant.publicCode}
                      </div>
                    </td>
                    <td>
                      <div className="small fw-semibold text-dark">
                        {ph ? ph.numberE164 : "—"}
                      </div>
                      <span className="badge bg-light text-secondary border small text-capitalize">
                        {ph?.ownerType || "device"}&apos;s phone
                      </span>
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <div className="small text-slate-700">{msg.messageContent}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border small">
                        {msg.segments} seg
                      </span>
                    </td>
                    <td>
                      {["sent", "delivered", "submitted"].includes(msg.status) && (
                        <span className="badge-clinical postnatal">
                          <i className="bi bi-check2-all"></i> Delivered
                        </span>
                      )}
                      {msg.status === "pending" && (
                        <span className="badge-clinical opted-out">
                          <i className="bi bi-hourglass-split"></i> Queued
                        </span>
                      )}
                      {msg.status === "cancelled" && (
                        <span className="badge-clinical completed">
                          <i className="bi bi-dash-circle"></i> Cancelled
                        </span>
                      )}
                      {msg.status === "failed" && (
                        <span className="badge-clinical missed">
                          <i className="bi bi-x-circle"></i> Failed
                        </span>
                      )}
                    </td>
                    <td className="text-secondary small font-monospace">
                      {msg.gatewayMsgId || "Pending"}
                    </td>
                    <td className="text-secondary small">
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
                  <td colSpan={7} className="text-center text-muted py-5">
                    No messages currently in the outbox.
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
