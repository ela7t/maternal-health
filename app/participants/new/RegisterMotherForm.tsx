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

export function RegisterMotherForm({
  facilities,
  todayEth,
}: {
  facilities: Facility[];
  todayEth: EthDate;
}) {
  const router = useRouter();
  const [calendarType, setCalendarType] = useState<"ethiopian" | "gregorian">("ethiopian");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ? String(facilities[0].id) : "");
  const [kebele, setKebele] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("self");
  const [language, setLanguage] = useState("am");

  const [ethYear, setEthYear] = useState(todayEth.year);
  const [ethMonth, setEthMonth] = useState(todayEth.month);
  const [ethDay, setEthDay] = useState(todayEth.day);
  const [gregDate, setGregDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert-box alert-danger" style={{ marginBottom: "1.25rem" }}>
          <div>{error}</div>
        </div>
      )}

      {/* Section 1: Demographics & Contact */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ paddingBottom: "0.625rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)" }}>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            1. Mother&apos;s identification &amp; contact
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">
              Full name of mother <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Tigist Haile"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Health facility <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              required
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Kebele / locality <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Kebele 02"
              value={kebele}
              onChange={(e) => setKebele(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">
              Mobile phone number <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="+251911223344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <div className="form-hint">Ethio Telecom (+2519...) or Safaricom (+2517...)</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Phone ownership <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={phoneOwner}
              onChange={(e) => setPhoneOwner(e.target.value)}
              required
            >
              <option value="self">Mother&apos;s own phone</option>
              <option value="spouse">Husband / spouse</option>
              <option value="relative">Family / relative</option>
              <option value="other">Neighbor / other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">SMS language preference</label>
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

        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          <strong>Shared phone safety:</strong> Automated SMS messages never disclose medical diagnoses or personal health records.
        </div>
      </div>

      {/* Section 2: Obstetric Dating & Ethiopian Calendar */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="cal-toggle-wrap" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            2. Last menstrual period (LMP) &amp; calendar
          </h2>

          <div className="cal-toggle-group" role="group" aria-label="Calendar system selector">
            <button
              type="button"
              className={`cal-toggle-btn ${calendarType === "ethiopian" ? "active" : ""}`}
              style={{ minHeight: "44px" }}
              onClick={() => setCalendarType("ethiopian")}
            >
              Ethiopian (ዓ.ም / E.C.)
            </button>
            <button
              type="button"
              className={`cal-toggle-btn ${calendarType === "gregorian" ? "active" : ""}`}
              style={{ minHeight: "44px" }}
              onClick={() => setCalendarType("gregorian")}
            >
              Gregorian (G.C.)
            </button>
          </div>
        </div>

        {calendarType === "ethiopian" ? (
          <div className="ethiopian-picker-card">
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              የመጨረሻ የወር አበባ የታየበት ቀን (LMP date in Ethiopian calendar)
            </div>
            <div className="ethiopian-date-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ቀን (Day 1&ndash;30)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ethDay}
                  onChange={(e) => setEthDay(Number(e.target.value))}
                  min={1}
                  max={30}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ወር (Month)</label>
                <select
                  className="form-select"
                  value={ethMonth}
                  onChange={(e) => setEthMonth(Number(e.target.value))}
                >
                  <option value={1}>1. መስከረም (Meskerem)</option>
                  <option value={2}>2. ጥቅምት (Tikimt)</option>
                  <option value={3}>3. ኅዳር (Hidar)</option>
                  <option value={4}>4. ታኅሣሥ (Tahsas)</option>
                  <option value={5}>5. ጥር (Tir)</option>
                  <option value={6}>6. የካቲት (Yakatit)</option>
                  <option value={7}>7. መጋቢት (Magabit)</option>
                  <option value={8}>8. ሚያዝያ (Miyazya)</option>
                  <option value={9}>9. ግንቦት (Ginbot)</option>
                  <option value={10}>10. ሰኔ (Sene)</option>
                  <option value={11}>11. ሐምሌ (Hamle)</option>
                  <option value={12}>12. ነሐሴ (Nehase)</option>
                  <option value={13}>13. ጳጉሜ (Pagume)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ዓመተ ምሕረት (Year)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ethYear}
                  onChange={(e) => setEthYear(Number(e.target.value))}
                  min={2010}
                  max={2030}
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="ethiopian-picker-card">
            <label className="form-label">First day of last menstrual period (Gregorian)</label>
            <input
              type="date"
              className="form-input"
              style={{ maxWidth: "320px" }}
              value={gregDate}
              onChange={(e) => setGregDate(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-outline"
          style={{ minHeight: "44px" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ minHeight: "44px", padding: "0 20px" }}
        >
          {submitting ? "Enrolling mother..." : "Complete registration & schedule reminders"}
        </button>
      </div>
    </form>
  );
}
