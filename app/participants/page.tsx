import prisma from "@/lib/prisma";
import { calculateGestationalAge, calculatePostnatalAge } from "@/lib/ethiopianCalendar";
import { DirectoryClient, DirectoryParticipantRow } from "./DirectoryClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

export default async function ParticipantsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() || "";

  const participants = await prisma.participant.findMany({
    include: {
      phones: { where: { isPrimary: true } },
      pregnancies: {
        orderBy: { id: "desc" },
        take: 1,
      },
      appointments: {
        where: { status: { in: ["scheduled", "missed"] } },
        orderBy: { scheduledFor: "asc" },
        take: 1,
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const now = new Date();

  const rows: DirectoryParticipantRow[] = participants.map((p) => {
    const preg = p.pregnancies[0];
    const nextApt = p.appointments[0];
    const ageYears = p.dateOfBirth
      ? Math.floor((now.getTime() - p.dateOfBirth.getTime()) / (1000 * 3600 * 24 * 365.25))
      : null;
    const ga =
      p.status === "active_pregnant" && preg?.eddDate
        ? calculateGestationalAge(preg.eddDate)
        : null;
    const pnc =
      p.status === "postnatal" && preg?.deliveredAt
        ? calculatePostnatalAge(preg.deliveredAt)
        : null;
    const isOverdue = Boolean(
      nextApt && (nextApt.status === "missed" || nextApt.scheduledFor < now)
    );

    return {
      id: p.id,
      fullName: p.fullName,
      publicCode: p.publicCode,
      ageYears,
      phone: p.phones[0]?.numberE164 || null,
      kebele: formatKebele(p.kebele),
      status: p.status,
      riskStatus: preg?.riskStatus || "standard",
      trimester: ga ? ga.trimester : null,
      gaWeeks: ga ? ga.weeks : null,
      gaDays: ga ? ga.days : null,
      pncFormatted: pnc ? pnc.formatted : null,
      eddIso: preg?.eddDate ? preg.eddDate.toISOString() : null,
      eddShort: preg?.eddDate
        ? preg.eddDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      nextVisitIso: nextApt ? nextApt.scheduledFor.toISOString() : null,
      nextVisitShort: nextApt
        ? nextApt.scheduledFor.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : null,
      nextVisitKind: nextApt ? nextApt.kind : null,
      isOverdue,
    };
  });

  return <DirectoryClient rows={rows} initialQuery={q} />;
}
