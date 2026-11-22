import { prisma } from "@/lib/prisma";
import { calculateGestationalAge, calculatePostnatalAge, isOverdue } from "@/lib/clinical/gestational-age";
import { calculateSmsSegments } from "@/lib/sms/ucs2-segment-counter";
import { sendSms } from "@/lib/sms/afromessage";
import crypto from "crypto";

export interface PlanSchedulesResult {
  educationalQueued: number;
  remindersQueued: number;
  overdueFlagged: number;
  missedFlagged: number;
}

export interface DispatchMessagesResult {
  sent: number;
  failed: number;
  retried: number;
}

/**
 * Calculates the next preferred dispatch window (8:00 AM - 10:00 AM or 7:00 PM Addis Ababa Time).
 */
export function getNextSendWindow(now: Date = new Date()): Date {
  // Convert to East Africa Time (UTC+3)
  const eatOffset = 3 * 60;
  const localTime = new Date(now.getTime() + (now.getTimezoneOffset() + eatOffset) * 60000);
  const hour = localTime.getHours();

  const target = new Date(localTime);
  target.setMinutes(0);
  target.setSeconds(0);
  target.setMilliseconds(0);

  if (hour < 8) {
    target.setHours(8);
  } else if (hour >= 8 && hour < 10) {
    return now; // Active morning window
  } else if (hour < 19) {
    target.setHours(19);
  } else {
    // After 7:00 PM, queue for next morning 8:00 AM
    target.setDate(target.getDate() + 1);
    target.setHours(8);
  }

  // Convert back to UTC date
  return new Date(target.getTime() - (now.getTimezoneOffset() + eatOffset) * 60000);
}

/**
 * Plans educational and reminder schedules for all active cohort participants.
 */
