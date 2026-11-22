import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planSchedules, dispatchPendingMessages } from "@/lib/scheduler/dispatcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const whereClause: any = {};
    if (status !== "all") {
      whereClause.status = status;
    }

    const messages = await prisma.outboxMessage.findMany({
      where: whereClause,
      include: {
        participant: true,
        phone: true,
        variant: {
          include: {
            template: true,
          },
        },
        deliveryEvents: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    });

    const formatted = messages.map((m) => ({
      id: String(m.id),
      recipientPhone: m.phone?.numberE164 || "N/A",
      messageBody: m.messageContent,
      clinicalStage: m.variant?.template?.stream || "clinical",
      status: m.status,
      deliveryStatus: m.deliveryEvents[0]?.mappedStatus || m.status,
      scheduledFor: m.scheduledAt.toISOString(),
      sentAt: m.sentAt?.toISOString() || null,
      deliveredAt: m.deliveredAt?.toISOString() || null,
      motherName: m.participant?.fullName || "Participant",
      studyCode: m.participant?.publicCode || "N/A",
      templateCode: m.variant?.template?.code || "MANUAL",
      framingVariant: m.variant?.framing || "gain",
      languageCode: m.variant?.language || "am",
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load outbox activity" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const planResult = await planSchedules();
    const dispatchResult = await dispatchPendingMessages();

    return NextResponse.json({
      success: true,
      planned: (planResult.educationalQueued || 0) + (planResult.remindersQueued || 0),
      dispatched: dispatchResult.sent || 0,
      errors: dispatchResult.failed || 0,
    });
  } catch (error: any) {
    console.error("POST /api/activity trigger error:", error);
    return NextResponse.json({ error: error?.message || "Dispatch trigger failed" }, { status: 500 });
  }
}
