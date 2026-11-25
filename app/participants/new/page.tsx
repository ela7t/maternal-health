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
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
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
          <h1 className="page-title" style={{ margin: "0.25rem 0 0 0" }}>
            Enroll pregnant mother
          </h1>
        </div>
        <span className="badge badge-neutral">Wolkite &amp; Jimma protocol</span>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        <RegisterMotherForm facilities={facilities} todayEth={todayEth} />
      </div>
    </div>
  );
}
