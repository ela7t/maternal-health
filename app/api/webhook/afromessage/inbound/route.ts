import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processOptOut } from "@/lib/scheduler/dispatcher";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, message } = body;

    if (!from || !message) {
      return NextResponse.json({ error: "Missing from or message" }, { status: 400 });
    }

    const trimmed = String(message).trim().toUpperCase();
    const isStop =
      trimmed === "STOP" ||
      trimmed === "አቁም" ||
      trimmed.includes("STOP") ||
      trimmed.includes("አቁም");

    if (isStop) {
      let cleanPhone = String(from).replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "251" + cleanPhone.slice(1);
      else if (!cleanPhone.startsWith("251")) cleanPhone = "251" + cleanPhone;
      cleanPhone = "+" + cleanPhone;

      // Find participant with this phone
      const phoneRecord = await prisma.participantPhone.findFirst({
        where: { numberE164: cleanPhone },
        include: { participant: true },
      });

      if (phoneRecord) {
        await processOptOut(phoneRecord.participantId, "sms_reply", `Inbound keyword: ${message}`);
        return NextResponse.json({
          acknowledge: true,
          optOutProcessed: true,
          participantId: phoneRecord.participantId,
        });
      }
    }

    return NextResponse.json({
      acknowledge: true,
      optOutProcessed: false,
    });
  } catch (error: any) {
    console.error("AfroMessage inbound error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
