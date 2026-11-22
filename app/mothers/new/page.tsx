"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { ethiopianToGregorian, gregorianToEthiopian, formatEthiopianDate } from "@/lib/calendar/ethiopian";
import { calculateEddFromLmp, calculateGestationalAge } from "@/lib/clinical/gestational-age";

const ETHIOPIAN_MONTHS = [
  { id: 1, name: "መስከረም (Meskerem)", days: 30 },
  { id: 2, name: "ጥቅምት (Tikimt)", days: 30 },
  { id: 3, name: "ኅዳር (Hidar)", days: 30 },
  { id: 4, name: "ታኅሣሥ (Tahsas)", days: 30 },
  { id: 5, name: "ጥር (Tir)", days: 30 },
  { id: 6, name: "የካቲት (Yekatit)", days: 30 },
  { id: 7, name: "መጋቢት (Megabit)", days: 30 },
  { id: 8, name: "ሚያዝያ (Miyazya)", days: 30 },
  { id: 9, name: "ግንቦት (Ginbot)", days: 30 },
  { id: 10, name: "ሰኔ (Sene)", days: 30 },
  { id: 11, name: "ሐምሌ (Hamle)", days: 30 },
  { id: 12, name: "ነሐሴ (Nehase)", days: 30 },
  { id: 13, name: "ጳጉሜ (Pagume)", days: 6 },
];

