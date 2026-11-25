import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAppointmentTransition, DomainError } from "@/lib/domain/stateMachines";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    let whereClause: any = {};

    if (filter === "today") {
      whereClause = {
        scheduledFor: { gte: startOfToday, lte: endOfToday },
      };
    } else if (filter === "upcoming") {
      whereClause = {
        scheduledFor: { gt: endOfToday, lte: in7Days },
        status: "scheduled",
      };
    } else if (filter === "missed") {
      whereClause = {
        OR: [
          { status: "missed" },
          { status: "scheduled", scheduledFor: { lt: startOfToday } },
        ],
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        participant: {
          include: {
            facility: true,
            phones: { where: { isPrimary: true } },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
    });

    const formatted = appointments.map((apt) => ({
      id: String(apt.id),
      pregnancyId: String(apt.participantId),
      visitType: apt.kind.toUpperCase(),
      scheduledFor: apt.scheduledFor.toISOString(),
      status:
        apt.status === "scheduled" && new Date(apt.scheduledFor) < startOfToday
          ? "missed"
          : apt.status,
      attendedAt: null,
      rescheduledTo: null,
      motherName: apt.participant.fullName,
      studyCode: apt.participant.publicCode,
      phone: apt.participant.phones[0]?.numberE164 || "N/A",
      facility: apt.participant.facility.name,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, newDate } = body;

    const aptId = parseInt(id, 10);
    if (isNaN(aptId) || !action) {
      return NextResponse.json({ error: "Missing or invalid appointment id or action" }, { status: 400 });
    }

    if (action === "attend") {
      const existing = await prisma.appointment.findUnique({ where: { id: aptId } });
      if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      assertAppointmentTransition(existing.status, "attended");

      const updated = await prisma.appointment.update({
        where: { id: aptId },
        data: {
          status: "attended",
          recordedBy: "admin",
        },
      });
      return NextResponse.json({ success: true, appointment: updated });
    }

    if (action === "reschedule") {
      if (!newDate) {
        return NextResponse.json({ error: "Missing newDate for reschedule" }, { status: 400 });
      }

      const original = await prisma.appointment.findUnique({ where: { id: aptId } });
      if (!original) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      assertAppointmentTransition(original.status, "rescheduled");

      const [oldApt, newApt] = await prisma.$transaction([
        prisma.appointment.update({
          where: { id: aptId },
          data: {
            status: "rescheduled",
          },
        }),
        prisma.appointment.create({
          data: {
            participantId: original.participantId,
            kind: original.kind,
            scheduledFor: new Date(newDate),
            status: "scheduled",
            rescheduledFromId: original.id,
          },
        }),
      ]);

      return NextResponse.json({ success: true, original: oldApt, newAppointment: newApt });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/appointments error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update appointment" }, { status: 500 });
  }
}
