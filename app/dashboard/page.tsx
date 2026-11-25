import Link from "next/link";
import prisma from "@/lib/prisma";
import { FacilitySelect } from "./FacilitySelect";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ facility_id?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const facilityId = sp.facility_id ? parseInt(sp.facility_id, 10) : null;
  const validFacilityId = facilityId && !Number.isNaN(facilityId) ? facilityId : null;
  const participantWhere = validFacilityId ? { facilityId: validFacilityId } : {};

  const [facilities, participants] = await Promise.all([
    prisma.facility.findMany({
      include: {
        participants: {
          include: {
            pregnancies: true,
            appointments: true,
            outboxMessages: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.participant.findMany({
      where: participantWhere,
      include: {
        pregnancies: { orderBy: { id: "desc" }, take: 1 },
        appointments: true,
        outboxMessages: true,
      },
    }),
  ]);

  const selectedFacility = facilities.find((f) => f.id === validFacilityId) || null;
  const now = new Date();
  const cutoff14d = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  const activeWomen = participants.filter((p) =>
    ["active_pregnant", "postnatal"].includes(p.status)
  ).length;
  const optedOutCount = participants.filter((p) => p.status === "opted_out").length;

  const allApts = participants.flatMap((p) => p.appointments);
  const ancApts = allApts.filter((a) => a.kind === "anc");
  const ancAttended = ancApts.filter((a) => a.status === "attended").length;
  const missedApts = allApts.filter((a) => a.status === "missed");
  const tracedMissed = missedApts.filter((a) => a.status === "rescheduled").length;

  const allPregs = participants.flatMap((p) => p.pregnancies);
  const deliveredPregs = allPregs.filter((pr) => pr.deliveredAt !== null);
  const totalBirths = deliveredPregs.length;
  const facilityBirths = deliveredPregs.filter((pr) => Boolean(pr.deliveryPlace)).length;
  const incompleteRecords = participants.filter(
    (p) =>
      p.status === "active_pregnant" &&
      p.pregnancies[0]?.eddDate &&
      p.pregnancies[0].eddDate < cutoff14d &&
      !p.pregnancies[0].deliveredAt
  ).length;

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
  const failedSms = allSms.filter((m) => m.status === "failed").length;

  const rate = (n: number, d: number) =>
    d > 0 ? Math.min(100, Math.round((n / d) * 100)) : null;

  const ancRate = rate(ancAttended, ancApts.length);
  const anc4Rate = rate(anc4Count, totalBirths);
  const anc8Rate = rate(anc8Count, totalBirths);
  const missedTracedRate = rate(tracedMissed, missedApts.length);
  const birthRate = rate(facilityBirths, totalBirths);
  const pncRate = rate(pncAttended, totalBirths);
  const smsRate = rate(deliveredSms, allSms.length);
  const optOutRate = rate(optedOutCount, participants.length);

  const exportQuery = validFacilityId ? `&facility_id=${validFacilityId}` : "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Facility Health Dashboard
            </h1>
            <span className="badge badge-neutral">Strictly De-Identified</span>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {selectedFacility
              ? `${selectedFacility.name} (${selectedFacility.code})`
              : "Wolkite & Jimma Primary Health Program"}{" "}
            &bull; Maternal &amp; Newborn Care Monitoring
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <FacilitySelect
            facilities={facilities.map((f) => ({ id: f.id, name: f.name }))}
            selectedId={validFacilityId}
          />
          <a href={`/api/reports/export?format=csv${exportQuery}`} className="btn btn-outline" style={{ minHeight: "40px" }}>
            CSV Export
          </a>
          <Link href="/reports" className="btn btn-primary" style={{ minHeight: "40px" }}>
            Full Clinical Reports
          </Link>
        </div>
      </div>

      {/* 4-Column KPI Grid */}
      <div className="metric-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{activeWomen}</div>
            <div className="metric-label">Active Enrolled Mothers</div>
          </div>
          <div>
            <div className="metric-sub">In active care pathway</div>
            <div className="metric-progress-bar">
              <div className="metric-progress-fill" style={{ width: activeWomen > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{ancRate !== null ? `${ancRate}%` : "—"}</div>
            <div className="metric-label">ANC Contacts On Time</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {ancApts.length > 0 ? `${ancAttended} / ${ancApts.length} contacts attended` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${ancRate !== null && ancRate >= 80 ? "is-success" : ""}`}
                style={{ width: `${ancRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{birthRate !== null ? `${birthRate}%` : "—"}</div>
            <div className="metric-label">Facility Birth Share</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {totalBirths > 0 ? `${facilityBirths} / ${totalBirths} institutional deliveries` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${birthRate !== null && birthRate >= 90 ? "is-success" : ""}`}
                style={{ width: `${birthRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{pncRate !== null ? `${pncRate}%` : "—"}</div>
            <div className="metric-label">PNC within 7 Days</div>
          </div>
          <div>
            <div className="metric-sub tabular-nums">
              {totalBirths > 0 ? `${pncAttended} / ${totalBirths} early post-birth visits` : "No data yet"}
            </div>
            <div className="metric-progress-bar">
              <div
                className={`metric-progress-fill ${pncRate !== null && pncRate >= 80 ? "is-success" : ""}`}
                style={{ width: `${pncRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Indicator Benchmarks Table (Django facility_dashboard.html) */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div className="card-header" style={{ padding: "1.25rem 1.25rem 0.75rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">Clinical Indicator Benchmarks &amp; Detail</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinical Health Indicator</th>
                <th style={{ textAlign: "right" }}>Numerator</th>
                <th style={{ textAlign: "right" }}>Denominator</th>
                <th style={{ textAlign: "right" }}>Performance Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "ANC Contacts On Time (attended ≤ 7 days of scheduled date)", n: ancAttended, d: ancApts.length, r: ancRate, target: 80 },
                { label: "Women with ≥ 4 ANC Contacts by Delivery", n: anc4Count, d: totalBirths, r: anc4Rate, target: 70 },
                { label: "Women with ≥ 8 ANC Contacts (WHO 2016 Guideline)", n: anc8Count, d: totalBirths, r: anc8Rate, target: 60 },
                { label: "Missed Visits Traced within 7 Days", n: tracedMissed, d: missedApts.length, r: missedTracedRate, target: 80 },
                { label: "Institutional / Facility Births Share", n: facilityBirths, d: totalBirths, r: birthRate, target: 90 },
                { label: "PNC Contact within 7 Days of Birth", n: pncAttended, d: totalBirths, r: pncRate, target: 80 },
                { label: "Messages Delivered over Dispatched", n: deliveredSms, d: allSms.length, r: smsRate, target: 95, failed: failedSms },
                { label: "Participant SMS Opt-Out Rate", n: optedOutCount, d: participants.length, r: optOutRate, target: 999 },
              ].map((row) => (
                <tr key={row.label}>
                  <td style={{ fontWeight: 600 }}>{row.label}</td>
                  <td className="tabular-nums" style={{ textAlign: "right" }}>{row.n}</td>
                  <td className="tabular-nums" style={{ textAlign: "right" }}>{row.d}</td>
                  <td style={{ textAlign: "right" }}>
                    {row.r === null ? (
                      <>
                        <span className="badge badge-neutral">&mdash;</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "4px" }}>No data yet</span>
                      </>
                    ) : (
                      <>
                        <span className={`badge ${row.r >= row.target ? "badge-success" : "badge-neutral"} tabular-nums`}>
                          {row.r}%
                        </span>
                        {row.failed ? (
                          <span className="badge badge-urgent" style={{ marginLeft: "4px" }}>
                            {row.failed} Failed
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 600 }}>Records Incomplete (&gt; EDD + 14d without recorded outcome)</td>
                <td className="tabular-nums" style={{ textAlign: "right" }} colSpan={2}>
                  {incompleteRecords} records flagged
                </td>
                <td style={{ textAlign: "right" }}>
                  {incompleteRecords > 0 ? (
                    <span className="badge badge-urgent">Action Required</span>
                  ) : (
                    <span className="badge badge-success">✓ Up to date</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Facility Comparison Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "1rem 1.25rem", marginBottom: 0 }}>
          <h2 className="card-title">Cross-facility comparison</h2>
          <span className="badge badge-neutral tabular-nums">{facilities.length} facilities</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Facility code &amp; name</th>
                <th style={{ textAlign: "right" }}>Active mothers</th>
                <th style={{ textAlign: "right" }}>ANC attended</th>
                <th style={{ textAlign: "right" }}>Deliveries</th>
                <th style={{ textAlign: "right" }}>PNC attended</th>
                <th style={{ textAlign: "right" }}>SMS delivery</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac) => {
                const facActive = fac.participants.filter((p) =>
                  ["active_pregnant", "postnatal"].includes(p.status)
                ).length;
                const facAncAll = fac.participants.flatMap((p) =>
                  p.appointments.filter((a) => a.kind === "anc")
                );
                const facAncDone = facAncAll.filter((a) => a.status === "attended").length;
                const facAncPct =
                  facAncAll.length > 0 ? Math.round((facAncDone / facAncAll.length) * 100) : null;
                const facDeliveries = fac.participants.flatMap((p) =>
                  p.pregnancies.filter((g) => g.deliveredAt !== null)
                ).length;
                const facPncDone = fac.participants.flatMap((p) =>
                  p.appointments.filter((a) => a.kind === "pnc" && a.status === "attended")
                ).length;
                const facSmsAll = fac.participants.flatMap((p) => p.outboxMessages);
                const facSmsOk = facSmsAll.filter((m) =>
                  ["sent", "delivered", "submitted"].includes(m.status)
                ).length;
                const facSmsPct =
                  facSmsAll.length > 0 ? Math.round((facSmsOk / facSmsAll.length) * 100) : null;

                return (
                  <tr key={fac.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{fac.name}</div>
                      <span className="mrn-badge">{fac.code}</span>
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 700 }}>
                      {facActive}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facAncPct !== null ? (
                        <span className={`badge ${facAncPct >= 80 ? "badge-success" : "badge-neutral"}`}>
                          {facAncPct}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facDeliveries}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>
                      {facPncDone}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 600 }}>
                      {facSmsPct !== null ? `${facSmsPct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
              {facilities.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No facilities registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
