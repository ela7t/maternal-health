import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message_id, status, callback_token } = body;

    if (!message_id && !callback_token) {
      return NextResponse.json({ error: "Missing message_id or callback_token" }, { status: 400 });
    }

    const rawStatus = String(status || "").toLowerCase();
    const mappedStatus = rawStatus.includes("deliver")
      ? "delivered"
      : rawStatus.includes("fail") || rawStatus.includes("reject")
      ? "failed"
      : "sent";

    // Find the outbox message by callbackToken or gatewayMsgId
    const outboxMsg = await prisma.outboxMessage.findFirst({
      where: {
        OR: [
          callback_token ? { callbackToken: callback_token } : undefined,
          message_id ? { gatewayMsgId: String(message_id) } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (outboxMsg) {
      await prisma.outboxMessage.update({
        where: { id: outboxMsg.id },
        data: {
          status: mappedStatus,
          deliveredAt: mappedStatus === "delivered" ? new Date() : undefined,
        },
      });

      await prisma.deliveryEvent.create({
        data: {
          outboxId: outboxMsg.id,
          rawStatus,
          mappedStatus,
          rawPayload: body,
        },
      });
    }

    return NextResponse.json({ acknowledge: true });
  } catch (error: any) {
    console.error("AfroMessage callback error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
