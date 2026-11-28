import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processOptOut, processPregnancyLoss } from "@/lib/scheduler/dispatcher";
import { recordDelivery, recordVisit, updatePrimaryPhone } from "@/lib/domain/clinicalActions";
import { DomainError } from "@/lib/domain/stateMachines";
import { calculateGestationalAge, calculatePostnatalAge } from "@/lib/clinical/gestational-age";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/calendar/ethiopian";
import { sendSms } from "@/lib/sms/afromessage";
import { calculateSmsSegments } from "@/lib/sms/ucs2-segment-counter";

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
            phone: true,
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
      const eddEth = edd ? gregorianToEthiopian(edd) : null;

      if (participant.status === "active_pregnant" && edd) {
        const ga = calculateGestationalAge(edd);
        clinicalMetrics = {
          protocol: "antenatal",
          ga,
          eddGregorian: edd.toISOString().split("T")[0],
          eddEthiopian: eddEth ? formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day) : "N/A",
          eddEthObj: eddEth,
          lmpEthiopian: lmpEth ? formatEthiopianDate(lmpEth.year, lmpEth.month, lmpEth.day) : "N/A",
          riskStatus: activePregnancy.riskStatus,
          datingMethod: activePregnancy.datingMethod,
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
          deliveryPlace: activePregnancy.deliveryPlace || "Health Center",
          babies: activePregnancy.babies,
          eddGregorian: edd ? edd.toISOString().split("T")[0] : null,
          eddEthiopian: eddEth ? formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day) : "N/A",
        };
      } else if (participant.status === "loss") {
        clinicalMetrics = {
          protocol: "loss",
          outcome: activePregnancy.outcome,
          eddGregorian: edd ? edd.toISOString().split("T")[0] : null,
          eddEthiopian: eddEth ? formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day) : "N/A",
        };
      }
    }

    const primaryPhone = participant.phones.find((p) => p.isPrimary) || participant.phones[0] || null;

    return NextResponse.json({
      participant: {
        id: participant.id,
        studyCode: participant.publicCode,
        fullName: participant.fullName,
        kebele: participant.kebele,
        preferredLanguage: participant.preferredLanguage,
        studyArm: participant.studyArm,
        status: participant.status,
        createdAt: participant.enrolledAt,
        facility: participant.facility,
        primaryPhone: primaryPhone
          ? {
              id: primaryPhone.id,
              phoneNumber: primaryPhone.numberE164,
              ownerType: primaryPhone.ownerType,
            }
          : null,
        phones: participant.phones.map((p) => ({
          id: p.id,
          phoneNumber: p.numberE164,
          ownerType: p.ownerType,
          isPrimary: p.isPrimary,
        })),
        appointments: participant.appointments.map((a) => ({
          id: a.id,
          kind: a.kind,
          visitType: a.kind === "anc" ? "Antenatal Checkup" : "Postnatal Checkup",
          scheduledFor: a.scheduledFor,
          status: a.status,
          recordedBy: a.recordedBy || "Clinic Staff",
          notes: a.notes || "Routine Visit",
        })),
        outboxMessages: participant.outboxMessages.map((m) => ({
          id: m.id,
          messageBody: m.messageContent,
          segments: m.segments,
          scheduledFor: m.scheduledAt,
          sentAt: m.sentAt,
          status: m.status,
          deliveryStatus: m.deliveryEvents[0]?.mappedStatus || m.status,
          templateCode: m.variant?.template.code || "CUSTOM",
          clinicalStage: m.variant?.template.stream || "antenatal",
          gatewayMessageId: m.gatewayMsgId,
        })),
      },
      activePregnancy: activePregnancy
        ? {
            id: activePregnancy.id,
            status: participant.status,
            framingVariant: participant.studyArm.includes("loss") ? "loss" : "gain",
            estimatedDeliveryDate: activePregnancy.eddDate,
            deliveredAt: activePregnancy.deliveredAt,
            deliveryPlace: activePregnancy.deliveryPlace,
            riskStatus: activePregnancy.riskStatus,
            babies: activePregnancy.babies,
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
    const {
      action,
      deliveryDate,
      deliveryPlace,
      babyName,
      lossReason,
      customMessage,
      appointmentId,
      contactType,
      visitKind,
      visitDate,
      visitTime,
      attendedDate,
      attendedTime,
      attendanceStatus,
      notes,
      phoneNumber,
      ownerType,
    } = body;

    // 1. Record Delivery
    if (action === "record_delivery") {
      await recordDelivery({ participantId, deliveryDate, deliveryPlace, babyName });
      return NextResponse.json({ success: true, message: "Delivery recorded successfully" });
    }

    // 2. Record Sensitive Loss
    if (action === "record_loss") {
      await processPregnancyLoss(participantId, lossReason || "Clinician recorded pregnancy loss");
      return NextResponse.json({
        success: true,
        message: "Sensitive loss protocol activated. All scheduled messages cancelled immediately.",
      });
    }

    // 3. Opt-Out
    if (action === "opt_out") {
      await processOptOut(participantId, "web_ui", "Staff recorded participant opt-out request");
      return NextResponse.json({ success: true, message: "Participant successfully opted out" });
    }

    // 4. Send Custom / Immediate SMS
    if (action === "send_sms") {
      if (!customMessage || !customMessage.trim()) {
        return NextResponse.json({ error: "Message text cannot be empty" }, { status: 400 });
      }

      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { phones: { where: { isPrimary: true } } },
      });
      if (!participant) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }
      if (["opted_out", "loss"].includes(participant.status)) {
        return NextResponse.json(
          { error: `Cannot send SMS while participant status is "${participant.status}".` },
          { status: 409 }
        );
      }

      const phone = participant.phones[0];
      if (!phone) {
        return NextResponse.json({ error: "No primary phone registered for this mother" }, { status: 400 });
      }

      const segments = calculateSmsSegments(customMessage.trim());
      const sendResult = await sendSms(phone.numberE164, customMessage.trim());

      const outbox = await prisma.outboxMessage.create({
        data: {
          participantId,
          phoneId: phone.id,
          messageContent: customMessage.trim(),
          segments: segments.segmentCount,
          status: sendResult.successful ? "sent" : "failed",
          scheduledAt: new Date(),
          sentAt: sendResult.successful ? new Date() : null,
          gatewayMsgId: sendResult.gatewayMessageId || null,
          failureReason: sendResult.errorMessage || null,
          idempotencyKey: `MANUAL_SMS_${participantId}_${Date.now()}`,
          callbackToken: `manual_token_${Date.now()}`,
          deliveryEvents: sendResult.successful
            ? {
                create: {
                  rawStatus: "SENT",
                  mappedStatus: "sent",
                  rawPayload: { gatewayId: sendResult.gatewayMessageId },
                },
              }
            : undefined,
        },
      });

      return NextResponse.json({
        success: sendResult.successful,
        messageId: sendResult.gatewayMessageId,
        outboxId: outbox.id,
        error: sendResult.errorMessage,
      });
    }

    // 5. Record Clinical Encounter / Visit
    if (action === "record_visit") {
      const apt = await recordVisit({
        participantId,
        appointmentId: appointmentId ? Number(appointmentId) : null,
        contactType,
        visitKind,
        visitDate,
        visitTime,
        attendedDate,
        attendedTime,
        attendanceStatus,
        notes,
      });
      return NextResponse.json({ success: true, appointment: apt });
    }

    // 6. Update Primary Phone Number
    if (action === "update_phone") {
      await updatePrimaryPhone({ participantId, phoneNumber, ownerType });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/mothers/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update participant" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return POST(request, props);
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const participantId = parseInt(params.id, 10);
    if (isNaN(participantId)) {
      return NextResponse.json({ error: "Invalid participant ID" }, { status: 400 });
    }
    await prisma.participant.delete({ where: { id: participantId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/mothers/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete participant" }, { status: 500 });
  }
}
