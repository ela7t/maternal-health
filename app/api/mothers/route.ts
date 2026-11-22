import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethiopianToGregorian, gregorianToEthiopian, formatEthiopianDate } from "@/lib/calendar/ethiopian";
import { calculateEddFromLmp, calculateGestationalAge, calculatePostnatalAge } from "@/lib/clinical/gestational-age";
import { planSchedules } from "@/lib/scheduler/dispatcher";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { publicCode: { contains: search, mode: "insensitive" } },
        { phones: { some: { numberE164: { contains: search } } } },
      ];
    }

    if (status !== "all" && status !== "") {
      if (status === "pregnant" || status === "active_pregnant") {
        whereClause.status = "active_pregnant";
      } else if (status === "postnatal") {
        whereClause.status = "postnatal";
      } else if (status === "completed") {
        whereClause.status = "completed";
      } else if (status === "opted_out") {
        whereClause.status = "opted_out";
      } else if (status === "loss") {
        whereClause.status = "loss";
      } else {
        whereClause.status = status;
      }
    }

    const participants = await prisma.participant.findMany({
      where: whereClause,
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
      let pncFormatted = null;

      if (p.status === "postnatal") {
        const baby = activePregnancy?.babies[0];
        const dob = baby?.dateOfBirth || activePregnancy?.deliveredAt || new Date();
        const pnc = calculatePostnatalAge(dob);
        stage = pnc.formatted;
        pncFormatted = pnc.formatted;
      } else if (p.status === "loss") {
        stage = "Sensitive Loss";
      } else if (p.status === "opted_out") {
        stage = "Opted Out";
      } else if (p.status === "completed") {
        stage = "Graduated";
      } else if (activePregnancy?.eddDate) {
        ga = calculateGestationalAge(activePregnancy.eddDate);
        stage = `${ga.formatted} (T${ga.trimester})`;
      }

      return {
        id: String(p.id),
        studyCode: p.publicCode,
        fullName: p.fullName,
        kebele: p.kebele,
        phone: primaryPhone?.numberE164 || "N/A",
        phoneOwner: primaryPhone?.ownerType || "self",
        preferredLanguage: p.preferredLanguage,
        facilityName: p.facility.name,
        stage,
        ga,
        pncFormatted,
        status: p.status,
        studyArm: p.studyArm,
        activePregnancyId: activePregnancy?.id || null,
        nextAppointment: p.appointments[0]
          ? {
              id: String(p.appointments[0].id),
              visitType: p.appointments[0].kind.toUpperCase(),
              scheduledFor: p.appointments[0].scheduledFor.toISOString(),
            }
          : null,
        edd: activePregnancy?.eddDate ? activePregnancy.eddDate.toISOString() : null,
      };
    });

    return NextResponse.json(enriched);
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
      phone,
      phoneOwner,
      preferredLanguage,
      language,
      calendarType,
      lmpEthiopianYear,
      lmpEthiopianMonth,
      lmpEthiopianDay,
      ethYear,
      ethMonth,
      ethDay,
      lmpDate,
      gregLmpDate,
      framingVariant,
      studyArm,
      riskStatus,
      facilityId,
      kebele,
      initialAncDate,
      nextAncDate,
    } = body;

    const actualName = fullName?.trim();
    const actualPhone = (phoneNumber || phone)?.trim();

    if (!actualName || !actualPhone) {
      return NextResponse.json({ error: "Mother full name and phone number are required" }, { status: 400 });
    }

    // Determine LMP date
    let lmpGregorian: Date;
    const isEth = calendarType !== "gregorian";

    if (isEth) {
      const y = parseInt(ethYear || lmpEthiopianYear || "2017", 10);
      const m = parseInt(ethMonth || lmpEthiopianMonth || "1", 10);
      const d = parseInt(ethDay || lmpEthiopianDay || "1", 10);
      lmpGregorian = ethiopianToGregorian(y, m, d);
    } else {
      const gDate = lmpDate || gregLmpDate;
      if (!gDate) {
        return NextResponse.json({ error: "LMP date is required for Gregorian calendar" }, { status: 400 });
      }
      lmpGregorian = new Date(gDate);
    }

    // Calculate EDD using Naegele's rule (+280 days)
    const eddGregorian = calculateEddFromLmp(lmpGregorian);

    // Facility assignment
    let assignedFacilityId = facilityId ? parseInt(String(facilityId), 10) : null;
    if (!assignedFacilityId) {
      const defaultFacility = await prisma.facility.findFirst();
      if (!defaultFacility) {
        throw new Error("No healthcare facility registered. Please seed facilities first.");
      }
      assignedFacilityId = defaultFacility.id;
    }

    // Normalize phone number to E.164 (+251...)
    let cleanPhone = String(actualPhone).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "251" + cleanPhone.slice(1);
    else if (!cleanPhone.startsWith("251")) cleanPhone = "251" + cleanPhone;
    cleanPhone = "+" + cleanPhone;

    const phoneHash = crypto.createHash("sha256").update(cleanPhone).digest("hex");
    const publicCode = studyCode || `MOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Study arm determination
    let assignedStudyArm = "intervention_gain";
    if (studyArm) {
      assignedStudyArm = studyArm;
    } else if (framingVariant === "loss") {
      assignedStudyArm = "intervention_loss";
    }

    // Create participant, phone, pregnancy, and initial appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          facilityId: assignedFacilityId!,
          publicCode,
          fullName: actualName,
          kebele: kebele || "Kebele 01",
          studyArm: assignedStudyArm,
          preferredLanguage: language || preferredLanguage || "am",
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
          datingMethod: isEth ? "ethiopian_calendar" : "gregorian_lmp",
          riskStatus: riskStatus || "low",
          outcome: "ongoing",
        },
      });

      const ancDate = nextAncDate || initialAncDate;
      if (ancDate) {
        await tx.appointment.create({
          data: {
            participantId: participant.id,
            kind: "anc",
            scheduledFor: new Date(ancDate),
            status: "scheduled",
            recordedBy: "Enrollment Midwife",
            notes: "Initial ANC Checkup",
          },
        });
      }

      return { participant, pregnancy };
    });

    // Automatically plan messages for the newly enrolled mother
    try {
      await planSchedules();
    } catch (schedErr) {
      console.warn("Auto-scheduling warning on new mother:", schedErr);
    }

    return NextResponse.json({ success: true, participantId: result.participant.id }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/mothers error:", error);
    return NextResponse.json({ error: error?.message || "Failed to enroll mother" }, { status: 500 });
  }
}
