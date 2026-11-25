import prisma from "@/lib/prisma";
import { SyncSchedulerTrigger } from "./SyncSchedulerTrigger";
import { OutboxLogClient, OutboxLogRow } from "./OutboxLogClient";

export const dynamic = "force-dynamic";

export default async function OutboxListPage() {
  const messages = await prisma.outboxMessage.findMany({
    include: {
      participant: true,
      phone: true,
      variant: { include: { template: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  const rows: OutboxLogRow[] = messages.map((msg) => ({
    id: msg.id,
    participantId: msg.participant.id,
    participantName: msg.participant.fullName,
    publicCode: msg.participant.publicCode,
    phone: msg.phone?.numberE164 || null,
    phoneOwner: msg.phone?.ownerType || null,
    category: msg.variant?.template.stream || "reminder",
    messageContent: msg.messageContent,
    segments: msg.segments,
    status: msg.status,
    gatewayMsgId: msg.gatewayMsgId,
    failureReason: msg.failureReason,
    scheduledAtLabel: new Date(msg.scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            Messages Log
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Complete transmission log with telecom delivery receipts and multi-gateway route tracking.
          </p>
        </div>
        <SyncSchedulerTrigger />
      </div>

      <OutboxLogClient rows={rows} />
    </div>
  );
}
