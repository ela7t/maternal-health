import Link from "next/link";
import prisma from "@/lib/prisma";
import { calculateGestationalAge, calculatePostnatalAge } from "@/lib/ethiopianCalendar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
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

  const participants = await prisma.participant.findMany({
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
  });

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-slate-900">Mothers & Participants Registry</h3>
          <p className="text-secondary mb-0 small">
            Longitudinal tracking of registered pregnant and postpartum women across primary healthcare facilities.
          </p>
        </div>
        <Link href="/participants/new" className="btn-medical shadow-sm">
          <i className="bi bi-person-plus-fill"></i> Register New Mother
        </Link>
      </div>

      {/* Search & Clinical Filter Bar */}
      <div className="card-custom p-3 mb-4">
        <form method="GET" action="/participants" className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-secondary"></i>
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                className="form-control border-start-0 ps-0"
                placeholder="Search by name, ID code (e.g. MOM-), or phone number..."
              />
            </div>
          </div>

          <div className="col-md-4">
            <select name="status" defaultValue={status} className="form-select">
              <option value="">All Care Stages</option>
              <option value="active_pregnant">Active Pregnant</option>
              <option value="postnatal">Postnatal Care (0–6 Weeks)</option>
              <option value="completed">Completed (Graduated)</option>
              <option value="opted_out">Opted Out (STOP)</option>
              <option value="loss">Sensitive Loss Halt</option>
            </select>
          </div>

          <div className="col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-outline-secondary w-100 fw-semibold">
              <i className="bi bi-filter"></i> Apply Filters
            </button>
            {(status || q) && (
              <Link href="/participants" className="btn btn-light border text-secondary">
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean bg-light d-flex justify-content-between align-items-center">
          <span className="fw-bold text-dark">Registered Cohort ({participants.length})</span>
          <span className="text-secondary small">Wolkite & Jimma Primary Centers</span>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mother Profile</th>
                <th>Facility & Kebele</th>
                <th>Clinical Stage</th>
                <th>Phone (Owner)</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const preg = p.pregnancies[0];
                const ph = p.phones.find((x) => x.isPrimary) || p.phones[0];

                let stageNode = <span className="text-muted small">—</span>;
                if (p.status === "active_pregnant" && preg?.eddDate) {
                  const ga = calculateGestationalAge(preg.eddDate);
                  stageNode = (
                    <>
                      <span className="badge-clinical pregnant">
                        <i className="bi bi-calendar3"></i> {ga.formatted} (T{ga.trimester})
                      </span>
                      <div className="small text-muted mt-1">
                        EDD: {preg.eddDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </>
                  );
                } else if (p.status === "postnatal" && preg?.deliveredAt) {
                  const pnc = calculatePostnatalAge(preg.deliveredAt);
                  stageNode = (
                    <span className="badge-clinical postnatal">
                      <i className="bi bi-flower1"></i> {pnc.formatted}
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
                            className="fw-bold text-dark text-decoration-none d-block"
                          >
                            {p.fullName}
                          </Link>
                          <span className="text-muted small font-monospace">{p.publicCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark small">{p.facility?.name}</div>
                      <span className="text-secondary small">{p.kebele}</span>
                    </td>
                    <td>{stageNode}</td>
                    <td>
                      {ph ? (
                        <>
                          <div className="small fw-semibold text-dark">{ph.numberE164}</div>
                          <span className="badge bg-light text-secondary border small text-capitalize">
                            {ph.ownerType}&apos;s phone
                          </span>
                        </>
                      ) : (
                        <span className="text-danger small">No phone recorded</span>
                      )}
                    </td>
                    <td>
                      {p.status === "active_pregnant" && <span className="badge-clinical pregnant">Pregnant</span>}
                      {p.status === "postnatal" && <span className="badge-clinical postnatal">Postnatal</span>}
                      {p.status === "completed" && <span className="badge-clinical completed">Graduated</span>}
                      {p.status === "opted_out" && <span className="badge-clinical opted-out">Opted Out</span>}
                      {p.status === "loss" && <span className="badge-clinical missed">Sensitive Loss</span>}
                      {!["active_pregnant", "postnatal", "completed", "opted_out", "loss"].includes(p.status) && (
                        <span className="badge-clinical completed">{p.status}</span>
                      )}
                    </td>
                    <td className="text-end">
                      <Link
                        href={`/participants/${p.id}`}
                        className="btn btn-sm btn-outline-secondary fw-semibold"
                      >
                        View Profile <i className="bi bi-arrow-right ms-1"></i>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    <i className="bi bi-people display-6 d-block mb-2 text-secondary opacity-50"></i>
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
