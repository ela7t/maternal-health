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
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Section 1: Demographics */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
          <span
            className="badge rounded-circle p-2"
            style={{ backgroundColor: "var(--app-primary-light)", color: "var(--app-primary)" }}
          >
            <i className="bi bi-person-fill fs-6"></i>
          </span>
          <h5 className="fw-bold mb-0 text-dark">1. Mother&apos;s Identification & Contact</h5>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-secondary">
              Full Name of Mother <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Tigist Haile"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-secondary">
              Health Facility <span className="text-danger">*</span>
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

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-secondary">
              Kebele / Locality <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Kebele 02"
              value={kebele}
              onChange={(e) => setKebele(e.target.value)}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small fw-semibold text-secondary">
              Mobile Phone Number <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-telephone text-secondary"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="+251911223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <small className="text-muted">Ethio Telecom or Safaricom format (+2519... or +2517...)</small>
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-secondary">
              Phone Ownership <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={phoneOwner}
              onChange={(e) => setPhoneOwner(e.target.value)}
              required
            >
              <option value="self">Mother&apos;s Own Phone</option>
              <option value="spouse">Husband / Spouse</option>
              <option value="relative">Family / Relative</option>
              <option value="other">Neighbor / Other</option>
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-secondary">Language Preference</label>
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

        <div className="p-3 bg-light rounded mt-3 d-flex align-items-center gap-2 text-secondary small border">
          <i className="bi bi-shield-check text-success fs-5"></i>
          <span>
            <strong>Shared Phone Safety:</strong> Because mobile devices are often shared in the household,
            automated SMS content will never disclose medical diagnosis or personal health records.
          </span>
        </div>
      </div>

      {/* Section 2: Obstetric Dating & Ethiopian Calendar */}
      <div className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge rounded-circle p-2"
              style={{ backgroundColor: "var(--app-primary-light)", color: "var(--app-primary)" }}
            >
              <i className="bi bi-calendar2-heart-fill fs-6"></i>
            </span>
            <h5 className="fw-bold mb-0 text-dark">2. Last Menstrual Period (LMP) & Calendar</h5>
          </div>

          {/* Calendar System Toggle Pills */}
          <div className="btn-group btn-group-sm" role="group">
            <input
              type="radio"
              className="btn-check"
              name="calendarToggle"
              id="calEth"
              checked={calendarType === "ethiopian"}
              onChange={() => setCalendarType("ethiopian")}
            />
            <label
              className={`btn ${calendarType === "ethiopian" ? "btn-success" : "btn-outline-secondary"}`}
              htmlFor="calEth"
            >
              <i className="bi bi-calendar-event me-1"></i> Ethiopian (ዓ.ም / E.C.)
            </label>

            <input
              type="radio"
              className="btn-check"
              name="calendarToggle"
              id="calGreg"
              checked={calendarType === "gregorian"}
              onChange={() => setCalendarType("gregorian")}
            />
            <label
              className={`btn ${calendarType === "gregorian" ? "btn-primary" : "btn-outline-secondary"}`}
              htmlFor="calGreg"
            >
              Gregorian (G.C.)
            </label>
          </div>
        </div>

        {calendarType === "ethiopian" ? (
          <div className="p-4 rounded border bg-light">
            <label className="form-label fw-bold small text-uppercase text-secondary mb-3">
              የመጨረሻ የወር አበባ የታየበት ቀን (LMP Date in Ethiopian Calendar):
            </label>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small text-secondary">ዓመተ ምሕረት (Year)</label>
                <input
                  type="number"
                  className="form-control"
                  value={ethYear}
                  onChange={(e) => setEthYear(Number(e.target.value))}
                  min={2010}
                  max={2030}
                  required
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small text-secondary">ወር (Month)</label>
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
              <div className="col-md-3">
                <label className="form-label small text-secondary">ቀን (Day 1–30)</label>
                <input
                  type="number"
                  className="form-control"
                  value={ethDay}
                  onChange={(e) => setEthDay(Number(e.target.value))}
                  min={1}
                  max={30}
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded border bg-light">
            <label className="form-label fw-bold small text-uppercase text-secondary mb-3">
              First Day of Last Menstrual Period (Gregorian):
            </label>
            <div className="row g-3">
              <div className="col-md-6">
                <input
                  type="date"
                  className="form-control"
                  value={gregDate}
                  onChange={(e) => setGregDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center pt-3 border-top">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-outline-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-medical px-4 py-2"
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Enrolling Mother...
            </>
          ) : (
            <>
              <i className="bi bi-check-lg"></i> Complete Registration & Schedule Reminders
            </>
          )}
        </button>
      </div>
    </form>
  );
}
