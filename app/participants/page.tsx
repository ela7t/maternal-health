import Link from "next/link";
import prisma from "@/lib/prisma";
import { calculateGestationalAge, calculatePostnatalAge } from "@/lib/ethiopianCalendar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

function formatKebele(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/^Kebele\s*:?\s*/i, "").trim();
  return cleaned ? `Kebele ${cleaned}` : "—";
}

export default async function ParticipantsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const status = params.status || "";

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { publicCode: { contains: q, mode: "insensitive" } },
      { phones: { some: { numberE164: { contains: q } } } },
    ];
  }

  const [participants, allCount, pregCount, pncCount, gradCount, optOutCount] =
    await Promise.all([
      prisma.participant.findMany({
        where,
        include: {
          facility: true,
          phones: true,
          pregnancies: {
            orderBy: { id: "desc" },
            take: 1,
          },
          appointments: {
            where: { status: "scheduled" },
            orderBy: { scheduledFor: "asc" },
            take: 1,
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.participant.count(),
      prisma.participant.count({ where: { status: "active_pregnant" } }),
      prisma.participant.count({ where: { status: "postnatal" } }),
      prisma.participant.count({ where: { status: "completed" } }),
      prisma.participant.count({ where: { status: "opted_out" } }),
    ]);

  const filterChips = [
    { key: "", label: "All", count: allCount },
    { key: "active_pregnant", label: "Pregnant", count: pregCount },
    { key: "postnatal", label: "Postnatal", count: pncCount },
    { key: "completed", label: "Graduated", count: gradCount },
    { key: "opted_out", label: "Opted out", count: optOutCount },
  ];

  const now = new Date();

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header matching women_list.html */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Participant directory
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Wolkite &amp; Jimma Primary Health Program &bull; Longitudinal cohort
          </p>
        </div>
        <Link href="/participants/new" className="btn btn-primary" style={{ minHeight: "44px" }}>
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Enroll mother</span>
        </Link>
      </div>

      {/* Search & Filter Chips Card */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "14px" }}>
        <form method="GET" action="/participants" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            className="form-input"
            style={{ flex: "1 1 280px", minHeight: "44px" }}
            placeholder="Search by mother name, card code (MOM-), or phone..."
          />
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", padding: "0 18px" }}>
            Search
          </button>
          {(status || q) && (
            <Link href="/participants" className="btn btn-outline" style={{ minHeight: "44px" }}>
              Clear
            </Link>
          )}
        </form>

        <div className="filter-chips-row" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "4px" }}>
            Filter:
          </span>
          {filterChips.map((chip) => {
            const isActive = status === chip.key;
            const href = chip.key
              ? `/participants?status=${chip.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              : `/participants${q ? `?q=${encodeURIComponent(q)}` : ""}`;
            return (
              <Link
                key={chip.label}
                href={href}
                className={`filter-chip ${isActive ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <span>{chip.label}</span>
                <span className="chip-count-pill tabular-nums">{chip.count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Aligned CSS Grid Table (Exact women_list.html pattern) */}
      <div className="directory-table-wrap">
        <div className="directory-grid-header" role="row">
          <div>Name / Card</div>
          <div>GA (Weeks)</div>
          <div>EDD</div>
          <div>Next visit due</div>
          <div>Status</div>
          <div>Kebele</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {participants.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
            No enrolled mothers match this filter.
          </div>
        ) : (
          participants.map((p) => {
            const preg = p.pregnancies[0];
            const nextApt = p.appointments[0];
            const ga = p.status === "active_pregnant" && preg?.eddDate ? calculateGestationalAge(preg.eddDate) : null;
            const pnc = p.status === "postnatal" && preg?.deliveredAt ? calculatePostnatalAge(preg.deliveredAt) : null;
            const isOverdue = nextApt && nextApt.scheduledFor < now;

            return (
              <div key={p.id} className="directory-grid-row" role="row">
                {/* 1. Name / Card */}
                <div className="directory-cell">
                  <Link
                    href={`/participants/${p.id}`}
                    style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", display: "block" }}
                  >
                    {p.fullName}
                  </Link>
                  <span className="mrn-badge tabular-nums" style={{ marginTop: "4px", display: "inline-block" }}>
                    {p.publicCode}
                  </span>
                </div>

                {/* 2. GA (Weeks) */}
                <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem" }}>
                  {ga ? (
                    <>
                      <span className="badge badge-info" style={{ marginRight: "6px" }}>T{ga.trimester}</span>
                      <strong>{ga.weeks}w {ga.days}d</strong>
                    </>
                  ) : pnc ? (
                    <span>{pnc.formatted}</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                  )}
                </div>

                {/* 3. EDD */}
                <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {preg?.eddDate
                    ? preg.eddDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>

                {/* 4. Next Visit Due */}
                <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem" }}>
                  {nextApt ? (
                    isOverdue ? (
                      <span className="badge badge-urgent">
                        {nextApt.kind.toUpperCase()} &bull; Overdue
                      </span>
                    ) : (
                      <span>
                        <strong>{nextApt.kind.toUpperCase()}</strong> &middot;{" "}
                        {nextApt.scheduledFor.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                  )}
                </div>

                {/* 5. Status (Empty for standard active pregnancy, badge for postnatal/graduated/opted_out/loss) */}
                <div className="directory-cell">
                  {p.status === "postnatal" && <span className="badge badge-success">Postnatal</span>}
                  {p.status === "completed" && <span className="badge badge-neutral">Graduated</span>}
                  {p.status === "opted_out" && <span className="badge badge-warning">Opted out</span>}
                  {p.status === "loss" && <span className="badge badge-urgent">Loss</span>}
                </div>

                {/* 6. Kebele */}
                <div className="directory-cell" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {formatKebele(p.kebele)}
                </div>

                {/* 7. Actions (44px View button) */}
                <div className="directory-cell" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link href={`/participants/${p.id}`} className="btn btn-outline btn-view-profile">
                    View
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
