import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateSmsSegments } from "@/lib/smsEncoding";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const stream = String(body.stream || "educational").trim();
    const topic = String(body.topic || "general").trim();
    const language = String(body.language || "am").trim();
    const framing = String(body.framing || "gain").trim();
    const text = String(body.text || "").trim();

    if (!code || !text) {
      return NextResponse.json(
        { error: "Template code and message body are required." },
        { status: 400 }
      );
    }

    const forbidden = ["diagnosis", "hiv", "syphilis", "positive", "abortion"];
    const lower = text.toLowerCase();
    if (forbidden.some((w) => lower.includes(w))) {
      return NextResponse.json(
        { error: "Privacy violation: clinical diagnoses are forbidden in SMS templates." },
        { status: 400 }
      );
    }

    const calc = calculateSmsSegments(text);

    const created = await prisma.messageTemplate.create({
      data: {
        code,
        stream,
        topic,
        approvalStatus: "approved",
        variants: {
          create: {
            language,
            framing,
            body: text,
            segmentCount: calc.segmentCount,
          },
        },
      },
      include: { variants: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create template." },
      { status: 500 }
    );
  }
}
