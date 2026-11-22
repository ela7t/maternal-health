import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage") || "all";
    const language = searchParams.get("language") || "all";

    const whereClause: any = {};
    if (stage !== "all") {
      if (stage.includes("trimester") || stage.includes("first") || stage.includes("second") || stage.includes("third")) {
        whereClause.stream = "educational";
      } else if (stage === "postnatal") {
        whereClause.stream = "pnc_reminder";
      } else if (stage === "appointment") {
        whereClause.stream = "anc_reminder";
      }
    }

    const templates = await prisma.messageTemplate.findMany({
      where: whereClause,
      include: {
        variants: {
          where: language !== "all" ? { language } : undefined,
        },
      },
      orderBy: { id: "asc" },
    });

    const formatted = templates.map((t) => ({
      id: String(t.id),
      templateCode: t.code,
      clinicalStage: t.stream,
      timingDayOffset: t.gaFromWeeks ? t.gaFromWeeks * 7 : t.pncDayFrom || 0,
      description: t.topic,
      variants: t.variants.map((v) => ({
        id: String(v.id),
        languageCode: v.language,
        framingVariant: v.framing,
        messageContent: v.body,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load message bank" }, { status: 500 });
  }
}
