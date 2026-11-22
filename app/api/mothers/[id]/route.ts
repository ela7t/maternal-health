import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPregnancyLoss } from "@/lib/scheduler/dispatcher";
import { calculateGestationalAge, calculatePostnatalAge } from "@/lib/clinical/gestational-age";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/calendar/ethiopian";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const participantId = parseInt(params.id, 10);
    if (isNaN(participantId)) {
      return NextResponse.json({ error: "Invalid participant ID" }, { status: 400 });
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        facility: true,
        phones: true,
        optOuts: true,
        appointments: {
          orderBy: { scheduledFor: "asc" },
        },
        pregnancies: {
          orderBy: { id: "desc" },
          take: 1,
          include: {
            babies: true,
          },
        },
        outboxMessages: {
          orderBy: { scheduledAt: "desc" },
          take: 50,
          include: {
            variant: {
              include: { template: true },
            },
            deliveryEvents: {
              orderBy: { id: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const activePregnancy = participant.pregnancies[0] || null;
    let clinicalMetrics: any = null;

    if (activePregnancy) {
      const edd = activePregnancy.eddDate;
      const lmp = activePregnancy.lmpDate;
      const lmpEth = lmp ? gregorianToEthiopian(lmp) : null;
      const eddEth = gregorianToEthiopian(edd);

      if (participant.status === "active_pregnant") {
        const ga = calculateGestationalAge(edd);
        clinicalMetrics = {
          protocol: "antenatal",
          ga,
          eddGregorian: edd.toISOString().split("T")[0],
          eddEthiopian: formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day),
          lmpEthiopian: lmpEth ? formatEthiopianDate(lmpEth.year, lmpEth.month, lmpEth.day) : "N/A",
        };
      } else if (participant.status === "postnatal") {
        const baby = activePregnancy.babies[0];
        const dob = baby?.dateOfBirth || activePregnancy.deliveredAt || new Date();
        const pna = calculatePostnatalAge(dob);
        clinicalMetrics = {
          protocol: "postnatal",
          postnatalAge: pna,
          birthDate: dob.toISOString().split("T")[0],
          outcome: activePregnancy.outcome || "Live Birth",
        };
      } else if (participant.status === "loss") {
        clinicalMetrics = {
          protocol: "loss",
          outcome: activePregnancy.outcome,
        };
      }
    }

    return NextResponse.json({
      participant: {
        id: participant.id,
        studyCode: participant.publicCode,
        fullName: participant.fullName,
        preferredLanguage: participant.preferredLanguage,
        status: participant.status,
        createdAt: participant.enrolledAt,
        facility: participant.facility,
        phones: participant.phones.map((p) => ({
          id: p.id,
          phoneNumber: p.numberE164,
          ownerType: p.ownerType,
          isPrimary: p.isPrimary,
        })),
        appointments: participant.appointments.map((a) => ({
          id: a.id,
          visitType: a.kind.toUpperCase(),
          scheduledFor: a.scheduledFor,
          status: a.status,
        })),
        outboxMessages: participant.outboxMessages.map((m) => ({
          id: m.id,
          messageBody: m.messageContent,
          scheduledFor: m.scheduledAt,
          status: m.status,
          deliveryStatus: m.deliveryEvents[0]?.mappedStatus || m.status,
          templateCode: m.variant?.template.code || "CUSTOM",
          clinicalStage: m.variant?.template.stream || "antenatal",
        })),
      },
      activePregnancy: activePregnancy
        ? {
            id: activePregnancy.id,
            status: participant.status,
            framingVariant: participant.studyArm.includes("loss") ? "loss" : "gain",
            estimatedDeliveryDate: activePregnancy.eddDate,
          }
        : null,
      clinicalMetrics,
    });
  } catch (error: any) {
    console.error("GET /api/mothers/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load participant" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const participantId = parseInt(params.id, 10);
    if (isNaN(participantId)) {
      return NextResponse.json({ error: "Invalid participant ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, deliveryDate, lossReason } = body;

    if (action === "record_delivery") {
      const actualDelivery = deliveryDate ? new Date(deliveryDate) : new Date();

      await prisma.$transaction(async (tx) => {
        // Update participant status to postnatal
        await tx.participant.update({
          where: { id: participantId },
          data: { status: "postnatal" },
        });

        // Update pregnancy
        const preg = await tx.pregnancy.findFirst({
          where: { participantId },
          orderBy: { id: "desc" },
        });

        if (preg) {
          await tx.pregnancy.update({
            where: { id: preg.id },
            data: {
              outcome: "live_birth",
              deliveredAt: actualDelivery,
            },
          });

          // Create baby record
          await tx.baby.create({
            data: {
              pregnancyId: preg.id,
              babyCode: `BABY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              dateOfBirth: actualDelivery,
              status: "alive",
            },
          });
        }

        // Cancel pending antenatal messages
        await tx.outboxMessage.updateMany({
          where: {
            participantId,
            status: { in: ["pending", "queued"] },
          },
          data: {
            status: "cancelled",
            failureReason: "Cancelled due to delivery transition to postnatal care.",
          },
        });
      });

      return NextResponse.json({ success: true, message: "Delivery recorded successfully" });
    }

    if (action === "record_loss") {
      await processPregnancyLoss(participantId, lossReason || "Clinician recorded pregnancy loss");
      return NextResponse.json({
        success: true,
        message: "Sensitive loss protocol activated. All scheduled messages cancelled immediately.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/mothers/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update participant" }, { status: 500 });
  }
}
