"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface TemplateItem {
  id: number;
  variantId: number;
  code: string;
  stream: string;
  topic: string;
  language: string;
  framing: string;
  approvalStatus: string;
  body: string;
  segmentCount: number;
}

const STAGE_LABELS: Record<string, string> = {
  anc_reminder: "Antenatal Reminder",
  pnc_reminder: "Postnatal Reminder",
  educational: "Educational",
  reschedule: "Reschedule",
  supportive: "Supportive",
};

const LANG_LABELS: Record<string, string> = {
  am: "Amharic",
  en: "English",
  gurage: "Gurage",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  in_review: "In Review",
  draft: "Draft",
  retired: "Retired",
};

function isUnicodeText(text: string): boolean {
  return /[^\u0000-\u007F]/.test(text);
}

function formatTopic(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TemplatesListClient({ items }: { items: TemplateItem[] }) {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Applied filters (on clicking Filter button, or live)
  const [applied, setApplied] = useState({
    stage: "",
    topic: "",
    lang: "",
    status: "",
  });

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [retireTarget, setRetireTarget] = useState<TemplateItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const uniqueStages = Array.from(new Set(items.map((i) => i.stream))).sort();
  const uniqueTopics = Array.from(new Set(items.map((i) => i.topic))).sort();
  const uniqueLangs = Array.from(new Set(items.map((i) => i.language))).sort();

  const filtered = items.filter((item) => {
    if (applied.stage && item.stream !== applied.stage) return false;
    if (applied.topic && item.topic !== applied.topic) return false;
    if (applied.lang && item.language !== applied.lang) return false;
    if (applied.status && item.approvalStatus !== applied.status) return false;
    return true;
  });

  async function updateStatus(templateId: number, action: "submit_review" | "approve" | "retire") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: templateId, action }),
      });
      if (!res.ok) throw new Error("Failed to update template");
      setRetireTarget(null);
      setOpenMenuId(null);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            Message Template Repository
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Clinical reminders and educational message templates for pregnancy and postnatal care.
          </p>
        </div>
        <div>
          <Link href="/messages/new" className="btn btn-primary" style={{ minHeight: "44px" }}>
            <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create New Template</span>
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({
              stage: stageFilter,
              topic: topicFilter,
              lang: langFilter,
              status: statusFilter,
            });
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr)) 100px",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Care Stage</label>
            <select
              className="form-select"
              style={{ minHeight: "40px", fontSize: "0.8125rem" }}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {uniqueStages.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s] || formatTopic(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Topic</label>
            <select
              className="form-select"
              style={{ minHeight: "40px", fontSize: "0.8125rem" }}
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="">All Topics</option>
              {uniqueTopics.map((t) => (
                <option key={t} value={t}>
                  {formatTopic(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Language</label>
            <select
              className="form-select"
              style={{ minHeight: "40px", fontSize: "0.8125rem" }}
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
            >
              <option value="">All Languages</option>
              {uniqueLangs.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l] || l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Approval Status</label>
            <select
              className="form-select"
              style={{ minHeight: "40px", fontSize: "0.8125rem" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="in_review">In Review</option>
              <option value="draft">Draft</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <button type="submit" className="btn btn-outline" style={{ minHeight: "40px" }}>
            Filter
          </button>
        </form>
      </div>

      {/* Templates Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {filtered.map((t) => {
          const unicode = isUnicodeText(t.body);
          const statusBadgeClass =
            t.approvalStatus === "approved"
              ? "badge-success"
              : t.approvalStatus === "in_review"
              ? "badge-warning"
              : t.approvalStatus === "retired"
              ? "badge-neutral"
              : "badge-info";

          return (
            <div key={t.variantId} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                    <strong style={{ fontSize: "1rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {t.code}_{t.language.toUpperCase()}
                    </strong>
                    <span className={`badge ${statusBadgeClass}`}>
                      {STATUS_LABELS[t.approvalStatus] || t.approvalStatus}
                    </span>
                    <span className="badge badge-neutral">{LANG_LABELS[t.language] || t.language}</span>
                    <span className="badge badge-info">{formatTopic(t.topic)}</span>
                    {t.framing && (
                      <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>
                        {t.framing}
                      </span>
                    )}
                  </div>

                  {/* Quote Box */}
                  <div
                    style={{
                      margin: "0.625rem 0",
                      fontSize: "0.9375rem",
                      color: "var(--text-primary)",
                      backgroundColor: "var(--bg-subtle)",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;{t.body}&rdquo;
                  </div>

                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      gap: "1.25rem",
                      flexWrap: "wrap",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span>
                      Encoding:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {unicode ? "Unicode (UCS-2)" : "GSM-7"}
                      </strong>
                    </span>
                    <span>
                      Length:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>{t.body.length} chars</strong>
                    </span>
                    <span>
                      Parts:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {t.segmentCount} SMS {t.segmentCount === 1 ? "part" : "parts"}
                      </strong>
                    </span>
                    <span>
                      Version: <strong style={{ color: "var(--text-primary)" }}>v1</strong>
                    </span>
                    {t.approvalStatus === "approved" && (
                      <span>
                        Approved by: <strong style={{ color: "var(--text-primary)" }}>admin</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Approval Actions & Overflow Menu */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  {t.approvalStatus === "approved" && (
                    <span
                      className="badge badge-success"
                      style={{ minHeight: "40px", padding: "0 12px", fontWeight: 600, fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Approved</span>
                    </span>
                  )}
                  {t.approvalStatus === "draft" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: "44px", padding: "0 16px", fontWeight: 600 }}
                      disabled={submitting}
                      onClick={() => updateStatus(t.id, "submit_review")}
                    >
                      Submit for Review
                    </button>
                  )}
                  {t.approvalStatus === "in_review" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ minHeight: "44px", padding: "0 18px", fontWeight: 600 }}
                      disabled={submitting}
                      onClick={() => updateStatus(t.id, "approve")}
                    >
                      ✓ Approve
                    </button>
                  )}

                  {t.approvalStatus !== "retired" && (
                    <div className={`dropdown-wrapper ${openMenuId === t.variantId ? "open" : ""}`}>
                      <button
                        type="button"
                        className="dropdown-trigger"
                        style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => setOpenMenuId((cur) => (cur === t.variantId ? null : t.variantId))}
                        aria-label="More options"
                      >
                        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                      {openMenuId === t.variantId && (
                        <div className="dropdown-menu" style={{ display: "block" }}>
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              setRetireTarget(t);
                            }}
                          >
                            <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Retire Template...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <p style={{ marginBottom: "1rem" }}>No templates found matching your filter criteria.</p>
            <Link href="/messages/new" className="btn btn-primary">
              + Create First Template
            </Link>
          </div>
        )}
      </div>

      {/* Retire Confirmation Modal */}
      {retireTarget && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setRetireTarget(null)}
        >
          <div className="card modal-content" style={{ maxWidth: "460px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0 }}>
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Retire Template
              </h3>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Are you sure you want to retire template{" "}
              <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{retireTarget.code}</strong>? It will no longer be dispatched for future appointments or automated reminders.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: "44px", padding: "0 16px" }}
                onClick={() => setRetireTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: "44px", padding: "0 18px", background: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }}
                disabled={submitting}
                onClick={() => updateStatus(retireTarget.id, "retire")}
              >
                {submitting ? "Retiring..." : "Confirm Retire"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
