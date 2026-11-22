import { NextResponse } from "next/server";
import { calculateSmsSegments } from "@/lib/sms/ucs2-segment-counter";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const result = calculateSmsSegments(text || "");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid request" }, { status: 400 });
  }
}
