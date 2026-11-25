import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") || "csv";

  const [
    activeWomen,
    totalAnc,
    attendedAnc,
    totalBirths,
    facilityBirths,
    pncAttended,
    totalSms,
    deliveredSms,
    optedOut,
  ] = await Promise.all([
    prisma.participant.count({ where: { status: { in: ["active_pregnant", "postnatal"] } } }),
    prisma.appointment.count({ where: { kind: "anc" } }),
    prisma.appointment.count({ where: { kind: "anc", status: "attended" } }),
    prisma.pregnancy.count({ where: { deliveredAt: { not: null } } }),
    prisma.pregnancy.count({ where: { deliveredAt: { not: null }, deliveryPlace: { not: null } } }),
    prisma.appointment.count({ where: { kind: "pnc", status: "attended" } }),
    prisma.outboxMessage.count(),
    prisma.outboxMessage.count({ where: { status: { in: ["sent", "delivered", "submitted"] } } }),
    prisma.participant.count({ where: { status: "opted_out" } }),
  ]);

  const rows = [
    {
      indicator: "Active Enrolled Mothers",
      numerator: activeWomen,
      denominator: null,
      rate_pct: null,
    },
    {
      indicator: "ANC Contacts Attended",
      numerator: attendedAnc,
      denominator: totalAnc,
      rate_pct: totalAnc > 0 ? Math.round((attendedAnc / totalAnc) * 100) : null,
    },
    {
      indicator: "Facility Births Share",
      numerator: facilityBirths,
      denominator: totalBirths,
      rate_pct: totalBirths > 0 ? Math.round((facilityBirths / totalBirths) * 100) : null,
    },
    {
      indicator: "PNC Contacts Attended",
      numerator: pncAttended,
      denominator: totalBirths,
      rate_pct: totalBirths > 0 ? Math.min(100, Math.round((pncAttended / totalBirths) * 100)) : null,
    },
    {
      indicator: "SMS Delivery Rate",
      numerator: deliveredSms,
      denominator: totalSms,
      rate_pct: totalSms > 0 ? Math.round((deliveredSms / totalSms) * 100) : null,
    },
    {
      indicator: "Opt-Out Count",
      numerator: optedOut,
      denominator: null,
      rate_pct: null,
    },
  ];

  if (format === "json") {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        deidentified: true,
        indicators: rows,
      },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="mnh_indicators_report.json"',
        },
      }
    );
  }

  const csvLines = [
    "Indicator,Numerator,Denominator,Rate (%)",
    ...rows.map(
      (r) =>
        `"${r.indicator}",${r.numerator},${r.denominator ?? ""},${r.rate_pct ?? ""}`
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mnh_indicators_report.csv"',
    },
  });
}
