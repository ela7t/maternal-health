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
    <div className="card-custom p-4 mb-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <i className="bi bi-chat-text text-teal" style={{ color: "var(--app-primary)" }}></i>
            <span>Interactive Ge&apos;ez / Amharic SMS Length & Billing Meter</span>
          </h5>
          <p className="text-secondary small mb-0">
            Ethio Telecom and Safaricom bill Ge&apos;ez text under{" "}
            <strong>UCS-2 encoding (70 characters per segment)</strong> instead of 160 characters for English. Test any draft below:
          </p>
        </div>
      </div>

      <div className="row g-3 align-items-center">
        <div className="col-lg-8">
          <textarea
            className="form-control"
            rows={3}
            placeholder="Type or paste Amharic / English text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Character progress bar */}
          <div className="progress mt-2" style={{ height: 6 }}>
            <div
              className={`progress-bar ${pct > 85 ? "bg-warning" : "bg-success"}`}
              role="progressbar"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="p-3 rounded border bg-light">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-secondary small">Encoding Format:</span>
              <span className="badge bg-dark fw-semibold">
                {calc.encoding} {calc.isUnicode ? "(Ge'ez)" : "(GSM-7)"}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-secondary small">Length:</span>
              <span className="fw-bold text-slate-900">{calc.charCount} characters</span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-secondary small">Billable Segments:</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle fs-6 px-2 py-1">
                {calc.segmentCount} Segment{calc.segmentCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-secondary small">Remaining in Segment:</span>
              <span className="fw-semibold text-secondary">
                {calc.charsRemainingInSegment} chars
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
