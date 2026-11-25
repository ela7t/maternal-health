import Link from "next/link";
import { ArrowRight, Calendar, Filter, Search, UserPlus, Users } from "lucide-react";
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

  const [participants, allCount, pregCount, pncCount, gradCount] = await Promise.all([
    prisma.participant.findMany({
      where,
      include: {
        facility: true,
        phones: true,
        pregnancies: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.participant.count(),
    prisma.participant.count({ where: { status: "active_pregnant" } }),
    prisma.participant.count({ where: { status: "postnatal" } }),
    prisma.participant.count({ where: { status: "completed" } }),
  ]);

  const filterChips = [
    { key: "", label: "All", count: allCount },
    { key: "active_pregnant", label: "Pregnant", count: pregCount },
    { key: "postnatal", label: "Postnatal", count: pncCount },
    { key: "completed", label: "Graduated", count: gradCount },
  ];

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Mothers &amp; participants registry</h1>
          <p className="mb-0 small" style={{ color: "var(--text-secondary)" }}>
            Longitudinal tracking of registered pregnant and postpartum women across primary healthcare facilities.
          </p>
        </div>
        <Link href="/participants/new" className="btn-medical">
          <UserPlus size={16} />
          <span>Register new mother</span>
        </Link>
      </div>

      {/* Search & Filter Chips Card */}
      <div className="card-custom p-3 mb-4">
        <form method="GET" action="/participants" className="row g-2 align-items-center mb-3">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text">
                <Search size={16} />
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                className="form-control"
                placeholder="Search by name, ID code (e.g. MOM-), or phone..."
              />
            </div>
          </div>

          <div className="col-md-4">
            <select name="status" defaultValue={status} className="form-select">
              <option value="">All care stages</option>
              <option value="active_pregnant">Active pregnant</option>
              <option value="postnatal">Postnatal care (0&ndash;6 weeks)</option>
              <option value="completed">Completed (graduated)</option>
              <option value="opted_out">Opted out (STOP)</option>
              <option value="loss">Sensitive loss halt</option>
            </select>
          </div>

          <div className="col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-outline-secondary w-100 fw-semibold">
              <Filter size={16} />
              <span>Apply filters</span>
            </button>
            {(status || q) && (
              <Link href="/participants" className="btn btn-light border">
                Reset
              </Link>
            )}
          </div>
        </form>

        {/* 44px Quick Filter Chips with Pill Counts */}
        <div className="d-flex flex-wrap gap-2 pt-2 border-top">
          {filterChips.map((chip) => {
            const isActive = status === chip.key;
            const href = chip.key
              ? `/participants?status=${chip.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              : `/participants${q ? `?q=${encodeURIComponent(q)}` : ""}`;
            return (
              <Link
                key={chip.label}
                href={href}
                className={`btn ${isActive ? "btn-medical" : "btn-outline-secondary"}`}
              >
                <span>{chip.label}</span>
                <span
                  className="badge rounded-pill tabular-nums"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "var(--bg-muted)",
                    color: isActive ? "#ffffff" : "var(--text-primary)",
                  }}
                >
                  {chip.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean">
          <span className="fw-bold tabular-nums">
            Registered cohort ({participants.length})
          </span>
          <span className="small" style={{ color: "var(--text-secondary)" }}>
            Wolkite &amp; Jimma Primary Centers
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother profile</th>
                <th>Facility &amp; kebele</th>
                <th>Clinical stage &amp; EDD</th>
                <th>Phone (owner)</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const preg = p.pregnancies[0];
                const ph = p.phones.find((x) => x.isPrimary) || p.phones[0];

                let stageNode = (
                  <span className="small" style={{ color: "var(--text-muted)" }}>
                    &mdash;
                  </span>
                );
                if (p.status === "active_pregnant" && preg?.eddDate) {
                  const ga = calculateGestationalAge(preg.eddDate);
                  stageNode = (
                    <>
                      <span className="badge-clinical pregnant tabular-nums">
                        <Calendar size={13} /> {ga.formatted} (T{ga.trimester})
                      </span>
                      <div className="small mt-1 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        EDD:{" "}
                        {preg.eddDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </>
                  );
                } else if (p.status === "postnatal" && preg?.deliveredAt) {
                  const pnc = calculatePostnatalAge(preg.deliveredAt);
                  stageNode = (
                    <span className="badge-clinical postnatal tabular-nums">
                      {pnc.formatted}
                    </span>
                  );
                }

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="patient-avatar">
                          {p.fullName ? p.fullName.charAt(0) : "M"}
                        </div>
                        <div>
                          <Link
                            href={`/participants/${p.id}`}
                            className="fw-bold text-decoration-none d-block"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {p.fullName}
                          </Link>
                          <span
                            className="small font-monospace tabular-nums"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {p.publicCode}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{p.facility?.name}</div>
                      <span className="small" style={{ color: "var(--text-secondary)" }}>
                        {formatKebele(p.kebele)}
                      </span>
                    </td>
                    <td>{stageNode}</td>
                    <td>
                      {ph ? (
                        <>
                          <div className="small fw-semibold tabular-nums">{ph.numberE164}</div>
                          <span className="badge-clinical completed text-capitalize mt-1">
                            {ph.ownerType}&apos;s phone
                          </span>
                        </>
                      ) : (
                        <span className="small" style={{ color: "var(--danger-text)" }}>
                          No phone recorded
                        </span>
                      )}
                    </td>
                    <td>
                      {p.status === "active_pregnant" && (
                        <span className="badge-clinical pregnant">Pregnant</span>
                      )}
                      {p.status === "postnatal" && (
                        <span className="badge-clinical postnatal">Postnatal</span>
                      )}
                      {p.status === "completed" && (
                        <span className="badge-clinical completed">Graduated</span>
                      )}
                      {p.status === "opted_out" && (
                        <span className="badge-clinical opted-out">Opted out</span>
                      )}
                      {p.status === "loss" && (
                        <span className="badge-clinical missed">Sensitive loss</span>
                      )}
                      {!["active_pregnant", "postnatal", "completed", "opted_out", "loss"].includes(
                        p.status
                      ) && <span className="badge-clinical completed">{p.status}</span>}
                    </td>
                    <td className="text-end">
                      <Link
                        href={`/participants/${p.id}`}
                        className="btn btn-outline-secondary fw-semibold"
                      >
                        <span>View</span>
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: "var(--text-secondary)" }}>
                    <Users size={36} className="d-block mx-auto mb-2 opacity-50" />
                    No enrolled mothers match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
