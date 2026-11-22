"use client";

import { useState, useEffect } from "react";
import {
  BookOpenText,
  Sparkles,
  Calculator,
  Layers,
  Coins,
  CheckCircle2,
  Copy,
  Search,
} from "lucide-react";
import { calculateSmsSegments } from "@/lib/sms/ucs2-segment-counter";

interface Variant {
  id: string;
  languageCode: string;
  framingVariant: string;
  messageContent: string;
}

interface Template {
  id: string;
  templateCode: string;
  clinicalStage: string;
  timingDayOffset: number;
  description: string | null;
  variants: Variant[];
}

export default function MessageBankPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState("all");

  // Simulator State
  const [composerText, setComposerText] = useState(
    "ሰላም! ጤናዎ እንዲጠበቅ እና ፅንሱ በጥሩ ሁኔታ እንዲያድግ የቅድመ ወሊድ ክትትልዎን ያድርጉ።"
  );
  const [copied, setCopied] = useState(false);

  const billingInfo = calculateSmsSegments(composerText);

  useEffect(() => {
    fetchTemplates();
  }, [selectedStage]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?stage=${selectedStage}`);
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setComposerText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clinical Message Bank & UCS-2 Billing Simulator
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          78 validated messages from Jimma RCT protocol with Gain vs Loss framing & AfroMessage billing optimization.
        </p>
      </div>

      {/* Live UCS-2 Segment Billing Simulator Widget */}
      <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Interactive Amharic UCS-2 Segment & Cost Calculator
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            AfroMessage Gateway Live Meter
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Typing Area */}
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Message Text (አማርኛ ወይም እንግሊዝኛ)
            </label>
            <textarea
              rows={4}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Type Amharic Ge'ez or English text to test segment count..."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Encoding: <strong>{billingInfo.encoding}</strong></span>
              <span>{copied ? "Copied & loaded!" : "Click any bank message below to test"}</span>
            </div>
          </div>

          {/* Real-time Billing Breakdown Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3.5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Billing Summary
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-teal-900">
                  {billingInfo.segmentCount}
                </span>
                <span className="text-sm font-semibold text-teal-700">
                  SMS Segment{billingInfo.segmentCount > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {billingInfo.charCount} characters ({billingInfo.remainingInSegment} left in current segment)
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Estimated Cost (ETB):</span>
                <strong className="text-slate-900">{(billingInfo.segmentCount * 0.20).toFixed(2)} ETB</strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Rate per segment:</span>
                <span>0.20 ETB</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Ge'ez UCS-2 limit:</span>
                <span>{billingInfo.segmentCount <= 1 ? "70 chars" : "67 chars/part"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bank Browser */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenText className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">
              78-Message Protocol Library
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Clinical Stages</option>
              <option value="first_trimester">First Trimester (T1)</option>
              <option value="second_trimester">Second Trimester (T2)</option>
              <option value="third_trimester">Third Trimester (T3)</option>
              <option value="postnatal">Postnatal (Day 1 - 42)</option>
              <option value="appointment">Appointment Reminders</option>
            </select>
          </div>
        </div>

        {/* Template Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading message bank...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No message templates found for this stage.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-teal-900 font-mono">
                      {tpl.templateCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                      {tpl.clinicalStage}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Timing offset: <strong>Day {tpl.timingDayOffset}</strong>
                  </span>
                </div>

                {tpl.description && (
                  <p className="text-xs text-slate-500">{tpl.description}</p>
                )}

                {/* Side-by-side Variants: Gain vs Loss */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tpl.variants.map((v) => (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border space-y-2 relative group ${
                        v.framingVariant === "gain"
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-amber-50/40 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            v.framingVariant === "gain"
                              ? "text-emerald-800"
                              : "text-amber-800"
                          }`}
                        >
                          {v.framingVariant === "gain" ? "Gain-Framed (ጥቅም)" : "Loss-Framed (ጉዳት መከላከያ)"}
                        </span>
                        <button
                          onClick={() => handleCopy(v.messageContent)}
                          className="text-[11px] font-medium text-slate-500 hover:text-teal-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Copy className="w-3 h-3" />
                          Test in Meter
                        </button>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-sans">
                        "{v.messageContent}"
                      </p>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Lang: {v.languageCode.toUpperCase()}</span>
                        <span>•</span>
                        <span>{v.messageContent.length} chars</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
