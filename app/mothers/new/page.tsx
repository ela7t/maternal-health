"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  HeartPulse,
} from "lucide-react";
import { ethiopianToGregorian, gregorianToEthiopian, formatEthiopianDate } from "@/lib/calendar/ethiopian";
import { calculateEddFromLmp, calculateGestationalAge } from "@/lib/clinical/gestational-age";

const ETHIOPIAN_MONTHS = [
  { id: 1, name: "1. መስከረም (Meskerem)", days: 30 },
  { id: 2, name: "2. ጥቅምት (Tikimt)", days: 30 },
  { id: 3, name: "3. ኅዳር (Hidar)", days: 30 },
  { id: 4, name: "4. ታኅሣሥ (Tahsas)", days: 30 },
  { id: 5, name: "5. ጥር (Tir)", days: 30 },
  { id: 6, name: "6. የካቲት (Yakatit)", days: 30 },
  { id: 7, name: "7. መጋቢት (Megabit)", days: 30 },
  { id: 8, name: "8. ሚያዝያ (Miyazya)", days: 30 },
  { id: 9, name: "9. ግንቦት (Ginbot)", days: 30 },
  { id: 10, name: "10. ሰኔ (Sene)", days: 30 },
  { id: 11, name: "11. ሐምሌ (Hamle)", days: 30 },
  { id: 12, name: "12. ነሐሴ (Nehase)", days: 30 },
  { id: 13, name: "13. ጳጉሜ (Pagume)", days: 6 },
];

