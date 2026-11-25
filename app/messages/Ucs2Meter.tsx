"use client";

import { useState } from "react";
import { calculateSmsSegments } from "@/lib/smsEncoding";

export function Ucs2Meter() {
  const [text, setText] = useState(
    "ጤና ይስጥልኝ! በእርግዝና ወቅት የተመጣጠነ ምግብ መመገብ አስፈላጊ ነው።"
  );

  const calc = calculateSmsSegments(text);
  const maxInSegment = calc.encoding === "UCS-2" ? 70 : 160;
  const currentInSeg =
    calc.charCount %
      (calc.encoding === "UCS-2"
        ? calc.segmentCount > 1
          ? 67
          : 70
        : calc.segmentCount > 1
        ? 153
        : 160) || maxInSegment;
  const pct = Math.min(100, Math.round((currentInSeg / maxInSegment) * 100));

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.25rem 0" }}>
          Interactive Ge&apos;ez / Amharic SMS length &amp; billing meter
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
          Ethio Telecom and Safaricom bill Ge&apos;ez text under{" "}
          <strong>UCS-2 encoding (70 characters per segment)</strong> instead of 160 characters for English.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", alignItems: "start" }}>
        <div>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Type or paste Amharic / English text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div style={{ height: "6px", background: "var(--bg-muted)", borderRadius: "9999px", overflow: "hidden", marginTop: "8px" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: pct > 85 ? "var(--status-warning-accent)" : "var(--status-success-accent)",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>

        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Encoding format</span>
            <span className={`badge ${calc.isUnicode ? "badge-warning" : "badge-info"}`}>
              {calc.encoding} {calc.isUnicode ? "(Ge'ez)" : "(GSM-7)"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Length</span>
            <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{calc.charCount} characters</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Billable segments</span>
            <span className="badge badge-success tabular-nums">
              {calc.segmentCount} {calc.segmentCount === 1 ? "segment" : "segments"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Remaining in segment</span>
            <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
              {calc.charsRemainingInSegment} chars
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
