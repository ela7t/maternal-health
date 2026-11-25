"use client";

import { Fragment, useState } from "react";
import Link from "next/link";

export interface OutboxLogRow {
  id: number;
  participantId: number;
  participantName: string;
  publicCode: string;
  phone: string | null;
  phoneOwner: string | null;
  category: string;
  messageContent: string;
  segments: number;
  status: string;
  gatewayMsgId: string | null;
  failureReason: string | null;
  scheduledAtLabel: string;
}

export function OutboxLogClient({ rows }: { rows: OutboxLogRow[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const deliveredCount = rows.filter((r) => ["delivered", "submitted"].includes(r.status)).length;
  const sentCount = rows.filter((r) => r.status === "sent").length;
  const queuedCount = rows.filter((r) => ["pending", "queued"].includes(r.status)).length;
  const failedCount = rows.filter((r) => r.status === "failed").length;

  const filtered = rows.filter((r) => {
    if (statusFilter === "delivered" && !["delivered", "submitted"].includes(r.status)) return false;
    if (statusFilter === "sent" && r.status !== "sent") return false;
    if (statusFilter === "queued" && !["pending", "queued"].includes(r.status)) return false;
    if (statusFilter === "failed" && r.status !== "failed") return false;
    if (statusFilter === "cancelled" && r.status !== "cancelled") return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  return (
    <>
      {/* Filters Card */}
      <div className="card" style={{ marginBottom: "20px", padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label className="form-label">Delivery Status</label>
            <select
              className="form-select"
              style={{ minHeight: "42px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent (In-Flight)</option>
              <option value="delivered">Delivered (Confirmed DLR)</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled / Opt-Out</option>
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label className="form-label">Message Category</label>
            <select
              className="form-select"
              style={{ minHeight: "42px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ minHeight: "42px" }}
            onClick={() => {
              setStatusFilter("all");
              setCategoryFilter("");
            }}
          >
            Reset
          </button>
        </div>

        {/* Quick View Status Chips */}
        <div
          className="filter-chips-row"
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "4px" }}>
            Quick View:
          </span>
          <button type="button" className={`filter-chip ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            All ({rows.length})
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "delivered" ? "active" : ""}`} onClick={() => setStatusFilter("delivered")}>
            <span className="status-dot dot-success" style={{ width: "6px", height: "6px" }} />
            Delivered ({deliveredCount})
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "sent" ? "active" : ""}`} onClick={() => setStatusFilter("sent")}>
            <span className="status-dot" style={{ width: "6px", height: "6px", backgroundColor: "var(--status-info-accent)" }} />
            Sent ({sentCount})
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "queued" ? "active" : ""}`} onClick={() => setStatusFilter("queued")}>
            <span className="status-dot" style={{ width: "6px", height: "6px", backgroundColor: "var(--text-muted)" }} />
            Queued ({queuedCount})
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "failed" ? "active" : ""}`} onClick={() => setStatusFilter("failed")}>
            <span className="status-dot dot-urgent" style={{ width: "6px", height: "6px" }} />
            Failed ({failedCount})
          </button>
        </div>
      </div>

      {/* Expandable Messages Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Category</th>
                <th>Planned / Sent</th>
                <th>Status</th>
                <th>Route</th>
                <th>Message Content</th>
                <th style={{ width: "36px" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((msg) => {
                const isExpanded = expandedId === msg.id;
                return (
                  <Fragment key={msg.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <Link
                          href={`/participants/${msg.participantId}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", display: "block" }}
                        >
                          {msg.participantName}
                        </Link>
                        <span className="mrn-badge tabular-nums" style={{ marginTop: "3px", display: "inline-block" }}>
                          {msg.publicCode}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {msg.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {msg.scheduledAtLabel}
                      </td>
                      <td>
                        {["delivered", "submitted"].includes(msg.status) && <span className="badge badge-success">Delivered</span>}
                        {msg.status === "sent" && <span className="badge badge-info">Sent</span>}
                        {["pending", "queued"].includes(msg.status) && <span className="badge badge-neutral">Queued</span>}
                        {msg.status === "failed" && <span className="badge badge-urgent">Failed</span>}
                        {msg.status === "cancelled" && <span className="badge badge-neutral">Cancelled</span>}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        AfroMessage
                      </td>
                      <td style={{ maxWidth: "340px", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                        {msg.messageContent.length > 72 ? `${msg.messageContent.slice(0, 72)}...` : msg.messageContent}
                      </td>
                      <td style={{ color: "var(--text-muted)", textAlign: "center" }}>
                        {isExpanded ? "▾" : "▸"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ background: "var(--bg-subtle)", padding: "14px 18px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "0.8125rem" }}>
                            <div>
                              <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Full Message ({msg.segments} seg)</strong>
                              <div style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>{msg.messageContent}</div>
                            </div>
                            <div>
                              <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Telemetry</strong>
                              <div>Phone: <span className="tabular-nums">{msg.phone || "—"}</span> ({msg.phoneOwner || "self"})</div>
                              <div>Gateway Ref: <code>{msg.gatewayMsgId || "Pending"}</code></div>
                              {msg.failureReason && (
                                <div style={{ color: "var(--status-urgent-text)", marginTop: "4px" }}>Reason: {msg.failureReason}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No messages match your filter criteria.
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
