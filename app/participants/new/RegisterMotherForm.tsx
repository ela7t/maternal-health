"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Facility {
  id: number;
  name: string;
}

interface EthDate {
  year: number;
  month: number;
  day: number;
}

const ETH_MONTHS = [
  "Meskerem (መስከረም)",
  "Tikimt (ጥቅምት)",
  "Hidar (ህዳር)",
  "Tahsas (ታህሳስ)",
  "Tir (ጥር)",
  "Yakatit (የካቲት)",
  "Megabit (መጋቢት)",
  "Miyazya (ሚያዝያ)",
  "Ginbot (ግንቦት)",
  "Sene (ሰኔ)",
  "Hamle (ሐምሌ)",
  "Nehase (ነሐሴ)",
  "Pagume (ጳጉሜ)",
];

export function RegisterMotherForm({
  facilities,
  todayEth,
}: {
  facilities: Facility[];
  todayEth: EthDate;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [calendarType, setCalendarType] = useState<"ethiopian" | "gregorian">("ethiopian");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Identity & language
  const [fullName, setFullName] = useState("");
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ? String(facilities[0].id) : "");
  const [kebele, setKebele] = useState("");
  const [language, setLanguage] = useState("am");

  // Step 2: Contact & consent
  const [phone, setPhone] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("self");
  const [smsConsent, setSmsConsent] = useState(true);

  // Step 3: Dating & schedule
  const [ethYear, setEthYear] = useState(todayEth.year);
  const [ethMonth, setEthMonth] = useState(todayEth.month);
  const [ethDay, setEthDay] = useState(todayEth.day);
  const [gregDate, setGregDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStep(1);
      setError("Full name is required.");
      return;
    }
    if (!phone.trim()) {
      setStep(2);
      setError("Primary phone number is required.");
      return;
    }
    if (!smsConsent) {
      setStep(2);
      setError("Verbal or written SMS consent must be confirmed before enrollment.");
      return;
    }
    if (calendarType === "gregorian" && !gregDate) {
      setStep(3);
      setError("Please select the Last Menstrual Period (LMP) date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/mothers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          facilityId,
          kebele,
          phone,
          phoneOwner,
          language,
          calendarType,
          ethYear,
          ethMonth,
          ethDay,
          gregDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register mother");
      }

      router.push(`/participants/${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Django 3-Step Clinical Stepper */}
      <div className="stepper" style={{ marginBottom: "1.75rem" }}>
        {[
          { num: 1 as const, label: "Identity & language" },
          { num: 2 as const, label: "Contact & consent" },
          { num: 3 as const, label: "Dating & schedule" },
        ].map((s) => (
          <div
            key={s.num}
            className={`step-item ${step === s.num ? "active" : step > s.num ? "completed" : ""}`}
            onClick={() => setStep(s.num)}
            style={{ cursor: "pointer", minHeight: "44px" }}
          >
            <div className="step-circle">{step > s.num ? "✓" : s.num}</div>
            <div className="step-label">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert-box alert-danger" style={{ marginBottom: "1.25rem" }}>
          <div>{error}</div>
        </div>
      )}

      {/* STEP 1: Identity & Language */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: "0 0 1.25rem", color: "var(--text-primary)" }}>
            Participant Demographics &amp; Preferences
          </h2>

          <div className="form-group">
            <label className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Participant full legal or clinical name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                Assigned Health Facility <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kebele / Residence</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kebele 03"
                value={kebele}
                onChange={(e) => setKebele(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Preferred SMS Language <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="am">Amharic (አማርኛ)</option>
                <option value="en">English</option>
                <option value="gurage">Gurage</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: "44px", padding: "0 20px" }}
              onClick={() => {
                if (!fullName.trim()) {
                  setError("Please enter the mother's full name.");
                  return;
                }
                setError(null);
                setStep(2);
              }}
            >
              Next: Contact &amp; consent &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Contact & Consent */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: "0 0 1.25rem", color: "var(--text-primary)" }}>
            Telephony &amp; SMS Consent
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                Primary Phone Number (Ethiopia E.164) <span className="required">*</span>
              </label>
              <input
                type="tel"
                className="form-input"
                required
                placeholder="+251911223344 or 0911223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <div className="form-hint">Used for automated 72h visit reminders &amp; weekly maternal education.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Ownership</label>
              <select
                className="form-select"
                value={phoneOwner}
                onChange={(e) => setPhoneOwner(e.target.value)}
              >
                <option value="self">Own phone</option>
                <option value="husband">Husband&apos;s phone</option>
                <option value="family">Family / Relative phone</option>
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: "0.5rem",
              padding: "1rem",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                style={{ marginTop: "3px", width: "18px", height: "18px" }}
              />
              <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.45 }}>
                <strong>Informed SMS Consent Confirmed</strong>
                <span style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "2px" }}>
                  Participant verbally consented to receive non-diagnostic antenatal/postnatal SMS reminders (reply STOP / አቁም to opt out at any time).
                </span>
              </span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", gap: "0.75rem" }}>
            <button type="button" className="btn btn-outline" style={{ minHeight: "44px" }} onClick={() => setStep(1)}>
              &larr; Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: "44px", padding: "0 20px" }}
              onClick={() => {
                if (!phone.trim()) {
                  setError("Please enter a phone number.");
                  return;
                }
                if (!smsConsent) {
                  setError("Please confirm informed SMS consent.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
            >
              Next: Dating &amp; schedule &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Clinical Dating & Schedule */}
      {step === 3 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Last Menstrual Period (LMP) &amp; WHO Schedule
            </h2>
            <div className="cal-toggle-group" role="group" aria-label="Calendar system">
              <button
                type="button"
                className={`cal-toggle-btn ${calendarType === "ethiopian" ? "active" : ""}`}
                style={{ minHeight: "40px" }}
                onClick={() => setCalendarType("ethiopian")}
              >
                Ethiopian (ዓ.ም)
              </button>
              <button
                type="button"
                className={`cal-toggle-btn ${calendarType === "gregorian" ? "active" : ""}`}
                style={{ minHeight: "40px" }}
                onClick={() => setCalendarType("gregorian")}
              >
                Gregorian (GC)
              </button>
            </div>
          </div>

          {calendarType === "ethiopian" ? (
            <div className="ethiopian-picker-card" style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="ethiopian-date-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Year (ዓ.ም)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={ethYear}
                    onChange={(e) => setEthYear(Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Month</label>
                  <select
                    className="form-select"
                    value={ethMonth}
                    onChange={(e) => setEthMonth(Number(e.target.value))}
                  >
                    {ETH_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Day</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={30}
                    value={ethDay}
                    onChange={(e) => setEthDay(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                LMP Date (Gregorian) <span className="required">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={gregDate}
                onChange={(e) => setGregDate(e.target.value)}
                required
              />
            </div>
          )}

          <div
            style={{
              padding: "0.875rem 1rem",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
            }}
          >
            Enrolling automatically computes the Expected Delivery Date (EDD), creates the 8-contact WHO 2016 ANC schedule, and queues 72-hour SMS reminders.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", gap: "0.75rem" }}>
            <button type="button" className="btn btn-outline" style={{ minHeight: "44px" }} onClick={() => setStep(2)}>
              &larr; Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: "44px", padding: "0 22px", fontWeight: 600 }}
              disabled={submitting}
            >
              {submitting ? "Enrolling..." : "Complete Enrollment"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
