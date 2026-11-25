"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface DirectoryParticipantRow {
  id: number;
  fullName: string;
  publicCode: string;
  ageYears: number | null;
  phone: string | null;
  kebele: string;
  status: string;
  riskStatus: string;
  trimester: number | null;
  gaWeeks: number | null;
  gaDays: number | null;
  pncFormatted: string | null;
  eddIso: string | null;
  eddShort: string;
  nextVisitIso: string | null;
  nextVisitShort: string | null;
  nextVisitKind: string | null;
  isOverdue: boolean;
}

type FilterKey =
  | "all"
  | "high-risk"
  | "standard-risk"
  | "trimester-1"
  | "trimester-2"
  | "trimester-3"
  | "overdue";

type SortCol = "name" | "ga" | "edd" | "next-visit" | "status" | "kebele";

export function DirectoryClient({
  rows,
  initialQuery,
}: {
  rows: DirectoryParticipantRow[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryParticipantRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/mothers/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  }

  const counts = {
    all: rows.length,
    "high-risk": rows.filter((r) => r.riskStatus === "high").length,
    "standard-risk": rows.filter((r) => r.riskStatus !== "high").length,
    "trimester-1": rows.filter((r) => r.trimester === 1).length,
    "trimester-2": rows.filter((r) => r.trimester === 2).length,
    "trimester-3": rows.filter((r) => r.trimester === 3).length,
    overdue: rows.filter((r) => r.isOverdue).length,
  };

  const qLower = search.trim().toLowerCase();
  const filtered = rows
    .filter((r) => {
      if (qLower) {
        const hay = `${r.fullName} ${r.publicCode} ${r.kebele} ${r.phone || ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      if (activeFilter === "high-risk") return r.riskStatus === "high";
      if (activeFilter === "standard-risk") return r.riskStatus !== "high";
      if (activeFilter === "trimester-1") return r.trimester === 1;
      if (activeFilter === "trimester-2") return r.trimester === 2;
      if (activeFilter === "trimester-3") return r.trimester === 3;
      if (activeFilter === "overdue") return r.isOverdue;
      return true;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortCol) {
        case "name":
          return a.fullName.localeCompare(b.fullName) * dir;
        case "ga":
          return ((a.gaWeeks ?? -1) - (b.gaWeeks ?? -1)) * dir;
        case "edd":
          return (a.eddIso || "").localeCompare(b.eddIso || "") * dir;
        case "next-visit":
          return (a.nextVisitIso || "9999").localeCompare(b.nextVisitIso || "9999") * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "kebele":
          return a.kebele.localeCompare(b.kebele) * dir;
      }
    });

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortAsc((v) => !v);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Participant Directory
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Active pregnant mothers and postpartum cases under Wolkite &amp; Jimma Primary Health Program.
          </p>
        </div>
        <Link href="/participants/new" className="btn btn-primary btn-enroll-action">
          <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Enroll New Mother</span>
        </Link>
      </div>

      {/* Search & Filter Chips Card */}
      <div className="card" style={{ padding: "16px 18px", marginBottom: "14px" }}>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 280px", position: "relative" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              placeholder="Search by name, facility card number, or kebele..."
              style={{ paddingLeft: "2.25rem", minHeight: "44px" }}
            />
            <svg
              className="icon-svg sm"
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", padding: "0 18px" }}>
              Search
            </button>
            {(search || activeFilter !== "all") && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: "44px" }}
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* 7 Django Filter Chips */}
        <div
          className="filter-chips-row"
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "4px" }}>
            Filter:
          </span>

          <button type="button" className={`filter-chip ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
            <span>All</span>
            <span className="chip-count-pill tabular-nums">{counts.all}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "high-risk" ? "active" : ""}`} onClick={() => setActiveFilter("high-risk")}>
            <span className="status-dot dot-urgent" style={{ width: "6px", height: "6px" }} />
            <span>High Risk</span>
            <span className="chip-count-pill tabular-nums">{counts["high-risk"]}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "standard-risk" ? "active" : ""}`} onClick={() => setActiveFilter("standard-risk")}>
            <span>Standard</span>
            <span className="chip-count-pill tabular-nums">{counts["standard-risk"]}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "trimester-1" ? "active" : ""}`} onClick={() => setActiveFilter("trimester-1")}>
            <span>1st Trimester</span>
            <span className="chip-count-pill tabular-nums">{counts["trimester-1"]}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "trimester-2" ? "active" : ""}`} onClick={() => setActiveFilter("trimester-2")}>
            <span>2nd Trimester</span>
            <span className="chip-count-pill tabular-nums">{counts["trimester-2"]}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "trimester-3" ? "active" : ""}`} onClick={() => setActiveFilter("trimester-3")}>
            <span>3rd Trimester</span>
            <span className="chip-count-pill tabular-nums">{counts["trimester-3"]}</span>
          </button>

          <button type="button" className={`filter-chip ${activeFilter === "overdue" ? "active" : ""}`} onClick={() => setActiveFilter("overdue")}>
            <svg className="icon-svg xs" style={{ color: "var(--status-urgent-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Overdue</span>
            <span className="chip-count-pill tabular-nums">{counts.overdue}</span>
          </button>
        </div>
      </div>

      {/* Aligned Sortable CSS Grid Table */}
      <div className="directory-table-wrap">
        <div className="directory-grid-header" role="row">
          {(
            [
              { col: "name", label: "Name / Card" },
              { col: "ga", label: "GA (Weeks)" },
              { col: "edd", label: "EDD" },
              { col: "next-visit", label: "Next visit due" },
              { col: "status", label: "Status" },
              { col: "kebele", label: "Kebele" },
            ] as Array<{ col: SortCol; label: string }>
          ).map(({ col, label }) => (
            <div key={col}>
              <button
                type="button"
                className="directory-th-btn"
                onClick={() => handleSort(col)}
                aria-sort={sortCol === col ? (sortAsc ? "ascending" : "descending") : "none"}
              >
                <span>{label}</span>
                <svg className="icon-svg xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
                </svg>
              </button>
            </div>
          ))}
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
            No enrolled mothers match this filter.
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="directory-grid-row" role="row">
              <div className="directory-cell">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Link
                    href={`/participants/${p.id}`}
                    style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {p.fullName}
                  </Link>
                  <span className="mrn-badge tabular-nums">{p.publicCode}</span>
                </div>
                {p.ageYears !== null && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {p.ageYears} years
                  </div>
                )}
              </div>

              <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem" }}>
                {p.gaWeeks !== null ? (
                  <>
                    <span className="badge badge-info" style={{ marginRight: "6px" }}>T{p.trimester}</span>
                    <strong>{p.gaWeeks}w {p.gaDays}d</strong>
                  </>
                ) : p.pncFormatted ? (
                  <span>{p.pncFormatted}</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                )}
              </div>

              <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {p.eddShort}
              </div>

              <div className="directory-cell tabular-nums" style={{ fontSize: "0.875rem" }}>
                {p.nextVisitShort ? (
                  p.isOverdue ? (
                    <span className="badge badge-urgent">
                      {p.nextVisitKind?.toUpperCase()} &bull; Overdue
                    </span>
                  ) : (
                    <span>
                      <strong>{p.nextVisitKind?.toUpperCase()}</strong> &middot; {p.nextVisitShort}
                    </span>
                  )
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>&mdash;</span>
                )}
              </div>

              <div className="directory-cell">
                {p.riskStatus === "high" && <span className="badge badge-urgent">High Risk</span>}
                {p.status === "postnatal" && <span className="badge badge-success">Postnatal</span>}
                {p.status === "completed" && <span className="badge badge-neutral">Graduated</span>}
                {p.status === "opted_out" && <span className="badge badge-warning">Opted out</span>}
                {p.status === "loss" && <span className="badge badge-urgent">Loss</span>}
              </div>

              <div className="directory-cell" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {p.kebele}
              </div>

              <div className="directory-cell" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                <Link href={`/participants/${p.id}`} className="btn btn-outline btn-view-profile">
                  View &rsaquo;
                </Link>
                <div className={`dropdown-wrapper ${openMenuId === p.id ? "open" : ""}`}>
                  <button
                    type="button"
                    className="dropdown-trigger"
                    style={{ minHeight: "40px", minWidth: "40px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                    aria-label="More options"
                  >
                    <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                  {openMenuId === p.id && (
                    <div className="dropdown-menu" style={{ display: "block" }}>
                      <button
                        type="button"
                        className="dropdown-item text-danger"
                        onClick={() => {
                          setOpenMenuId(null);
                          setDeleteTarget(p);
                        }}
                      >
                        <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete Record...</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
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
                Delete Participant Record
              </h3>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Are you sure you want to permanently delete{" "}
              <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.fullName}</strong>{" "}
              (<span style={{ fontFamily: "monospace" }}>{deleteTarget.publicCode}</span>)? All scheduled appointments and SMS dispatches will be removed.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: "44px", padding: "0 16px" }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: "44px", padding: "0 18px", background: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }}
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
