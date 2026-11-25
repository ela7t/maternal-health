import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") || "csv";
  const facilityParam = req.nextUrl.searchParams.get("facility_id");
  const facilityId = facilityParam ? parseInt(facilityParam, 10) : null;
  const participantWhere = facilityId && !Number.isNaN(facilityId) ? { facilityId } : {};

  const participants = await prisma.participant.findMany({
    where: participantWhere,
    include: {
      facility: true,
      pregnancies: { orderBy: { id: "desc" }, take: 1 },
      appointments: true,
      outboxMessages: true,
    },
    orderBy: { id: "asc" },
  });

  const activeWomen = participants.filter((p) =>
    ["active_pregnant", "postnatal"].includes(p.status)
  ).length;
  const allApts = participants.flatMap((p) => p.appointments);
  const ancApts = allApts.filter((a) => a.kind === "anc");
  const attendedAnc = ancApts.filter((a) => a.status === "attended").length;
  const allPregs = participants.flatMap((p) => p.pregnancies);
  const deliveries = allPregs.filter((pr) => pr.deliveredAt !== null);
  const facilityBirths = deliveries.filter((pr) => Boolean(pr.deliveryPlace)).length;
  const pncAttended = allApts.filter((a) => a.kind === "pnc" && a.status === "attended").length;
  const allSms = participants.flatMap((p) => p.outboxMessages);
  const deliveredSms = allSms.filter((m) =>
    ["sent", "delivered", "submitted"].includes(m.status)
  ).length;
  const optedOut = participants.filter((p) => p.status === "opted_out").length;

  const indicators = [
    { indicator: "Active Enrolled Mothers", numerator: activeWomen, denominator: null, rate_pct: null },
    {
      indicator: "ANC Contacts On Time",
      numerator: attendedAnc,
      denominator: ancApts.length,
      rate_pct: ancApts.length > 0 ? Math.round((attendedAnc / ancApts.length) * 1000) / 10 : 0,
    },
    {
      indicator: "Institutional / Facility Births Share",
      numerator: facilityBirths,
      denominator: deliveries.length,
      rate_pct: deliveries.length > 0 ? Math.round((facilityBirths / deliveries.length) * 1000) / 10 : 0,
    },
    {
      indicator: "PNC Contact within 7 Days of Birth",
      numerator: pncAttended,
      denominator: deliveries.length,
      rate_pct: deliveries.length > 0 ? Math.min(100, Math.round((pncAttended / deliveries.length) * 1000) / 10) : 0,
    },
    {
      indicator: "SMS Telephony Delivery Rate",
      numerator: deliveredSms,
      denominator: allSms.length,
      rate_pct: allSms.length > 0 ? Math.round((deliveredSms / allSms.length) * 1000) / 10 : 0,
    },
    {
      indicator: "Participant SMS Opt-Out Rate",
      numerator: optedOut,
      denominator: participants.length,
      rate_pct: participants.length > 0 ? Math.round((optedOut / participants.length) * 1000) / 10 : 0,
    },
  ];

  const cohortMicrodata = participants.map((p) => {
    const preg = p.pregnancies[0];
    return {
      study_code: p.publicCode,
      facility: p.facility.name,
      status: p.status,
      language: p.preferredLanguage,
      study_arm: p.studyArm,
      risk_status: preg?.riskStatus || "standard",
      anc_attended: p.appointments.filter((a) => a.kind === "anc" && a.status === "attended").length,
      pnc_attended: p.appointments.filter((a) => a.kind === "pnc" && a.status === "attended").length,
      delivered: Boolean(preg?.deliveredAt),
    };
  });

  if (format === "json") {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        deidentified: true,
        indicators,
        cohort: cohortMicrodata,
      },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="mnh_research_dataset.json"',
        },
      }
    );
  }

  if (format === "microdata_csv") {
    const lines = [
      "StudyCode,Facility,Status,Language,StudyArm,RiskStatus,ANCAttended,PNCAttended,Delivered",
      ...cohortMicrodata.map(
        (c) =>
          `"${c.study_code}","${c.facility}","${c.status}","${c.language}","${c.study_arm}","${c.risk_status}",${c.anc_attended},${c.pnc_attended},${c.delivered}`
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mnh_cohort_microdata.csv"',
      },
    });
  }

  const csvLines = [
    "Indicator,Numerator,Denominator,Rate (%)",
    ...indicators.map(
      (r) => `"${r.indicator}",${r.numerator},${r.denominator ?? ""},${r.rate_pct ?? ""}`
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        format === "xlsx"
          ? 'attachment; filename="mnh_indicators_workbook.csv"'
          : 'attachment; filename="mnh_indicators_summary.csv"',
    },
  });
}
