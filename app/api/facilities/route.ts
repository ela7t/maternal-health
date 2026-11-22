import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(facilities);
  } catch (error: any) {
    console.error("GET /api/facilities error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch facilities" }, { status: 500 });
  }
}
