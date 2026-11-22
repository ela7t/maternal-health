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
} from "lucide-react";

interface Mother {
  id: string;
  studyCode: string;
  fullName: string;
  age: number | null;
  phone: string;
  phoneOwner: string;
  preferredLanguage: string;
  facilityName: string;
  stage: string;
  ga: { weeks: number; days: number; trimester: number; isOverdue: boolean } | null;
  status: string;
  activePregnancyId: string | null;
  nextAppointment: {
    id: string;
    visitType: string;
    scheduledFor: string;
  } | null;
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
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(query) ||
      m.studyCode.toLowerCase().includes(query) ||
      m.phone.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mothers & Newborn Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enrolled participants under automated SMS protocol at Jimma / Wolkite Health Center.
          </p>
        </div>
        <Link
          href="/mothers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Enroll New Mother
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by mother name, study code, or phone (+251)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="pregnant">Antenatal (Pregnant)</option>
            <option value="postnatal">Postnatal (Day 1 - 42)</option>
            <option value="loss">Sensitive Loss (Halted)</option>
          </select>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading participant registry...
          </div>
        ) : filteredMothers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm">No participants match your criteria.</p>
            <Link
              href="/mothers/new"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              + Enroll the first mother
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Study Code & Mother</th>
                  <th className="px-6 py-3.5">Phone & Ownership</th>
                  <th className="px-6 py-3.5">Clinical Stage</th>
                  <th className="px-6 py-3.5">Next Appointment</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMothers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {m.fullName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {m.studyCode} • {m.age ? `${m.age} yrs` : "Age N/A"} • {m.preferredLanguage.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs text-slate-800">{m.phone}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {m.phoneOwner === "self" ? "Own Phone" : `Owner: ${m.phoneOwner}`}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {m.status === "active" && m.ga ? (
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            m.ga.trimester === 1 ? "badge-t1 border" :
                            m.ga.trimester === 2 ? "badge-t2 border" : "badge-t3 border"
                          }`}>
                            Trimester {m.ga.trimester}
                          </span>
                          <p className="text-xs text-slate-500 font-medium">
                            {m.ga.weeks} weeks, {m.ga.days} days
                          </p>
                        </div>
                      ) : m.status === "postnatal" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium badge-postnatal border">
                          Postnatal (Day 1 - 42)
                        </span>
                      ) : m.status === "loss" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Loss / Halted
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Inactive</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {m.nextAppointment ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            {m.nextAppointment.visitType}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(m.nextAppointment.scheduledFor).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None scheduled</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          m.status === "active"
                            ? "bg-teal-50 text-teal-700"
                            : m.status === "postnatal"
                            ? "bg-purple-50 text-purple-700"
                            : m.status === "loss"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/mothers/${m.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800"
                      >
                        Profile <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
