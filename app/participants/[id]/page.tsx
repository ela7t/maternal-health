import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  calculateGestationalAge,
  calculatePostnatalAge,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopianCalendar";
import { ParticipantWorkspace } from "./ParticipantWorkspace";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

export default async function ParticipantShowPage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const participant = await prisma.participant.findUnique({
    where: { id: numId },
    include: {
      facility: true,
      phones: true,
      pregnancies: {
        orderBy: { id: "desc" },
        include: { babies: true },
      },
      appointments: {
        orderBy: { scheduledFor: "asc" },
      },
      outboxMessages: {
        orderBy: { scheduledAt: "desc" },
        take: 30,
      },
    },
  });

  if (!participant) notFound();

  const pregnancy = participant.pregnancies[0] || null;
  const primaryPhone =
    participant.phones.find((p) => p.isPrimary) || participant.phones[0] || null;

  const now = new Date();
  const ageYears = participant.dateOfBirth
    ? Math.floor((now.getTime() - participant.dateOfBirth.getTime()) / (1000 * 3600 * 24 * 365.25))
    : null;

  const gaInfo = pregnancy?.eddDate ? calculateGestationalAge(pregnancy.eddDate) : null;
  const eddEth = pregnancy?.eddDate ? gregorianToEthiopian(pregnancy.eddDate) : null;
  const lmpEth = pregnancy?.lmpDate ? gregorianToEthiopian(pregnancy.lmpDate) : null;

  const daysUntilEdd = pregnancy?.eddDate
    ? Math.ceil((pregnancy.eddDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    : null;

  const pncInfo =
    participant.status === "postnatal" && pregnancy?.deliveredAt
      ? calculatePostnatalAge(pregnancy.deliveredAt)
      : null;
  const daysSinceDelivery = pregnancy?.deliveredAt
    ? Math.floor((now.getTime() - pregnancy.deliveredAt.getTime()) / (1000 * 3600 * 24))
    : 0;

  return (
    <ParticipantWorkspace
      participant={{
        id: participant.id,
        publicCode: participant.publicCode,
        fullName: participant.fullName,
        kebele: formatKebele(participant.kebele),
        preferredLanguage: participant.preferredLanguage,
        preferredChannel: participant.preferredChannel,
        status: participant.status,
        enrolledAt: participant.enrolledAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        ageYears,
        facilityName: participant.facility.name,
        phoneNumber: primaryPhone?.numberE164 || null,
        phoneOwner: primaryPhone?.ownerType || null,
        consentActive: participant.status !== "opted_out",
      }}
      pregnancy={
        pregnancy
          ? {
              eddIso: pregnancy.eddDate ? pregnancy.eddDate.toISOString() : null,
              eddShort: pregnancy.eddDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
              eddLong: pregnancy.eddDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              eddEthAm: eddEth ? formatEthiopianDate(eddEth, "am") : "—",
              eddEthEn: eddEth ? `${formatEthiopianDate(eddEth, "en")} E.C.` : "E.C.",
              lmpShort: pregnancy.lmpDate
                ? pregnancy.lmpDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                : "Uncertain",
              lmpEthAm: lmpEth ? formatEthiopianDate(lmpEth, "am") : "—",
              datingMethod: pregnancy.datingMethod,
              riskStatus: pregnancy.riskStatus,
              deliveredAtShort: pregnancy.deliveredAt
                ? pregnancy.deliveredAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null,
              deliveryPlace: pregnancy.deliveryPlace,
              outcome: pregnancy.outcome,
              babies: pregnancy.babies.map((b) => ({
                id: b.id,
                name: b.name,
                sex: b.sex,
                status: b.status,
              })),
            }
          : null
      }
      ga={
        gaInfo
          ? {
              weeks: gaInfo.weeks,
              formatted: gaInfo.formatted,
              trimester: gaInfo.trimester,
              daysUntilEdd,
              progressPct: Math.min(100, Math.max(4, Math.round((gaInfo.weeks / 40) * 100))),
            }
          : null
      }
      pnc={
        pncInfo
          ? {
              formatted: pncInfo.formatted,
              daysSinceDelivery,
            }
          : null
      }
      appointments={participant.appointments.map((a) => ({
        id: a.id,
        kind: a.kind,
        scheduledFor: a.scheduledFor.toISOString(),
        status: a.status,
        recordedBy: a.recordedBy,
        notes: a.notes,
      }))}
      outboxMessages={participant.outboxMessages.map((m) => ({
        id: m.id,
        scheduledAt: m.scheduledAt.toISOString(),
        sentAt: m.sentAt ? m.sentAt.toISOString() : null,
        messageContent: m.messageContent,
        segments: m.segments,
        status: m.status,
      }))}
    />
  );
}