export async function planSchedules(asOf: Date = new Date()): Promise<PlanSchedulesResult> {
  let educationalQueued = 0;
  let remindersQueued = 0;
  let overdueFlagged = 0;
  let missedFlagged = 0;

  // 1. Process Active Pregnant Participants
  const pregnantMothers = await prisma.participant.findMany({
    where: { status: "active_pregnant" },
    include: {
      pregnancies: { orderBy: { id: "desc" }, take: 1 },
      phones: true,
      facility: true,
    },
  });

  for (const mother of pregnantMothers) {
    const pregnancy = mother.pregnancies[0];
    if (!pregnancy || !pregnancy.eddDate) continue;

    // Check overdue (> EDD + 14 days)
    if (isOverdue(pregnancy.eddDate, asOf)) {
      overdueFlagged++;
      continue;
    }

    const ga = calculateGestationalAge(pregnancy.eddDate, asOf);
    const currentWeek = ga.weeks;

    // Find approved educational templates covering this gestational week
    const templates = await prisma.messageTemplate.findMany({
      where: {
        stream: "educational",
        approvalStatus: "approved",
        gaFromWeeks: { lte: currentWeek },
        gaToWeeks: { gte: currentWeek },
      },
      include: { variants: true },
    });

    for (const template of templates) {
      if (template.riskFilter && template.riskFilter !== pregnancy.riskStatus) {
        continue;
      }

      const idempotencyKey = `MOM_${mother.id}_GA_W${currentWeek}_${template.code}`;
      const existing = await prisma.outboxMessage.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      // Select variant matching language and framing
      const lang = mother.preferredLanguage || "am";
      const framing = mother.studyArm === "intervention_loss" ? "loss" : "gain";
      const variant =
        template.variants.find((v) => v.language === lang && v.framing === framing) ||
        template.variants.find((v) => v.language === lang) ||
        template.variants[0];

      if (!variant) continue;

      const phone = mother.phones.find((p) => p.isPrimary) || mother.phones[0];
      if (!phone) continue;

      const scheduledAt = getNextSendWindow(asOf);
      const segmentInfo = calculateSmsSegments(variant.body);
      const callbackToken = crypto.randomBytes(16).toString("hex");

      await prisma.outboxMessage.create({
        data: {
          participantId: mother.id,
          phoneId: phone.id,
          variantId: variant.id,
          idempotencyKey,
          scheduledAt,
          status: "pending",
          callbackToken,
          segments: segmentInfo.segmentCount,
          messageContent: variant.body,
        },
      });

      educationalQueued++;
    }
  }

  // 2. Process Postnatal Participants (through Day 42)
  const postnatalMothers = await prisma.participant.findMany({
    where: { status: "postnatal" },
    include: {
      pregnancies: { orderBy: { id: "desc" }, take: 1 },
      phones: true,
      facility: true,
    },
  });

  for (const mother of postnatalMothers) {
    const pregnancy = mother.pregnancies[0];
    if (!pregnancy || !pregnancy.deliveredAt) continue;

    const pnc = calculatePostnatalAge(pregnancy.deliveredAt, asOf);
    if (pnc.isCompleted) {
      await prisma.participant.update({
        where: { id: mother.id },
        data: { status: "completed" },
      });
      continue;
    }

    const currentDay = pnc.days;
    const pncTemplates = await prisma.messageTemplate.findMany({
      where: {
        stream: "educational",
        approvalStatus: "approved",
        pncDayFrom: { lte: currentDay },
        pncDayTo: { gte: currentDay },
      },
      include: { variants: true },
    });

    for (const template of pncTemplates) {
      const idempotencyKey = `MOM_${mother.id}_PNC_D${currentDay}_${template.code}`;
      const existing = await prisma.outboxMessage.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      const lang = mother.preferredLanguage || "am";
      const framing = mother.studyArm === "intervention_loss" ? "loss" : "gain";
      const variant =
        template.variants.find((v) => v.language === lang && v.framing === framing) ||
        template.variants.find((v) => v.language === lang) ||
        template.variants[0];

      if (!variant) continue;
      const phone = mother.phones.find((p) => p.isPrimary) || mother.phones[0];
      if (!phone) continue;

      const scheduledAt = getNextSendWindow(asOf);
      const segmentInfo = calculateSmsSegments(variant.body);
      const callbackToken = crypto.randomBytes(16).toString("hex");

      await prisma.outboxMessage.create({
        data: {
          participantId: mother.id,
          phoneId: phone.id,
          variantId: variant.id,
          idempotencyKey,
          scheduledAt,
          status: "pending",
          callbackToken,
          segments: segmentInfo.segmentCount,
          messageContent: variant.body,
        },
      });

      educationalQueued++;
    }
  }

  // 3. Process ANC / PNC 72-Hour Appointment Reminders
  const windowStart = asOf;
  const windowEnd = new Date(asOf.getTime() + 72 * 60 * 60 * 1000);

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { gte: windowStart, lte: windowEnd },
      participant: { status: { in: ["active_pregnant", "postnatal"] } },
    },
    include: {
      participant: { include: { phones: true, facility: true } },
    },
  });

  for (const apt of upcomingAppointments) {
    const mother = apt.participant;
    const idempotencyKey = `MOM_${mother.id}_REMIND_APT_${apt.id}_72H`;
    const existing = await prisma.outboxMessage.findUnique({ where: { idempotencyKey } });
    if (existing) continue;

    const stream = apt.kind === "pnc" ? "pnc_reminder" : "anc_reminder";
    const template = await prisma.messageTemplate.findFirst({
      where: { stream, approvalStatus: "approved" },
      include: { variants: true },
    });

    const lang = mother.preferredLanguage || "am";
    const variant = template?.variants.find((v) => v.language === lang) || template?.variants[0];

    let content = variant?.body;
    if (!content) {
      content = `ማስታወሻ፡ የጤና ቀጠሮዎ በቅርቡ ነው። እባክዎ በቀጠሮዎ ቀን ወደ ${mother.facility?.name || "ጤና ጣቢያ"} ይምጡ።`;
    }

    const phone = mother.phones.find((p) => p.isPrimary) || mother.phones[0];
    if (!phone) continue;

    const scheduledAt = getNextSendWindow(asOf);
    const segmentInfo = calculateSmsSegments(content);
    const callbackToken = crypto.randomBytes(16).toString("hex");

    await prisma.outboxMessage.create({
      data: {
        participantId: mother.id,
        phoneId: phone.id,
        variantId: variant?.id,
        idempotencyKey,
        scheduledAt,
        status: "pending",
        callbackToken,
        segments: segmentInfo.segmentCount,
        messageContent: content,
      },
    });

    remindersQueued++;
  }

  // 4. Detect Missed Appointments & Queue Rescheduling SMS
  const missedCutoff = new Date(asOf.getTime() - 24 * 60 * 60 * 1000);
  const pastDueAppointments = await prisma.appointment.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { lt: missedCutoff },
      participant: { status: { in: ["active_pregnant", "postnatal"] } },
    },
    include: {
      participant: { include: { phones: true, facility: true } },
    },
  });

  for (const missedApt of pastDueAppointments) {
    await prisma.appointment.update({
      where: { id: missedApt.id },
      data: { status: "missed" },
    });

    missedFlagged++;
    const mother = missedApt.participant;
    const rescheduleKey = `MOM_${mother.id}_RESCHEDULE_APT_${missedApt.id}`;
    const existing = await prisma.outboxMessage.findUnique({ where: { idempotencyKey: rescheduleKey } });
    if (existing) continue;

    const reschedTemplate = await prisma.messageTemplate.findFirst({
      where: { stream: "reschedule", approvalStatus: "approved" },
      include: { variants: true },
    });

    const lang = mother.preferredLanguage || "am";
    const variant = reschedTemplate?.variants.find((v) => v.language === lang) || reschedTemplate?.variants[0];

    let body = variant?.body;
    if (!body) {
      body = `ያለፈውን የጤና ቀጠሮዎን አላገኙም። እባክዎ አዲስ የቀጠሮ ቀን ለማስያዝ ወደ ${mother.facility?.name || "ጤና ጣቢያ"} በአስቸኳይ ይምጡ።`;
    }

    const phone = mother.phones.find((p) => p.isPrimary) || mother.phones[0];
    if (!phone) continue;

    const scheduledAt = getNextSendWindow(asOf);
    const segmentInfo = calculateSmsSegments(body);
    const callbackToken = crypto.randomBytes(16).toString("hex");

    await prisma.outboxMessage.create({
      data: {
        participantId: mother.id,
        phoneId: phone.id,
        variantId: variant?.id,
        idempotencyKey: rescheduleKey,
        scheduledAt,
        status: "pending",
        callbackToken,
        segments: segmentInfo.segmentCount,
        messageContent: body,
      },
    });
  }

  return {
    educationalQueued,
    remindersQueued,
    overdueFlagged,
    missedFlagged,
  };
}