export default function RegisterMotherPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demographics
  const [fullName, setFullName] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [kebele, setKebele] = useState("Kebele 02");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("self");
  const [language, setLanguage] = useState("am");

  // Calendar System Toggle
  const [calendarType, setCalendarType] = useState<"ethiopian" | "gregorian">("ethiopian");
  const [ethYear, setEthYear] = useState("2017");
  const [ethMonth, setEthMonth] = useState("1");
  const [ethDay, setEthDay] = useState("15");
  const [gregDate, setGregDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 140);
    return d.toISOString().split("T")[0];
  });

  // Clinical & Study Assignment
  const [riskStatus, setRiskStatus] = useState("low");
  const [studyArm, setStudyArm] = useState("intervention_gain");
  const [nextAncDate, setNextAncDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFacilities(data);
          setFacilityId(String(data[0].id));
        }
      })
      .catch((err) => console.error("Failed to load facilities", err));
  }, []);

  // Live Clinical Dating Calculation
  const clinicalDating = useMemo(() => {
    try {
      let lmpGreg: Date;
      if (calendarType === "ethiopian") {
        const y = parseInt(ethYear, 10);
        const m = parseInt(ethMonth, 10);
        const d = parseInt(ethDay, 10);
        if (!y || !m || !d) return null;
        lmpGreg = ethiopianToGregorian(y, m, d);
      } else {
        if (!gregDate) return null;
        lmpGreg = new Date(gregDate);
      }

      const eddGreg = calculateEddFromLmp(lmpGreg);
      const eddEth = gregorianToEthiopian(eddGreg);
      const lmpEth = gregorianToEthiopian(lmpGreg);
      const ga = calculateGestationalAge(eddGreg);

      return {
        lmpGregFormatted: lmpGreg.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lmpEthFormatted: formatEthiopianDate(lmpEth.year, lmpEth.month, lmpEth.day),
        eddGregFormatted: eddGreg.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        eddEthFormatted: formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day),
        ga,
      };
    } catch (e) {
      return null;
    }
  }, [calendarType, ethYear, ethMonth, ethDay, gregDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/mothers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          facilityId,
          kebele,
          phoneNumber,
          phoneOwner,
          language,
          calendarType,
          ethYear,
          ethMonth,
          ethDay,
          gregLmpDate: gregDate,
          riskStatus,
          studyArm,
          nextAncDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register mother");
      }

      router.push(`/mothers/${data.participantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit enrollment");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/mothers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
            Back to Mothers Registry
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Register Pregnant Mother
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold shrink-0">
          <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
          Wolkite & Jimma Protocol
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Registration Incomplete</h4>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Mother&apos;s Identification & Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Full Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700">
                Full Name of Mother <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Tigist Haile"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Health Facility */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Health Facility <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {facilities.length > 0 ? (
                  facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                ) : (
                  <option value="1">Wolkite Health Center</option>
                )}
              </select>
            </div>

            {/* Kebele */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Kebele / Locality <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={kebele}
                onChange={(e) => setKebele(e.target.value)}
                placeholder="e.g. Kebele 02"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Mobile Phone */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Mobile Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251911223344"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[11px] text-slate-400 block">
                Ethio Telecom or Safaricom format (+2519... or +2517...)
              </span>
            </div>

            {/* Phone Ownership */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Phone Ownership <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={phoneOwner}
                onChange={(e) => setPhoneOwner(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="self">Mother&apos;s Own Phone</option>
                <option value="spouse">Husband / Spouse</option>
                <option value="relative">Family / Relative</option>
                <option value="other">Neighbor / Other</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Language Preference</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="am">Amharic (አማርኛ)</option>
                <option value="en">English</option>
                <option value="gurage">Gurage</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2.5 text-slate-600 text-[11px] border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Shared Phone Safety:</strong> Because mobile devices are often shared in the household, automated SMS content will never disclose medical diagnosis or personal health records.
            </span>
          </div>
        </div>

        {/* Section 2: Obstetric Dating & Calendar System */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Last Menstrual Period (LMP) & Calendar
              </h2>
            </div>

            {/* Calendar System Toggle Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setCalendarType("ethiopian")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  calendarType === "ethiopian"
                    ? "bg-white text-teal-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ethiopian (ዓ.ም / E.C.)
              </button>
              <button
                type="button"
                onClick={() => setCalendarType("gregorian")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  calendarType === "gregorian"
                    ? "bg-white text-teal-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Gregorian (G.C.)
              </button>
            </div>
          </div>

          {/* Ethiopian Calendar Inputs */}
          {calendarType === "ethiopian" ? (
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
              <label className="font-semibold text-slate-700 text-xs block">
                የመጨረሻ የወር አበባ የታየበት ቀን (LMP Date in Ethiopian Calendar):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">ዓመተ ምሕረት (Year)</label>
                  <input
                    type="number"
                    min="2010"
                    max="2030"
                    value={ethYear}
                    onChange={(e) => setEthYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">ወር (Month)</label>
                  <select
                    value={ethMonth}
                    onChange={(e) => setEthMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">ቀን (Day 1–30)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={ethDay}
                    onChange={(e) => setEthDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <label className="font-semibold text-slate-700 text-xs block">
                LMP Date (Gregorian Calendar):
              </label>
              <input
                type="date"
                value={gregDate}
                onChange={(e) => setGregDate(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-800"
              />
            </div>
          )}

          {/* Live Clinical Dating Calculation Preview Card */}
          {clinicalDating && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 block">
                Live Obstetric Calculation (Naegele&apos;s Rule)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">LMP (GC)</span>
                  <span className="font-semibold text-slate-800">{clinicalDating.lmpGregFormatted}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">EDD (ዓ.ም)</span>
                  <span className="font-bold text-teal-700">{clinicalDating.eddEthFormatted}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">EDD (GC)</span>
                  <span className="font-semibold text-slate-800">{clinicalDating.eddGregFormatted}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Gestational Age</span>
                  <span className="font-bold text-slate-900">
                    {clinicalDating.ga.formatted} (T{clinicalDating.ga.trimester})
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Clinical Risk Assessment</label>
              <select
                value={riskStatus}
                onChange={(e) => setRiskStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="low">Low Risk (Standard Antenatal Pathway)</option>
                <option value="high">High Risk (Prior complications, conditions)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Message Tone / Study Arm</label>
              <select
                value={studyArm}
                onChange={(e) => setStudyArm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="intervention_gain">Encouraging (Gain-framed benefits)</option>
                <option value="intervention_loss">Risk-aware (Loss-framed cautions)</option>
                <option value="control">Control (Routine facility care only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Next Antenatal Care (ANC) Visit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Next Antenatal Care (ANC) Visit
            </h2>
          </div>

          <div className="text-xs space-y-1 max-w-sm">
            <label className="font-semibold text-slate-700">Next Checkup Date & Time</label>
            <input
              type="datetime-local"
              value={nextAncDate}
              onChange={(e) => setNextAncDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-[11px] text-slate-400 block">
              The system will automatically schedule a 72-hour reminder SMS before this visit.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/mothers"
            className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? "Saving & Scheduling..." : "Save Mother & Start SMS Stream"}
          </button>
        </div>
      </form>
    </div>
  );
}
