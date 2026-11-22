import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethiopianToGregorian } from "@/lib/calendar/ethiopian";
import { calculateEddFromLmp, calculateGestationalAge } from "@/lib/clinical/gestational-age";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const participants = await prisma.participant.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { publicCode: { contains: search, mode: "insensitive" } },
              { phones: { some: { numberE164: { contains: search } } } },
            ],
          }
        : undefined,
      include: {
        facility: true,
        phones: { where: { isPrimary: true } },
        pregnancies: {
          orderBy: { id: "desc" },
          take: 1,
          include: {
            babies: true,
          },
        },
        appointments: {
          where: { status: "scheduled" },
          orderBy: { scheduledFor: "asc" },
          take: 1,
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    const enriched = participants.map((p) => {
      const activePregnancy = p.pregnancies[0] || null;
      const primaryPhone = p.phones[0] || null;
      let ga = null;
      let stage = "Unknown";

      if (p.status === "postnatal") {
        stage = "Postnatal";
      } else if (p.status === "loss") {
        stage = "Loss / Halted";
      } else if (p.status === "opted_out") {
        stage = "Opted Out";
      } else if (activePregnancy?.eddDate) {
        ga = calculateGestationalAge(activePregnancy.eddDate);
        stage = `T${ga.trimester} (${ga.weeks}w ${ga.days}d)`;
      }

      return {
        id: p.id,
        studyCode: p.publicCode,
        fullName: p.fullName,
        phone: primaryPhone?.numberE164 || "N/A",
        phoneOwner: primaryPhone?.ownerType || "self",
        preferredLanguage: p.preferredLanguage,
        facilityName: p.facility.name,
        stage,
        ga,
        status: p.status,
        activePregnancyId: activePregnancy?.id || null,
        nextAppointment: p.appointments[0]
          ? {
              id: String(p.appointments[0].id),
              visitType: p.appointments[0].kind.toUpperCase(),
              scheduledFor: p.appointments[0].scheduledFor.toISOString(),
            }
          : null,
        edd: activePregnancy?.eddDate || null,
      };
    });

    const filtered =
      status === "all"
        ? enriched
        : status === "pregnant"
        ? enriched.filter((m) => m.status === "active_pregnant")
        : status === "postnatal"
        ? enriched.filter((m) => m.status === "postnatal")
        : status === "loss"
        ? enriched.filter((m) => m.status === "loss")
        : enriched;

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error("GET /api/mothers error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load participants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      studyCode,
      phoneNumber,
      phoneOwner,
      preferredLanguage,
      lmpEthiopianYear,
      lmpEthiopianMonth,
      lmpEthiopianDay,
      framingVariant,
      facilityId,
      initialAncDate,
    } = body;

    if (!fullName || !phoneNumber || !lmpEthiopianYear || !lmpEthiopianMonth || !lmpEthiopianDay) {
      return NextResponse.json({ error: "Missing required enrollment fields" }, { status: 400 });
    }

    // Convert Ethiopian LMP to Gregorian
    const lmpGregorian = ethiopianToGregorian(
      parseInt(lmpEthiopianYear, 10),
      parseInt(lmpEthiopianMonth, 10),
      parseInt(lmpEthiopianDay, 10)
    );

    // Calculate EDD using Naegele's rule (+280 days)
    const eddGregorian = calculateEddFromLmp(lmpGregorian);

    // Get or fallback to default facility
    let assignedFacilityId = facilityId ? parseInt(facilityId, 10) : null;
    if (!assignedFacilityId) {
      const defaultFacility = await prisma.facility.findFirst();
      if (!defaultFacility) {
        throw new Error("No healthcare facility exists. Please run seed script first.");
      }
      assignedFacilityId = defaultFacility.id;
    }

    // Normalize phone number to E.164 (+251...)
    let cleanPhone = String(phoneNumber).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "251" + cleanPhone.slice(1);
    else if (!cleanPhone.startsWith("251")) cleanPhone = "251" + cleanPhone;
    cleanPhone = "+" + cleanPhone;

    const phoneHash = crypto.createHash("sha256").update(cleanPhone).digest("hex");
    const publicCode = studyCode || `MOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const studyArm = framingVariant === "loss" ? "intervention_loss" : "intervention_gain";

    // Create participant, phone, pregnancy, and initial appointment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          facilityId: assignedFacilityId!,
          publicCode,
          fullName,
          kebele: "Kebele 01",
          studyArm,
          preferredLanguage: preferredLanguage || "am",
          status: "active_pregnant",
          consentRecordedBy: "Midwife Registry Staff",
        },
      });

      await tx.participantPhone.create({
        data: {
          participantId: participant.id,
          numberE164: cleanPhone,
          phoneHash,
          ownerType: phoneOwner || "self",
          isPrimary: true,
        },
      });

      const pregnancy = await tx.pregnancy.create({
        data: {
          participantId: participant.id,
          lmpDate: lmpGregorian,
          eddDate: eddGregorian,
          datingMethod: "lmp",
          riskStatus: "low",
          outcome: "ongoing",
        },
      });

      if (initialAncDate) {
        await tx.appointment.create({
          data: {
            participantId: participant.id,
            kind: "anc",
            scheduledFor: new Date(initialAncDate),
            status: "scheduled",
            recordedBy: "Enrollment Midwife",
          },
        });
      }

      return { participant, pregnancy };
    });

    return NextResponse.json({ success: true, participantId: result.participant.id }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/mothers error:", error);
    return NextResponse.json({ error: error?.message || "Failed to enroll mother" }, { status: 500 });
  }
}
