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
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Message template repository
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Validated Jimma Zone 78-message repository aligned with the WHO 8-contact ANC model and Ge&apos;ez UCS-2 segment limits.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge badge-success" style={{ minHeight: "44px", padding: "0 12px" }}>
            <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Clinically approved</span>
          </span>
          <a href="/messages/new" className="btn btn-primary" style={{ minHeight: "44px" }}>
            <span>+ Create template</span>
          </a>
        </div>
      </div>

      {/* Interactive Amharic Ge'ez Segment Gauge Card */}
      <div style={{ marginBottom: "1.25rem" }}>
        <Ucs2Meter />
      </div>

      {/* Templates Cards List (Matching Django template_list.html) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {templates.map((tpl) => {
          const gainVar =
            tpl.variants.find((v) => v.language === "am" && v.framing === "gain") ||
            tpl.variants.find((v) => v.framing === "gain");
          const lossVar =
            tpl.variants.find((v) => v.language === "am" && v.framing === "loss") ||
            tpl.variants.find((v) => v.framing === "loss");

          return (
            <div key={tpl.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "1rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {tpl.code}
                  </strong>
                  <span className="badge badge-info">{tpl.topic}</span>
                  {tpl.gaFromWeeks !== null && tpl.gaToWeeks !== null && (
                    <span className="badge badge-neutral tabular-nums">
                      Weeks {tpl.gaFromWeeks}&ndash;{tpl.gaToWeeks}
                    </span>
                  )}
                  {tpl.pncDayFrom !== null && tpl.pncDayTo !== null && (
                    <span className="badge badge-success tabular-nums">
                      Day {tpl.pncDayFrom}&ndash;{tpl.pncDayTo} postnatal
                    </span>
                  )}
                  {tpl.gaFromWeeks === null && tpl.pncDayFrom === null && (
                    <span className="badge badge-neutral">Visit reminder (72h)</span>
                  )}
                </div>

                <span className="badge badge-success" style={{ minHeight: "36px", padding: "0 12px" }}>
                  <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Approved</span>
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.875rem" }}>
                <div style={{ backgroundColor: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                    Amharic gain-framed (benefits)
                  </div>
                  {gainVar ? (
                    <>
                      <div style={{ fontSize: "0.9375rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                        &ldquo;{gainVar.body}&rdquo;
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }} className="tabular-nums">
                        Parts: <strong style={{ color: "var(--text-primary)" }}>{gainVar.segmentCount} SMS part</strong> (UCS-2)
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                  )}
                </div>

                <div style={{ backgroundColor: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                    Amharic loss-framed (cautions)
                  </div>
                  {lossVar ? (
                    <>
                      <div style={{ fontSize: "0.9375rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                        &ldquo;{lossVar.body}&rdquo;
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }} className="tabular-nums">
                        Parts: <strong style={{ color: "var(--text-primary)" }}>{lossVar.segmentCount} SMS part</strong> (UCS-2)
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            No templates loaded.
          </div>
        )}
      </div>
    </div>
  );
}
