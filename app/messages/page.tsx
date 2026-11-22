import prisma from "@/lib/prisma";
import { Ucs2Meter } from "./Ucs2Meter";

export const dynamic = "force-dynamic";

export default async function MessageBankPage() {
  const templates = await prisma.messageTemplate.findMany({
    include: {
      variants: true,
    },
    orderBy: { code: "asc" },
  });

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-slate-900">MNH Clinical Message Bank & Framing</h3>
          <p className="text-secondary mb-0 small">
            Validated Jimma Zone 78-message repository aligned with the WHO 8-contact ANC model and Ge&apos;ez UCS-2 segment limits.
          </p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 d-flex align-items-center gap-1">
            <i className="bi bi-shield-check"></i> Clinically Approved
          </span>
        </div>
      </div>

      {/* Interactive Amharic Ge'ez Segment Gauge Card */}
      <Ucs2Meter />

      {/* Message Library Table */}
      <div className="card-custom overflow-hidden">
        <div className="card-header-clean bg-light d-flex justify-content-between align-items-center">
          <div className="fw-bold text-dark">
            <i className="bi bi-collection-play me-1 text-teal" style={{ color: "var(--app-primary)" }}></i>{" "}
            Active Clinical Templates ({templates.length})
          </div>
          <div className="small text-secondary">
            Gain-Framed (Benefits) vs. Loss-Framed (Risk Awareness)
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Template Code & Milestone</th>
                <th>Clinical Topic</th>
                <th>Amharic Gain-Framed (Benefits)</th>
                <th>Amharic Loss-Framed (Cautions)</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => {
                const gainVar = tpl.variants.find(
                  (v) => v.language === "am" && v.framing === "gain"
                ) || tpl.variants.find((v) => v.framing === "gain");
                const lossVar = tpl.variants.find(
                  (v) => v.language === "am" && v.framing === "loss"
                ) || tpl.variants.find((v) => v.framing === "loss");

                return (
                  <tr key={tpl.id}>
                    <td>
                      <div className="fw-bold text-dark">{tpl.code}</div>
                      {tpl.gaFromWeeks !== null && tpl.gaToWeeks !== null && (
                        <span className="badge-clinical pregnant mt-1">
                          <i className="bi bi-calendar3"></i> Weeks {tpl.gaFromWeeks}–{tpl.gaToWeeks}
                        </span>
                      )}
                      {tpl.pncDayFrom !== null && tpl.pncDayTo !== null && (
                        <span className="badge-clinical postnatal mt-1">
                          <i className="bi bi-flower1"></i> Day {tpl.pncDayFrom}–{tpl.pncDayTo} Postnatal
                        </span>
                      )}
                      {tpl.gaFromWeeks === null && tpl.pncDayFrom === null && (
                        <span className="badge-clinical completed mt-1">Visit Reminder (72h)</span>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{tpl.topic}</div>
                      <span className="text-muted small text-capitalize">{tpl.stream}</span>
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      {gainVar ? (
                        <>
                          <div className="small text-dark mb-1">{gainVar.body}</div>
                          <span className="badge bg-light text-secondary border small">
                            {gainVar.segmentCount} segment (UCS-2)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      {lossVar ? (
                        <>
                          <div className="small text-dark mb-1">{lossVar.body}</div>
                          <span className="badge bg-light text-secondary border small">
                            {lossVar.segmentCount} segment (UCS-2)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">
                    No templates loaded.
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