/**
 * Dispatches queued messages due for transmission to AfroMessage gateway.
 */
export async function dispatchPendingMessages(asOf: Date = new Date()): Promise<DispatchMessagesResult> {
  const pendingMessages = await prisma.outboxMessage.findMany({
    where: {
      status: { in: ["pending", "queued"] },
      scheduledAt: { lte: asOf },
    },
    include: {
      phone: true,
      participant: true,
    },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const outbox of pendingMessages) {
    // Safety: Skip opted-out or loss
    if (["opted_out", "loss"].includes(outbox.participant.status)) {
      await prisma.outboxMessage.update({
        where: { id: outbox.id },
        data: {
          status: "cancelled",
          failureReason: "Participant opted out or had pregnancy loss.",
        },
      });
      continue;
    }

    const phone = outbox.phone;
    if (!phone || !phone.numberE164) {
      await prisma.outboxMessage.update({
        where: { id: outbox.id },
        data: {
          status: "failed",
          failureReason: "No valid E.164 phone number.",
        },
      });
      failed++;
      continue;
    }

    const result = await sendSms(phone.numberE164, outbox.messageContent, outbox.callbackToken);

    // Record Delivery Event
    await prisma.deliveryEvent.create({
      data: {
        outboxId: outbox.id,
        rawStatus: result.status,
        mappedStatus: result.status,
        rawPayload: result.rawPayload as any,
      },
    });

    if (result.successful) {
      await prisma.outboxMessage.update({
        where: { id: outbox.id },
        data: {
          status: "submitted",
          gatewayMsgId: result.gatewayMessageId,
          sentAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      sent++;
    } else {
      const newAttempts = outbox.attempts + 1;
      await prisma.participantPhone.update({
        where: { id: phone.id },
        data: { failureCount: { increment: 1 } },
      });

      if (newAttempts < 3) {
        // Exponential retry backoff: 15min, 45min
        const delayMin = newAttempts * 15;
        const nextTry = new Date(Date.now() + delayMin * 60000);

        await prisma.outboxMessage.update({
          where: { id: outbox.id },
          data: {
            status: "queued",
            attempts: newAttempts,
            scheduledAt: nextTry,
            failureReason: result.errorMessage,
          },
        });
        retried++;
      } else {
        await prisma.outboxMessage.update({
          where: { id: outbox.id },
          data: {
            status: "failed",
            attempts: newAttempts,
            failureReason: result.errorMessage,
          },
        });
        failed++;
      }
    }
  }

  return { sent, failed, retried };
}

/**
 * Halts all automated messages on Opt-Out.
 */
export async function processOptOut(
  participantId: number,
  source: string = "sms_reply",
  reason?: string
): Promise<void> {
  await prisma.participant.update({
    where: { id: participantId },
    data: { status: "opted_out" },
  });

  await prisma.optOut.create({
    data: {
      participantId,
      source,
      reason,
    },
  });

  // Cancel all pending or queued messages
  await prisma.outboxMessage.updateMany({
    where: {
      participantId,
      status: { in: ["pending", "queued"] },
    },
    data: {
      status: "cancelled",
      failureReason: "Cancelled due to participant opt-out.",
    },
  });
}

/**
 * Halts all automated messages on sensitive pregnancy loss / neonatal mortality.
 */
export async function processPregnancyLoss(
  participantId: number,
  lossOutcome: string
): Promise<void> {
  await prisma.participant.update({
    where: { id: participantId },
    data: { status: "loss" },
  });

  const preg = await prisma.pregnancy.findFirst({
    where: { participantId },
    orderBy: { id: "desc" },
  });

  if (preg) {
    await prisma.pregnancy.update({
      where: { id: preg.id },
      data: { outcome: lossOutcome },
    });
  }

  // Cancel all pending messages immediately
  await prisma.outboxMessage.updateMany({
    where: {
      participantId,
      status: { in: ["pending", "queued"] },
    },
    data: {
      status: "cancelled",
      failureReason: "Emergency halt due to pregnancy loss / neonatal mortality.",
    },
  });
}
