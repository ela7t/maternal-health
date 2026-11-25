import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processOptOut } from "@/lib/scheduler/dispatcher";
import { normalizeEthiopianPhone } from "@/lib/domain/phone";
import { DomainError } from "@/lib/domain/stateMachines";

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
      let cleanPhone: string;
      try {
        cleanPhone = normalizeEthiopianPhone(String(from));
      } catch (e) {
        if (e instanceof DomainError) {
          return NextResponse.json({ acknowledge: true, optOutProcessed: false });
        }
        throw e;
      }

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
