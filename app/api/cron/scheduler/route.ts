import { NextResponse } from "next/server";
import { planSchedules, dispatchPendingMessages } from "@/lib/scheduler/dispatcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    // If CRON_SECRET is configured, enforce it
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planResult = await planSchedules();
    const dispatched = await dispatchPendingMessages();

    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      planned: (planResult.educationalQueued || 0) + (planResult.remindersQueued || 0),
      dispatched: dispatched.sent,
      failed: dispatched.failed,
      retried: dispatched.retried,
    });
  } catch (error: any) {
    console.error("Cron scheduler error:", error);
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal scheduler failure" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
