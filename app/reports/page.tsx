import prisma from "@/lib/prisma";
import { calculateGestationalAge } from "@/lib/ethiopianCalendar";
import {
  ReportsClient,
  BenchmarkRow,
  CascadeMilestone,
  RiskStageRow,
} from "./ReportsClient";

export const dynamic = "force-dynamic";

const MILESTONE_LABELS = [
  "ANC 1 (16w)",
  "ANC 2 (20w)",
  "ANC 3 (26w)",
  "ANC 4 (30w)",
  "ANC 5 (34w)",
  "ANC 6 (36w)",
  "ANC 7 (38w)",
  "ANC 8 (42w)",
  "PNC 1 (48h)",
  "PNC 2 (7-14d)",
  "PNC 3 (6w)",
];

export default async function ReportsPage() {
  const participants = await prisma.participant.findMany({
    include: {
      pregnancies: { orderBy: { id: "desc" }, take: 1 },
      appointments: { orderBy: { scheduledFor: "asc" } },
      outboxMessages: true,
    },
  });
  const activeWomen = participants.filter((p) =>
    ["active_pregnant", "postnatal"].includes(p.status)
  ).length;
  const optedOutCount = participants.filter((p) => p.status === "opted_out").length;

  const allApts = participants.flatMap((p) => p.appointments);
  const ancApts = allApts.filter((a) => a.kind === "anc");
  const attendedAnc = ancApts.filter((a) => a.status === "attended").length;
  const missedApts = allApts.filter((a) => a.status === "missed");
  const tracedMissed = missedApts.filter((a) => a.status === "rescheduled").length;

  const allPregs = participants.flatMap((p) => p.pregnancies);
  const deliveredPregs = allPregs.filter((pr) => pr.deliveredAt !== null);
  const facilityBirths = deliveredPregs.filter((pr) => Boolean(pr.deliveryPlace)).length;
  const anc4Count = participants.filter(
    (p) =>
      p.pregnancies[0]?.deliveredAt &&
      p.appointments.filter((a) => a.kind === "anc" && a.status === "attended").length >= 4
  ).length;
  const anc8Count = participants.filter(
    (p) =>
      p.pregnancies[0]?.deliveredAt &&
      p.appointments.filter((a) => a.kind === "anc" && a.status === "attended").length >= 8
  ).length;

  const pncAttended = allApts.filter((a) => a.kind === "pnc" && a.status === "attended").length;
  const allSms = participants.flatMap((p) => p.outboxMessages);
  const deliveredSms = allSms.filter((m) =>
    ["sent", "delivered", "submitted"].includes(m.status)
  ).length;

  const pct = (num: number, den: number) =>
    den > 0 ? Math.min(100, Math.round((num / den) * 1000) / 10) : 0;

  const benchmarks: BenchmarkRow[] = [
    {
      label: "ANC Contacts On Time (attended ≤ 7 days of scheduled date)",
      shortLabel: "ANC On-Time (≤ 7d)",
      numerator: attendedAnc,
      denominator: ancApts.length,
      ratePct: pct(attendedAnc, ancApts.length),
      whoTarget: 80,
      whoTargetDisplay: "80%",
      edhsBaseline: 34,
      edhsDisplay: "34%",
    },
    {
      label: "Women with ≥ 4 ANC Contacts by Delivery",
      shortLabel: "≥ 4 ANC Contacts",
      numerator: anc4Count,
      denominator: deliveredPregs.length,
      ratePct: pct(anc4Count, deliveredPregs.length),
      whoTarget: 85,
      whoTargetDisplay: "85%",
      edhsBaseline: 43,
      edhsDisplay: "43%",
    },
    {
      label: "Women with ≥ 8 ANC Contacts (WHO 2016 Guideline)",
      shortLabel: "≥ 8 ANC Contacts",
      numerator: anc8Count,
      denominator: deliveredPregs.length,
      ratePct: pct(anc8Count, deliveredPregs.length),
      whoTarget: 60,
      whoTargetDisplay: "60%",
      edhsBaseline: 18,
      edhsDisplay: "18%",
    },
    {
      label: "Missed Visits Followed Up / Traced (≤ 7 days)",
      shortLabel: "Missed Visits Followed Up",
      numerator: tracedMissed,
      denominator: missedApts.length,
      ratePct: pct(tracedMissed, missedApts.length),
      whoTarget: 75,
      whoTargetDisplay: "75%",
      edhsBaseline: 25,
      edhsDisplay: "25%",
    },
    {
      label: "Institutional / Facility Births Share",
      shortLabel: "Facility Births Share",
      numerator: facilityBirths,
      denominator: deliveredPregs.length,
      ratePct: pct(facilityBirths, deliveredPregs.length),
      whoTarget: 90,
      whoTargetDisplay: "90%",
      edhsBaseline: 48,
      edhsDisplay: "48%",
    },
    {
      label: "PNC Contact within 7 Days of Birth",
      shortLabel: "PNC within 7 Days",
      numerator: pncAttended,
      denominator: deliveredPregs.length,
      ratePct: pct(pncAttended, deliveredPregs.length),
      whoTarget: 85,
      whoTargetDisplay: "85%",
      edhsBaseline: 34,
      edhsDisplay: "34%",
    },
    {
      label: "SMS Telephony Delivery Rate",
      shortLabel: "SMS Telephony Delivery",
      numerator: deliveredSms,
      denominator: allSms.length,
      ratePct: pct(deliveredSms, allSms.length),
      whoTarget: 95,
      whoTargetDisplay: "95%",
      edhsBaseline: 88,
      edhsDisplay: "88%",
    },
    {
      label: "Participant SMS Opt-Out Rate",
      shortLabel: "SMS Opt-Out Rate",
      numerator: optedOutCount,
      denominator: participants.length,
      ratePct: pct(optedOutCount, participants.length),
      whoTarget: null,
      whoTargetDisplay: "< 5%",
      edhsBaseline: null,
      edhsDisplay: "-",
    },
  ];

  // Build 11-milestone cascade (8 ANC + 3 PNC)
  const cascade: CascadeMilestone[] = MILESTONE_LABELS.map((label, idx) => {
    const isAnc = idx < 8;
    const slotIndex = isAnc ? idx : idx - 8;
    let scheduled = 0;
    let attended = 0;
    let pending = 0;
    let missed = 0;
    for (const p of participants) {
      const list = p.appointments.filter((a) => a.kind === (isAnc ? "anc" : "pnc"));
      const apt = list[slotIndex];
      if (!apt) continue;
      scheduled++;
      if (apt.status === "attended") attended++;
      else if (apt.status === "missed") missed++;
      else pending++;
    }
    return {
      label,
      scheduled,
      attended,
      pending,
      missed,
      retentionPct: pct(attended, scheduled),
    };
  });

  // Gestational & Risk Stratification
  const buckets = {
    t1Std: 0, t1High: 0,
    t2Std: 0, t2High: 0,
    t3Std: 0, t3High: 0,
    postTermStd: 0, postTermHigh: 0,
    pncStd: 0, pncHigh: 0,
  };

  for (const p of participants) {
    const preg = p.pregnancies[0];
    const isHigh = preg?.riskStatus === "high";
    if (p.status === "postnatal") {
      if (isHigh) buckets.pncHigh++;
      else buckets.pncStd++;
      continue;
    }
    if (p.status !== "active_pregnant" || !preg?.eddDate) continue;
    const ga = calculateGestationalAge(preg.eddDate);
    if (ga.weeks <= 12) {
      if (isHigh) buckets.t1High++; else buckets.t1Std++;
    } else if (ga.weeks <= 27) {
      if (isHigh) buckets.t2High++; else buckets.t2Std++;
    } else if (ga.weeks <= 40) {
      if (isHigh) buckets.t3High++; else buckets.t3Std++;
    } else {
      if (isHigh) buckets.postTermHigh++; else buckets.postTermStd++;
    }
  }

  const riskStages: RiskStageRow[] = [
    {
      label: "1st Trimester (1–12 weeks)",
      chartLabel: "1st Trimester (1-12w)",
      standard: buckets.t1Std,
      high: buckets.t1High,
      total: buckets.t1Std + buckets.t1High,
      protocol: "Dating scan & baseline labs",
      badgeClass: "badge-neutral",
    },
    {
      label: "2nd Trimester (13–27 weeks)",
      chartLabel: "2nd Trimester (13-27w)",
      standard: buckets.t2Std,
      high: buckets.t2High,
      total: buckets.t2Std + buckets.t2High,
      protocol: "Routine bi-weekly SMS reminders",
      badgeClass: "badge-info",
    },
    {
      label: "3rd Trimester (28–40 weeks)",
      chartLabel: "3rd Trimester (28-42w)",
      standard: buckets.t3Std,
      high: buckets.t3High,
      total: buckets.t3Std + buckets.t3High,
      protocol: "Birth preparedness & danger signs",
      badgeClass: "badge-warning",
    },
    {
      label: "Post-Term (> 40 weeks)",
      chartLabel: "Post-Term (>42w)",
      standard: buckets.postTermStd,
      high: buckets.postTermHigh,
      total: buckets.postTermStd + buckets.postTermHigh,
      protocol: "Immediate delivery triage / HEW call",
      badgeClass: "badge-urgent",
    },
    {
      label: "Postnatal Cohort (Completed Delivery)",
      chartLabel: "Postnatal Cohort",
      standard: buckets.pncStd,
      high: buckets.pncHigh,
      total: buckets.pncStd + buckets.pncHigh,
      protocol: "Postpartum & baby education (every week)",
      badgeClass: "badge-success",
    },
  ];

  const generatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");

  return (
    <ReportsClient
      facilitySubtitle="Wolkite University Specialized Hospital (WUSH-001)"
      generatedAt={generatedAt}
      kpis={{
        activeWomen,
        ancOnTimePct: pct(attendedAnc, ancApts.length),
        ancAttended: attendedAnc,
        ancTotal: ancApts.length,
        facilityBirthPct: pct(facilityBirths, deliveredPregs.length),
        facilityBirths,
        totalBirths: deliveredPregs.length,
        pnc7dPct: pct(pncAttended, deliveredPregs.length),
        pnc7dCount: pncAttended,
      }}
      benchmarks={benchmarks}
      cascade={cascade}
      riskStages={riskStages}
    />
  );
}
