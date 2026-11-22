"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Phone,
  Baby,
  Calendar,
  AlertCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
} from "lucide-react";

interface Mother {
  id: string;
  studyCode: string;
  fullName: string;
  kebele: string;
  phone: string;
  phoneOwner: string;
  preferredLanguage: string;
  facilityName: string;
  stage: string;
  pncFormatted: string | null;
  ga: { weeks: number; days: number; trimester: number; formatted: string } | null;
  status: string;
  studyArm: string;
  activePregnancyId: string | null;
  nextAppointment: {
    id: string;
    visitType: string;
    scheduledFor: string;
  } | null;
  edd: string | null;
}

export default function MothersRegistryPage() {
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchMothers();
  }, [statusFilter]);

  async function fetchMothers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mothers?status=${statusFilter}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMothers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredMothers = mothers.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.studyCode.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.facilityName.toLowerCase().includes(q) ||
      m.kebele.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mothers & Participants Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Longitudinal tracking of registered pregnant and postpartum women across primary healthcare facilities.
          </p>
        </div>
        <Link
          href="/mothers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Register New Mother
        </Link>
      </div>

      {/* Search & Clinical Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mother name, ID code (e.g. MOM-), or phone number..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="all">All Care Stages</option>
            <option value="active_pregnant">Active Pregnant</option>
            <option value="postnatal">Postnatal Care (0–6 Weeks)</option>
            <option value="completed">Completed (Graduated)</option>
            <option value="opted_out">Opted Out (STOP)</option>
            <option value="loss">Sensitive Loss Halt</option>
          </select>

          {(statusFilter !== "all" || search) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearch("");
              }}
              className="px-2.5 py-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Cohort Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-sm">
            Registered Cohort ({filteredMothers.length})
          </span>
          <span className="text-xs text-slate-400">
            Wolkite & Jimma Primary Centers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Mother Profile</th>
                <th className="px-6 py-3.5">Facility & Kebele</th>
                <th className="px-6 py-3.5">Clinical Stage</th>
                <th className="px-6 py-3.5">Phone (Owner)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading mothers registry...
                  </td>
                </tr>
              ) : filteredMothers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No enrolled mothers match this filter or search query.
                  </td>
                </tr>
              ) : (
                filteredMothers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    {/* Mother Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/mothers/${m.id}`}
                            className="font-bold text-slate-900 hover:text-teal-700 block text-xs"
                          >
                            {m.fullName}
                          </Link>
                          <span className="text-[11px] font-mono text-slate-400">
                            {m.studyCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Facility & Kebele */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 block">
                        {m.facilityName}
                      </span>
                      <span className="text-[11px] text-slate-400">{m.kebele}</span>
                    </td>

                    {/* Clinical Stage */}
                    <td className="px-6 py-4">
                      {m.status === "active_pregnant" && m.ga ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                            <Calendar className="w-3 h-3" />
                            {m.ga.formatted} (T{m.ga.trimester})
                          </span>
                          {m.edd && (
                            <span className="block text-[11px] text-slate-400 mt-1">
                              EDD: {new Date(m.edd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : m.status === "postnatal" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Baby className="w-3 h-3" />
                          {m.pncFormatted || "Postnatal (0-6 Wks)"}
                        </span>
                      ) : m.status === "loss" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert className="w-3 h-3" />
                          Sensitive Loss Halt
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Phone (Owner) */}
                    <td className="px-6 py-4">
                      <span className="font-semibold font-mono text-slate-800 block">
                        {m.phone}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 capitalize">
                        {m.phoneOwner}&apos;s phone
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          m.status === "active_pregnant"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : m.status === "postnatal"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : m.status === "completed"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : m.status === "opted_out"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {m.status === "active_pregnant"
                          ? "Pregnant"
                          : m.status === "postnatal"
                          ? "Postnatal"
                          : m.status === "completed"
                          ? "Graduated"
                          : m.status === "opted_out"
                          ? "Opted Out"
                          : "Sensitive Loss"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/mothers/${m.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
                      >
                        View Profile <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
