"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateSmsSegments } from "@/lib/smsEncoding";

export default function NewTemplatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [stream, setStream] = useState("educational");
  const [topic, setTopic] = useState("nutrition");
  const [language, setLanguage] = useState("am");
  const [framing, setFraming] = useState("gain");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = calculateSmsSegments(text);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, stream, topic, language, framing, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      router.push("/messages");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save template");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/messages"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            minHeight: "44px",
          }}
        >
          <span>&larr; Back to template library</span>
        </Link>
        <h1 className="page-title" style={{ margin: "0.25rem 0 0 0" }}>
          Author message template
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
          Create clinical reminder or educational message templates with real-time part counting and privacy enforcement.
        </p>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        {error && (
          <div className="alert-box alert-danger" style={{ marginBottom: "1rem" }}>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                Template code <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. ANC_REMINDER_72H"
                style={{ textTransform: "uppercase", fontFamily: "monospace" }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target language</label>
              <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="am">Amharic (አማርኛ)</option>
                <option value="en">English</option>
                <option value="gurage">Gurage</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Care stream</label>
              <select className="form-select" value={stream} onChange={(e) => setStream(e.target.value)}>
                <option value="educational">Educational</option>
                <option value="anc_reminder">ANC Reminder</option>
                <option value="pnc_reminder">PNC Reminder</option>
                <option value="reschedule">Reschedule</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Clinical topic</label>
              <input
                type="text"
                className="form-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Behavioral framing</label>
              <select className="form-select" value={framing} onChange={(e) => setFraming(e.target.value)}>
                <option value="gain">Gain-framed (benefits)</option>
                <option value="loss">Loss-framed (cautions)</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Message body template <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              required
              placeholder="Reminder from {facility}: your ANC visit is on {weekday}. Reply STOP to opt out."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div className="tabular-nums">
              Characters: <strong>{calc.charCount}</strong> &bull; Segments:{" "}
              <strong>{calc.segmentCount}</strong>
            </div>
            <span className={`badge ${calc.isUnicode ? "badge-warning" : "badge-info"}`}>
              {calc.encoding}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Link href="/messages" className="btn btn-outline" style={{ minHeight: "44px" }}>
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minHeight: "44px" }}>
              {submitting ? "Saving..." : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
