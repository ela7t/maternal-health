"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BenchmarkRow {
  label: string;
  shortLabel: string;
  numerator: number;
  denominator: number;
  ratePct: number;
  whoTarget: number | null;
  whoTargetDisplay: string;
  edhsBaseline: number | null;
  edhsDisplay: string;
}

export interface CascadeMilestone {
  label: string;
  scheduled: number;
  attended: number;
  pending: number;
  missed: number;
  retentionPct: number;
}

export interface RiskStageRow {
  label: string;
  chartLabel: string;
  standard: number;
  high: number;
  total: number;
  protocol: string;
  badgeClass: string;
}

export interface ReportsClientProps {
  facilities: Array<{ id: number; name: string }>;
  selectedFacilityId: number | null;
  facilitySubtitle: string;
  generatedAt: string;
  kpis: {
    activeWomen: number;
    ancOnTimePct: number;
    ancAttended: number;
    ancTotal: number;
    facilityBirthPct: number;
    facilityBirths: number;
    totalBirths: number;
    pnc7dPct: number;
    pnc7dCount: number;
  };
  benchmarks: BenchmarkRow[];
  cascade: CascadeMilestone[];
  riskStages: RiskStageRow[];
}

export function ReportsClient({
  facilities,
  selectedFacilityId,
  facilitySubtitle,
  generatedAt,
  kpis,
  benchmarks,
  cascade,
  riskStages,
}: ReportsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"indicators" | "cascade" | "cohort" | "all">("indicators");
  const [exportOpen, setExportOpen] = useState(false);

  const facilityQuery = selectedFacilityId ? `&facility_id=${selectedFacilityId}` : "";
  const maxCascade = Math.max(1, ...cascade.map((c) => c.scheduled));
  const maxRisk = Math.max(1, ...riskStages.map((r) => r.total));

  const showIndicators = activeTab === "indicators" || activeTab === "all";
  const showCascade = activeTab === "cascade" || activeTab === "all";
  const showCohort = activeTab === "cohort" || activeTab === "all";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.25 }}>
              Clinical health indicators &amp; research reports
            </h1>
            <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
              <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Strictly De-Identified</span>
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
            {facilitySubtitle} &bull; WHO care continuum &amp; research microdata
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="form-select"
            style={{ minHeight: "44px", padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}
            value={selectedFacilityId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              router.push(val ? `/reports?facility_id=${val}` : "/reports");
            }}
          >
            <option value="">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.875rem", minHeight: "44px", padding: "0 14px" }}
              onClick={() => setExportOpen((o) => !o)}
            >
              <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-modal)",
                  minWidth: "250px",
                  zIndex: 100,
                  padding: "6px 0",
                }}
              >
                <a href={`/api/reports/export?format=xlsx${facilityQuery}`} className="dropdown-link" onClick={() => setExportOpen(false)}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.8125rem" }}>Excel Workbook (.xlsx)</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Multi-sheet indicators &amp; microdata</div>
                  </div>
                </a>
                <a href={`/api/reports/export?format=json${facilityQuery}`} className="dropdown-link" onClick={() => setExportOpen(false)}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.8125rem" }}>Research Dataset (.json)</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Structured microdata for R / Python</div>
                  </div>
                </a>
                <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />
                <a href={`/api/reports/export?format=csv${facilityQuery}`} className="dropdown-link" onClick={() => setExportOpen(false)}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.8125rem" }}>Indicators Summary (.csv)</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Aggregated WHO indicator rates</div>
                  </div>
                </a>
                <a href={`/api/reports/export?format=microdata_csv${facilityQuery}`} className="dropdown-link" onClick={() => setExportOpen(false)}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: "0.8125rem" }}>Cohort Microdata (.csv)</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Longitudinal research cohort</div>
                  </div>
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: "0.875rem", minHeight: "44px", padding: "0 14px" }}
            onClick={() => window.print()}
          >
            <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print report</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{kpis.activeWomen}</div>
            <div className="metric-label">Active enrolled mothers</div>
          </div>
          <div className="metric-sub">In active care pathway</div>
        </div>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{kpis.ancTotal > 0 ? `${kpis.ancOnTimePct.toFixed(1)}%` : "—"}</div>
            <div className="metric-label">ANC contacts on time</div>
          </div>
          <div className="metric-sub tabular-nums">
            {kpis.ancTotal > 0 ? `${kpis.ancAttended} / ${kpis.ancTotal} contacts attended` : "No data yet"}
          </div>
        </div>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{kpis.totalBirths > 0 ? `${kpis.facilityBirthPct.toFixed(1)}%` : "—"}</div>
            <div className="metric-label">Facility birth share</div>
          </div>
          <div className="metric-sub tabular-nums">
            {kpis.totalBirths > 0 ? `${kpis.facilityBirths} / ${kpis.totalBirths} institutional deliveries` : "No data yet"}
          </div>
        </div>
        <div className="metric-card">
          <div>
            <div className="metric-value tabular-nums">{kpis.totalBirths > 0 ? `${kpis.pnc7dPct.toFixed(1)}%` : "—"}</div>
            <div className="metric-label">PNC within 7 days</div>
          </div>
          <div className="metric-sub tabular-nums">
            {kpis.totalBirths > 0 ? `${kpis.pnc7dCount} / ${kpis.totalBirths} early post-birth visits` : "No data yet"}
          </div>
        </div>
      </div>

      {/* 4 Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button type="button" className={`tab-pill ${activeTab === "indicators" ? "active" : ""}`} onClick={() => setActiveTab("indicators")}>
          Clinical Benchmarks
        </button>
        <button type="button" className={`tab-pill ${activeTab === "cascade" ? "active" : ""}`} onClick={() => setActiveTab("cascade")}>
          Care Continuum Cascade
        </button>
        <button type="button" className={`tab-pill ${activeTab === "cohort" ? "active" : ""}`} onClick={() => setActiveTab("cohort")}>
          Gestational &amp; Risk Profile
        </button>
        <button type="button" className={`tab-pill ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          All Sections (Combined)
        </button>
      </div>

      {/* SECTION 1: Clinical Benchmarks */}
      {showIndicators && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div className="card-header" style={{ padding: "1.25rem 1.25rem 0.75rem 1.25rem", marginBottom: 0 }}>
            <h2 className="card-title">
              <span>Clinical Health Indicators &amp; Benchmarking Matrix</span>
            </h2>
            <span className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Generated: {generatedAt}
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clinical Health Indicator</th>
                  <th style={{ textAlign: "right" }}>Numerator</th>
                  <th style={{ textAlign: "right" }}>Denominator</th>
                  <th style={{ minWidth: "140px" }}>Hospital Rate vs Target</th>
                  <th style={{ textAlign: "right" }}>WHO Target</th>
                  <th style={{ textAlign: "right" }}>EDHS Baseline</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr key={b.label}>
                    <td style={{ fontWeight: 600 }}>{b.label}</td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>{b.numerator}</td>
                    <td className="tabular-nums" style={{ textAlign: "right" }}>{b.denominator}</td>
                    <td>
                      {b.whoTarget !== null ? (
                        <div className="inline-progress-wrap">
                          <span className={`badge ${b.ratePct >= b.whoTarget ? "badge-success" : "badge-info"} tabular-nums`}>
                            {b.ratePct.toFixed(1)}%
                          </span>
                          <div className="inline-progress-track">
                            <div className="inline-progress-fill" style={{ width: `${Math.min(100, b.ratePct)}%` }} />
                            <div className="inline-progress-target" style={{ left: `${b.whoTarget}%` }} title={`Target: ${b.whoTarget}%`} />
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-neutral tabular-nums">{b.ratePct.toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>
                      {b.whoTargetDisplay}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {b.edhsDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Horizontal Bar Chart: Visual Quality Benchmarks */}
          <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
            <div className="chart-container-box">
              <div className="chart-container-box-header">
                <div className="chart-box-title">
                  <span>Visual Quality Benchmarks vs WHO Targets &amp; EDHS Baseline</span>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>Tri-Level Comparison</span>
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", fontSize: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                  <span style={{ width: "10px", height: "10px", background: "#14b8a6", borderRadius: "2px" }} /> Hospital Cohort
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                  <span style={{ width: "10px", height: "10px", background: "#f59e0b", borderRadius: "2px" }} /> WHO Target
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                  <span style={{ width: "10px", height: "10px", background: "#64748b", borderRadius: "2px" }} /> EDHS National Baseline
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {benchmarks
                  .filter((b) => b.whoTarget !== null)
                  .map((b) => (
                    <div key={b.shortLabel} style={{ display: "grid", gridTemplateColumns: "165px 1fr", gap: "0.75rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>{b.shortLabel}</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div style={{ height: "5px", width: `${Math.max(1, b.ratePct)}%`, background: "#14b8a6", borderRadius: "2px" }} title={`Cohort: ${b.ratePct.toFixed(1)}%`} />
                        <div style={{ height: "5px", width: `${b.whoTarget ?? 0}%`, background: "#f59e0b", borderRadius: "2px" }} title={`WHO Target: ${b.whoTarget}%`} />
                        <div style={{ height: "5px", width: `${b.edhsBaseline ?? 0}%`, background: "#64748b", borderRadius: "2px" }} title={`EDHS: ${b.edhsDisplay}`} />
                      </div>
                    </div>
                  ))}
              </div>

              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.75rem", textAlign: "right" }}>
                Teal = Hospital Cohort Actual; Amber = WHO Quality Goal; Slate = Ethiopian DHS National Baseline.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: WHO Care Continuum Cascade */}
      {showCascade && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div className="card-header" style={{ padding: "1.25rem 1.25rem 0.75rem 1.25rem", marginBottom: 0 }}>
            <div>
              <h2 className="card-title">WHO 2016 Care Continuum Retention Cascade</h2>
              <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0", fontSize: "0.8125rem" }}>
                Longitudinal cohort progression across 8 Antenatal Care contacts and 3 Postnatal visits.
              </p>
            </div>
            <span className="badge badge-info">Retention Funnel</span>
          </div>

          <div style={{ padding: "1.25rem" }}>
            <div className="cascade-stepper">
              <div className="cascade-step-card">
                <div className="cascade-step-label">Active Cohort</div>
                <div className="cascade-step-val">{kpis.activeWomen}</div>
                <div className="cascade-step-sub">100% enrolled</div>
              </div>
              <div className="cascade-step-card">
                <div className="cascade-step-label">ANC 1 (16w)</div>
                <div className="cascade-step-val">{cascade[0]?.attended ?? 0}</div>
                <div className="cascade-step-sub">{cascade[0]?.retentionPct.toFixed(1) ?? "0.0"}% attended</div>
              </div>
              <div className="cascade-step-card">
                <div className="cascade-step-label">ANC 4 (30w)</div>
                <div className="cascade-step-val">{cascade[3]?.attended ?? 0}</div>
                <div className="cascade-step-sub">{cascade[3]?.retentionPct.toFixed(1) ?? "0.0"}% attended</div>
              </div>
              <div className="cascade-step-card">
                <div className="cascade-step-label">ANC 8 (42w)</div>
                <div className="cascade-step-val">{cascade[7]?.attended ?? 0}</div>
                <div className="cascade-step-sub">{cascade[7]?.retentionPct.toFixed(1) ?? "0.0"}% attended</div>
              </div>
              <div className="cascade-step-card">
                <div className="cascade-step-label">Facility Birth</div>
                <div className="cascade-step-val">{kpis.facilityBirths}</div>
                <div className="cascade-step-sub">{kpis.facilityBirthPct.toFixed(1)}% facility</div>
              </div>
              <div className="cascade-step-card">
                <div className="cascade-step-label">PNC 1 (48h)</div>
                <div className="cascade-step-val">{cascade[8]?.attended ?? 0}</div>
                <div className="cascade-step-sub">{cascade[8]?.retentionPct.toFixed(1) ?? "0.0"}% attended</div>
              </div>
            </div>

            <div className="chart-container-box" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
              <div className="chart-container-box-header">
                <div className="chart-box-title">Care Continuum Milestone Adherence &amp; Attrition</div>
                <span className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>Milestones N={cascade.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {cascade.map((row) => (
                  <div key={row.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>{row.label}</span>
                    <div style={{ display: "flex", height: "12px", background: "var(--bg-surface)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${(row.attended / maxCascade) * 100}%`, background: "#10b981" }} title={`Attended: ${row.attended}`} />
                      <div style={{ width: `${(row.pending / maxCascade) * 100}%`, background: "#475569" }} title={`Pending: ${row.pending}`} />
                      <div style={{ width: `${(row.missed / maxCascade) * 100}%`, background: "#ef4444" }} title={`Missed: ${row.missed}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-responsive" style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Care Milestone (WHO 2016 Pathway)</th>
                    <th style={{ textAlign: "right" }}>Scheduled</th>
                    <th style={{ textAlign: "right" }}>Attended</th>
                    <th style={{ textAlign: "right" }}>Pending / In-Window</th>
                    <th style={{ textAlign: "right" }}>Missed / Defaulter</th>
                    <th style={{ minWidth: "140px" }}>Retention Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cascade.map((row) => (
                    <tr key={row.label}>
                      <td style={{ fontWeight: 600 }}>{row.label}</td>
                      <td className="tabular-nums" style={{ textAlign: "right" }}>{row.scheduled}</td>
                      <td className="tabular-nums" style={{ textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{row.attended}</td>
                      <td className="tabular-nums" style={{ textAlign: "right", color: "var(--text-muted)" }}>{row.pending}</td>
                      <td className="tabular-nums" style={{ textAlign: "right", color: row.missed > 0 ? "#dc2626" : "var(--text-muted)", fontWeight: row.missed > 0 ? 600 : 400 }}>
                        {row.missed}
                      </td>
                      <td>
                        <div className="inline-progress-wrap">
                          <span className={`badge ${row.retentionPct >= 70 ? "badge-success" : "badge-neutral"} tabular-nums`}>
                            {row.retentionPct.toFixed(1)}%
                          </span>
                          <div className="inline-progress-track">
                            <div className="inline-progress-fill" style={{ width: `${row.retentionPct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Gestational & Risk Profile */}
      {showCohort && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div className="card-header" style={{ padding: "1.25rem 1.25rem 0.75rem 1.25rem", marginBottom: 0 }}>
            <div>
              <h2 className="card-title">Cohort Gestational Maturity &amp; Clinical Risk Stratification</h2>
              <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0", fontSize: "0.8125rem" }}>
                Cross-sectional cohort breakdown by gestational age stage with standard vs high-risk triage classification.
              </p>
            </div>
            <span className="badge badge-warning">Risk Stratified</span>
          </div>

          <div style={{ padding: "1.25rem" }}>
            <div className="chart-container-box" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
              <div className="chart-container-box-header">
                <div className="chart-box-title">Standard Risk vs High-Risk Distribution by Stage</div>
                <span className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>Triage Breakdown</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {riskStages.map((r) => (
                  <div key={r.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>{r.chartLabel}</span>
                    <div style={{ display: "flex", height: "12px", background: "var(--bg-surface)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${(r.standard / maxRisk) * 100}%`, background: "#0284c7" }} title={`Standard: ${r.standard}`} />
                      <div style={{ width: `${(r.high / maxRisk) * 100}%`, background: "#ef4444" }} title={`High Risk: ${r.high}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-responsive" style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gestational Stage &amp; Timeline</th>
                    <th style={{ textAlign: "right" }}>Standard Risk</th>
                    <th style={{ textAlign: "right" }}>High-Risk Cohort</th>
                    <th style={{ textAlign: "right" }}>Total Active</th>
                    <th>Clinical Triage Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {riskStages.map((r) => (
                    <tr key={r.label}>
                      <td style={{ fontWeight: 600 }}>{r.label}</td>
                      <td className="tabular-nums" style={{ textAlign: "right" }}>{r.standard}</td>
                      <td className="tabular-nums" style={{ textAlign: "right", color: r.high > 0 ? "#dc2626" : undefined, fontWeight: r.high > 0 ? 700 : 400 }}>
                        {r.high}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: "right", fontWeight: 700 }}>{r.total}</td>
                      <td>
                        <span className={`badge ${r.badgeClass}`}>{r.protocol}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