export default function EnrollMotherPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("self");
  const [preferredLanguage, setPreferredLanguage] = useState("amh");
  const [studyCode, setStudyCode] = useState("");

  // Ethiopian Calendar LMP Dating
  // Default to Ethiopian year 2017 (current period in Gregorian 2024/2025/2026)
  const [ethYear, setEthYear] = useState("2017");
  const [ethMonth, setEthMonth] = useState("1");
  const [ethDay, setEthDay] = useState("15");

  // Clinical & Study Assignment
  const [framingVariant, setFramingVariant] = useState("gain");
  const [initialAncDate, setInitialAncDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );

  // Live Clinical Dating Calculation
  const clinicalDating = useMemo(() => {
    try {
      const y = parseInt(ethYear, 10);
      const m = parseInt(ethMonth, 10);
      const d = parseInt(ethDay, 10);
      if (!y || !m || !d) return null;

      const lmpGreg = ethiopianToGregorian(y, m, d);
      const eddGreg = calculateEddFromLmp(lmpGreg);
      const eddEth = gregorianToEthiopian(eddGreg);
      const ga = calculateGestationalAge(eddGreg);

      return {
        lmpGregStr: lmpGreg.toISOString().split("T")[0],
        eddGregStr: eddGreg.toISOString().split("T")[0],
        eddEthFormatted: formatEthiopianDate(eddEth.year, eddEth.month, eddEth.day),
        ga,
      };
    } catch (e) {
      return null;
    }
  }, [ethYear, ethMonth, ethDay]);

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
          age,
          studyCode,
          phoneNumber,
          phoneOwner,
          preferredLanguage,
          lmpEthiopianYear: ethYear,
          lmpEthiopianMonth: ethMonth,
          lmpEthiopianDay: ethDay,
          framingVariant,
          initialAncDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll mother");
      }

      router.push(`/mothers/${data.participantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit enrollment");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button & title */}
      <div>
        <Link
          href="/mothers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
          Back to Mothers Registry
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Enroll Mother in SMS Program
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Clinical onboarding protocol for Jimma Zone RCT & Wolkite Health Center.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Enrollment Error</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Mother Demographics & Phone Ownership */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-semibold text-slate-900">
              1. Mother Demographics & Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name (የእናት ስም) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tigist Haile"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Age (ዕድሜ)
              </label>
              <input
                type="number"
                min="14"
                max="50"
                placeholder="e.g. 24"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Study ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. MNH-048"
                value={studyCode}
                onChange={(e) => setStudyCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number (ስልክ ቁጥር) *
              </label>
              <input
                type="tel"
                required
                placeholder="0911223344 or +251911223344"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Normalized to E.164 (+251...) automatically for AfroMessage.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Ownership *
              </label>
              <select
                value={phoneOwner}
                onChange={(e) => setPhoneOwner(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="self">Mother's Own Phone</option>
                <option value="husband">Husband's Phone</option>
                <option value="family">Family Member / Relative</option>
                <option value="neighbor">Neighbor / Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Reminder Language *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: "amh", label: "አማርኛ (Amharic)" },
                  { code: "orm", label: "Afaan Oromoo" },
                  { code: "eng", label: "English" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setPreferredLanguage(lang.code)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                      preferredLanguage === lang.code
                        ? "bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Clinical Dating & Ethiopian Calendar LMP Picker */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-teal-600" />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">
                2. Clinical Dating in Ethiopian Calendar (ዓመተ ምሕረት)
              </h2>
              <p className="text-xs text-slate-500">
                Select Last Menstrual Period (LMP) date directly from the Ethiopian 13-month calendar.
              </p>
            </div>
          </div>

          {/* Ethiopian Date Selectors */}
          <div className="grid grid-cols-3 gap-3 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
            <div>
              <label className="block text-xs font-semibold text-teal-900 mb-1">
                ዓመት (Year)
              </label>
              <select
                value={ethYear}
                onChange={(e) => setEthYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-semibold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {[2015, 2016, 2017, 2018, 2019].map((y) => (
                  <option key={y} value={y}>
                    {y} ዓ.ም.
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-teal-900 mb-1">
                ወር (Month)
              </label>
              <select
                value={ethMonth}
                onChange={(e) => setEthMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-semibold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {ETHIOPIAN_MONTHS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-teal-900 mb-1">
                ቀን (Day)
              </label>
              <select
                value={ethDay}
                onChange={(e) => setEthDay(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-semibold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Array.from({ length: parseInt(ethMonth, 10) === 13 ? 6 : 30 }, (_, i) => i + 1).map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Live Calculated Clinical Metrics */}
          {clinicalDating && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Live Gestational Age & EDD Calculation (Naegele's Rule)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block uppercase">Current Gestational Age</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {clinicalDating.ga.weeks}w {clinicalDating.ga.days}d
                  </span>
                  <span className="text-xs text-teal-600 font-medium">
                    Trimester {clinicalDating.ga.trimester}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block uppercase">EDD (የሚወልዱበት ቀን - ዓ.ም.)</span>
                  <span className="text-base font-bold text-teal-900 block mt-0.5">
                    {clinicalDating.eddEthFormatted}
                  </span>
                  <span className="text-xs text-slate-500">Ethiopian Calendar</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-400 block uppercase">EDD (Gregorian Calendar)</span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {clinicalDating.eddGregStr}
                  </span>
                  <span className="text-xs text-slate-500">
                    LMP: {clinicalDating.lmpGregStr}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: First ANC Appointment & Framing Assignment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HeartPulse className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-semibold text-slate-900">
              3. Study Protocol & First Clinic Appointment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First ANC Clinic Date *
              </label>
              <input
                type="date"
                required
                value={initialAncDate}
                onChange={(e) => setInitialAncDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                72-hour automated reminder will be dispatched before this date.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Message Framing Arm (RCT Assignment)
              </label>
              <select
                value={framingVariant}
                onChange={(e) => setFramingVariant(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="gain">Gain-Framed (Health benefits & positive reinforcement)</option>
                <option value="loss">Loss-Framed (Danger signs & risk mitigation)</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Clinical Consent & Protocol:</strong> By submitting, the participant is registered in the Jimma/Wolkite MNH SMS automated cohort. The system will schedule gestational milestone reminders, 72-hour pre-visit alerts, and immediate delivery follow-up.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/mothers"
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Enrolling..." : "Complete Enrollment"}
          </button>
        </div>
      </form>
    </div>
  );
}
