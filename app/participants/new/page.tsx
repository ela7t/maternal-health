import Link from "next/link";
import prisma from "@/lib/prisma";
import { RegisterMotherForm } from "./RegisterMotherForm";
import { gregorianToEthiopian } from "@/lib/ethiopianCalendar";

export const dynamic = "force-dynamic";

export default async function RegisterMotherPage() {
  const facilities = await prisma.facility.findMany({
    orderBy: { name: "asc" },
  });

  const todayEth = gregorianToEthiopian(new Date());

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/participants"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            minHeight: "44px",
          }}
        >
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to directory</span>
        </Link>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.25rem 0 0.25rem 0", lineHeight: 1.25 }}>
          Enroll pregnant mother
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          Follow the 3-step clinical intake to register the participant and generate automated WHO care reminders.
        </p>
      </div>

      <RegisterMotherForm facilities={facilities} todayEth={todayEth} />
    </div>
  );
}
