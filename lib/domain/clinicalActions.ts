import { prisma } from "@/lib/prisma";
import { planSchedules } from "@/lib/scheduler/dispatcher";
import { hashPhone, normalizeEthiopianPhone } from "./phone";
import {
  assertAppointmentTransition,
  assertParticipantTransition,
  DomainError,
} from "./stateMachines";

export async function recordDelivery(params: {
  participantId: number;
  deliveryDate?: string;
  deliveryPlace?: string;
  babyName?: string;
}) {
  const { participantId, deliveryDate, deliveryPlace, babyName } = params;
  const actualDelivery = deliveryDate ? new Date(deliveryDate) : new Date();
  if (Number.isNaN(actualDelivery.getTime())) {
    throw new DomainError("Invalid delivery date.", 400);
  }

  await prisma.$transaction(async (tx) => {
    const participant = await tx.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new DomainError("Participant not found.", 404);
    assertParticipantTransition(participant.status, "postnatal");

    await tx.participant.update({
      where: { id: participantId },
      data: { status: "postnatal" },
    });

    const preg = await tx.pregnancy.findFirst({
      where: { participantId, outcome: "ongoing" },
      orderBy: { id: "desc" },
    });

    if (!preg) {
      throw new DomainError("No ongoing pregnancy episode found to record delivery.", 409);
    }

    await tx.pregnancy.update({
      where: { id: preg.id },
      data: {
        outcome: "live_birth",
        deliveredAt: actualDelivery,
        deliveryPlace: deliveryPlace?.trim() || "Health Center",
      },
    });

    await tx.baby.create({
      data: {
        pregnancyId: preg.id,
        name: babyName?.trim() || "Baby",
        babyCode: `BABY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        dateOfBirth: actualDelivery,
        status: "alive",
      },
    });

    // Close open antenatal appointments so postnatal mothers never appear in ANC missed queues
    await tx.appointment.updateMany({
      where: {
        participantId,
        kind: "anc",
        status: { in: ["scheduled", "missed"] },
      },
      data: { status: "cancelled", notes: "Closed upon delivery transition to postnatal care." },
    });

    // Cancel pending antenatal SMS messages
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

  try {
    await planSchedules();
  } catch (e) {
    console.warn("Postnatal plan warning:", e);
  }
}

export async function recordVisit(params: {
  participantId: number;
  appointmentId?: number | null;
  visitKind?: string;
  visitDate?: string;
  notes?: string;
}) {
  const { participantId, appointmentId, visitKind, visitDate, notes } = params;

  return prisma.$transaction(async (tx) => {
    const participant = await tx.participant.findUnique({ where: { id: participantId } });
    if (!participant) throw new DomainError("Participant not found.", 404);
    if (!["active_pregnant", "postnatal"].includes(participant.status)) {
      throw new DomainError(
        `Cannot record clinical visit while participant status is "${participant.status}".`,
        409
      );
    }

    if (appointmentId) {
      const existing = await tx.appointment.findUnique({ where: { id: appointmentId } });
      if (!existing || existing.participantId !== participantId) {
        throw new DomainError("Appointment not found for this participant.", 404);
      }
      assertAppointmentTransition(existing.status, "attended");
      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "attended",
          recordedBy: "admin",
          notes: notes?.trim() || "Visit recorded by clinician",
        },
      });
    }

    const scheduledFor = visitDate ? new Date(visitDate) : new Date();
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new DomainError("Invalid visit date.", 400);
    }

    return tx.appointment.create({
      data: {
        participantId,
        kind: visitKind === "pnc" ? "pnc" : "anc",
        scheduledFor,
        status: "attended",
        recordedBy: "admin",
        notes: notes?.trim() || "Visit recorded by clinician",
      },
    });
  });
}

export async function updatePrimaryPhone(params: {
  participantId: number;
  phoneNumber: string;
  ownerType?: string;
}) {
  const normalized = normalizeEthiopianPhone(params.phoneNumber);
  const phoneHash = hashPhone(normalized);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.participantPhone.findFirst({
      where: { participantId: params.participantId, isPrimary: true },
    });

    if (existing) {
      await tx.participantPhone.update({
        where: { id: existing.id },
        data: {
          numberE164: normalized,
          phoneHash,
          ownerType: params.ownerType || existing.ownerType,
          failureCount: 0,
        },
      });
    } else {
      await tx.participantPhone.create({
        data: {
          participantId: params.participantId,
          numberE164: normalized,
          phoneHash,
          ownerType: params.ownerType || "self",
          isPrimary: true,
          failureCount: 0,
        },
      });
    }
  });
}
