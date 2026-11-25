"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateGestationalAge,
  ethiopianToGregorian,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopianCalendar";

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

function addDaysIso(isoDate: string, days: number): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RegisterMotherForm({
  facilities,
  todayEth,
}: {
  facilities: Facility[];
  todayEth: EthDate;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dobCalType, setDobCalType] = useState<"gregorian" | "ethiopian">("gregorian");
  const [calendarType, setCalendarType] = useState<"gregorian" | "ethiopian">("gregorian");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Identity & language
  const [studyCode, setStudyCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobEthYear, setDobEthYear] = useState(todayEth.year - 24);
  const [dobEthMonth, setDobEthMonth] = useState(1);
  const [dobEthDay, setDobEthDay] = useState(1);
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ? String(facilities[0].id) : "");
  const [kebele, setKebele] = useState("");
  const [address, setAddress] = useState("");
  const [language, setLanguage] = useState("am");
  const [preferredTime, setPreferredTime] = useState("morning");

  // Step 2: Contact & consent
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("self");
  const [consentMethod, setConsentMethod] = useState("Verbal Consent");
  const [smsConsent, setSmsConsent] = useState(true);

  // Step 3: Dating & schedule
  const [datingMethod, setDatingMethod] = useState("lmp");
  const [gregDate, setGregDate] = useState("");
  const [eddDate, setEddDate] = useState("");
  const [ethYear, setEthYear] = useState(todayEth.year);
  const [ethMonth, setEthMonth] = useState(todayEth.month);
  const [ethDay, setEthDay] = useState(todayEth.day);
  const [gravida, setGravida] = useState("1");
  const [parity, setParity] = useState("0");
  const [riskStatus, setRiskStatus] = useState("low");

  // Compute live clinical dating preview
  let computedEdd: Date | null = null;
  if (calendarType === "gregorian") {
    if (eddDate) {
      const d = new Date(eddDate);
      if (!Number.isNaN(d.getTime())) computedEdd = d;
    } else if (gregDate) {
      const d = new Date(addDaysIso(gregDate, 280));
      if (!Number.isNaN(d.getTime())) computedEdd = d;
    }
  } else if (ethYear && ethMonth && ethDay) {
    try {
      const lmpG = ethiopianToGregorian(ethYear, ethMonth, ethDay);
      computedEdd = new Date(lmpG.getTime() + 280 * 24 * 3600 * 1000);
    } catch {
      computedEdd = null;
    }
  }

  const computedGa = computedEdd ? calculateGestationalAge(computedEdd) : null;
  const computedEddEth = computedEdd ? formatEthiopianDate(gregorianToEthiopian(computedEdd), "am") : "";
  const computedEddIso = computedEdd ? computedEdd.toISOString().slice(0, 10) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStep(1);
      setError("Full Name is required.");
      return;
    }
    if (!phone.trim()) {
      setStep(2);
      setError("Primary Mobile Phone Number is required.");
      return;
    }
    if (!smsConsent) {
      setStep(2);
      setError("Participant SMS consent must be confirmed.");
      return;
    }
    if (calendarType === "gregorian" && !gregDate && !eddDate) {
      setStep(3);
      setError("Please enter LMP or EDD date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/mothers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyCode: studyCode.trim() || undefined,
          fullName,
          dateOfBirth: dateOfBirth || undefined,
          facilityId,
          kebele: kebele || "Kebele 01",
          address,
          language,
          preferredTime,
          phone,
          altPhone,
          phoneOwner,
          consentMethod,
          calendarType,
          datingMethod,
          gregDate,
          eddDate,
          ethYear,
          ethMonth,
          ethDay,
          gravida,
          parity,
          riskStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register mother");
      }

      const newId = data.participantId ?? data.id;
      router.push(`/participants/${newId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Django 3-Step Clinical Stepper */}
      <div className="stepper" style={{ marginBottom: "1.25rem" }}>
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
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Participant Demographics &amp; Preferences</span>
            </h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Facility Card / Medical Record No (MRN) <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. MRN-10423"
              value={studyCode}
              onChange={(e) => setStudyCode(e.target.value)}
            />
            <div className="form-hint">Unique identifier matching the health center paper chart.</div>
          </div>

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

          {/* Date of Birth with Gregorian / Ethiopian Toggle */}
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Date of Birth (Calendar) <span className="required">*</span></span>
              </label>
              <div className="cal-toggle-group" role="group" aria-label="DOB Calendar system selector">
                <button
                  type="button"
                  className={`cal-toggle-btn ${dobCalType === "gregorian" ? "active" : ""}`}
                  style={{ minHeight: "40px" }}
                  onClick={() => setDobCalType("gregorian")}
                >
                  Gregorian (GC)
                </button>
                <button
                  type="button"
                  className={`cal-toggle-btn ${dobCalType === "ethiopian" ? "active" : ""}`}
                  style={{ minHeight: "40px" }}
                  onClick={() => setDobCalType("ethiopian")}
                >
                  Ethiopian (ዓ.ም)
                </button>
              </div>
            </div>

            {dobCalType === "gregorian" ? (
              <input
                type="date"
                className="form-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            ) : (
              <div className="ethiopian-picker-card" style={{ padding: "0.85rem" }}>
                <div className="ethiopian-date-grid">
                  <input type="number" className="form-input" value={dobEthYear} onChange={(e) => setDobEthYear(Number(e.target.value))} placeholder="Year" />
                  <select className="form-select" value={dobEthMonth} onChange={(e) => setDobEthMonth(Number(e.target.value))}>
                    {ETH_MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <input type="number" className="form-input" min={1} max={30} value={dobEthDay} onChange={(e) => setDobEthDay(Number(e.target.value))} placeholder="Day" />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                Kebele <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kebele 04"
                value={kebele}
                onChange={(e) => setKebele(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address / Landmark for Tracing</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Near primary school, House 210"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                SMS Language Preference <span className="required">*</span>
              </label>
              <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="am">Amharic</option>
                <option value="en">English</option>
                <option value="gurage">Gurage</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Preferred Dispatch Window <span className="required">*</span>
              </label>
              <select className="form-select" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                <option value="morning">Morning (8:00 - 10:00)</option>
                <option value="afternoon">Afternoon (12:00 - 16:00)</option>
                <option value="evening">Evening (17:00 - 19:00)</option>
              </select>
            </div>
          </div>

          {facilities.length > 1 && (
            <div className="form-group">
              <label className="form-label">Assigned Health Facility</label>
              <select className="form-select" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
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
              <span>Continue to Contact &amp; Consent &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Contact & Informed Consent */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Mobile Phone &amp; Informed Consent</span>
            </h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Primary Mobile Phone Number <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="0911223344 or +251911223344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="form-hint">
              Ethio Telecom (09...) or Safaricom (07...). Stored in international format (+251...).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alternative Mobile Phone (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 0922334455"
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">
                Handset Ownership <span className="required">*</span>
              </label>
              <select className="form-select" value={phoneOwner} onChange={(e) => setPhoneOwner(e.target.value)}>
                <option value="self">Own phone</option>
                <option value="husband">Husband&apos;s phone</option>
                <option value="family">Family phone</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Consent Recording Method <span className="required">*</span>
              </label>
              <select className="form-select" value={consentMethod} onChange={(e) => setConsentMethod(e.target.value)}>
                <option value="Verbal Consent">Verbal Consent</option>
                <option value="Written Signature">Written Signature</option>
              </select>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              backgroundColor: "var(--primary-light)",
              border: "1px solid var(--primary-border)",
              borderRadius: "var(--radius-md)",
              padding: "1.125rem",
              marginTop: "1rem",
            }}
          >
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                style={{ width: "22px", height: "22px", marginTop: "2px", accentColor: "var(--primary)" }}
              />
              <div>
                <strong style={{ color: "var(--text-primary)", fontSize: "0.9375rem" }}>
                  Participant Consents to Receive Automated Maternal SMS Reminders
                </strong>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Reminders and danger sign educational messages will only be queued if explicit consent is granted. The participant may opt out at any time by replying &apos;አቁም&apos; or &apos;STOP&apos;.
                </p>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            <button type="button" className="btn btn-outline" style={{ minHeight: "44px" }} onClick={() => setStep(1)}>
              &larr; Back to Demographics
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: "44px", padding: "0 20px" }}
              onClick={() => {
                if (!phone.trim()) {
                  setError("Please enter a primary mobile phone number.");
                  return;
                }
                if (!smsConsent) {
                  setError("Please confirm participant SMS consent.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
            >
              <span>Continue to Dating &amp; Risk &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pregnancy Dating & Risk Classification */}
      {step === 3 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Pregnancy Dating &amp; Risk Classification</span>
            </h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Clinical Dating Method <span className="required">*</span>
            </label>
            <select className="form-select" value={datingMethod} onChange={(e) => setDatingMethod(e.target.value)}>
              <option value="lmp">Last Menstrual Period (LMP)</option>
              <option value="ultrasound">Ultrasound</option>
              <option value="edd">Direct Estimated Due Date (EDD)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span className="form-label" style={{ margin: 0 }}>
              Calendar System / የቀን መቁጠሪያ
            </span>
            <div className="cal-toggle-group" role="group" aria-label="Dating calendar system">
              <button
                type="button"
                className={`cal-toggle-btn ${calendarType === "gregorian" ? "active" : ""}`}
                style={{ minHeight: "40px" }}
                onClick={() => setCalendarType("gregorian")}
              >
                Gregorian (GC)
              </button>
              <button
                type="button"
                className={`cal-toggle-btn ${calendarType === "ethiopian" ? "active" : ""}`}
                style={{ minHeight: "40px" }}
                onClick={() => setCalendarType("ethiopian")}
              >
                Ethiopian (ዓ.ም / EC)
              </button>
            </div>
          </div>

          {calendarType === "gregorian" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Last Menstrual Period (LMP - GC)</label>
                <input
                  type="date"
                  className="form-input"
                  value={gregDate}
                  onChange={(e) => {
                    setGregDate(e.target.value);
                    setEddDate(addDaysIso(e.target.value, 280));
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Due Date (EDD - GC)</label>
                <input
                  type="date"
                  className="form-input"
                  value={eddDate}
                  onChange={(e) => setEddDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="ethiopian-picker-card" style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="ethiopian-date-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Year (ዓ.ም)</label>
                  <input type="number" className="form-input" value={ethYear} onChange={(e) => setEthYear(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Month</label>
                  <select className="form-select" value={ethMonth} onChange={(e) => setEthMonth(Number(e.target.value))}>
                    {ETH_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Day</label>
                  <input type="number" className="form-input" min={1} max={30} value={ethDay} onChange={(e) => setEthDay(Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* Computed Clinical Dating Live Preview Box */}
          {computedEdd && computedGa && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#34d399", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                <svg className="icon-svg sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Computed Clinical Dating / የህክምና እርግዝና መረጃ</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
                    Gestational Age (የእርግዝና ዕድሜ)
                  </div>
                  <div className="tabular-nums" style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#34d399" }}>
                    {Math.max(0, computedGa.weeks)} weeks + {Math.max(0, computedGa.days)} days
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
                    Estimated Due Date (የሚወለድበት ቀን - ዓ.ም)
                  </div>
                  <div className="tabular-nums" style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {computedEddEth}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
                    Gregorian EDD (ፈረንጅ ቀን)
                  </div>
                  <div className="tabular-nums" style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#34d399" }}>
                    {computedEddIso}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Gravida (Total Pregnancies)</label>
              <input type="number" min={1} className="form-input" value={gravida} onChange={(e) => setGravida(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Parity (Previous Births)</label>
              <input type="number" min={0} className="form-input" value={parity} onChange={(e) => setParity(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Clinical Risk Status <span className="required">*</span>
            </label>
            <select className="form-select" value={riskStatus} onChange={(e) => setRiskStatus(e.target.value)}>
              <option value="low">Low Risk</option>
              <option value="elevated">Elevated Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            <button type="button" className="btn btn-outline" style={{ minHeight: "44px" }} onClick={() => setStep(2)}>
              &larr; Back to Contact
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: "44px", padding: "0 20px", fontWeight: 600 }}
              disabled={submitting}
            >
              ✓ {submitting ? "Enrolling..." : "Complete Enrollment & Generate Schedule"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
