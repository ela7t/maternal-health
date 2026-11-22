"use client";

import { useState, useEffect } from "react";
import {
  BookOpenText,
  Calculator,
  CheckCircle2,
  Copy,
  Check,
  Radio,
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
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");

  // Simulator State
  const [composerText, setComposerText] = useState(
    "ጤና ይስጥልኝ! በእርግዝና ወቅት የተመጣጠነ ምግብ መመገብ እርስዎና ፅንሱ ጤናማ እንድትሆኑ ይረዳል።"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  function handleLoadIntoCalculator(text: string, id: string) {
    setComposerText(text);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filteredTemplates = templates.filter((tpl) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      tpl.templateCode.toLowerCase().includes(q) ||
      (tpl.description && tpl.description.toLowerCase().includes(q)) ||
      tpl.variants.some((v) => v.messageContent.toLowerCase().includes(q))
    );
  });

  const progressLimit = billingInfo.encoding === "UCS-2" ? 70 : 160;
  const progressPct = Math.min(100, Math.round((billingInfo.charCount / progressLimit) * 100));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            MNH Clinical Message Bank & Framing
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Validated Jimma Zone 78-message repository aligned with the WHO 8-contact ANC model and Ge&apos;ez UCS-2 segment limits.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Clinically Approved
        </span>
      </div>

      {/* Interactive Ge'ez / Amharic SMS Length & Billing Meter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            Interactive Ge&apos;ez / Amharic SMS Length & Billing Meter
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ethio Telecom and Safaricom bill Ge&apos;ez text under <strong>UCS-2 encoding (70 characters per segment)</strong> instead of 160 characters for English. Test any draft below:
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Text Area */}
          <div className="lg:col-span-2 space-y-2">
            <textarea
              rows={4}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Type or paste Amharic / English text here..."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
            />
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  billingInfo.segmentCount > 1 ? "bg-amber-500" : "bg-teal-600"
                }`}
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{copiedId ? "Loaded from message bank!" : "Click 'Test in Meter' on any message below"}</span>
              <span>{billingInfo.charCount} / {progressLimit} in 1st segment</span>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between text-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Encoding Format:</span>
                <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-200">
                  {billingInfo.encoding} {billingInfo.encoding === "UCS-2" ? "(Ge'ez)" : "(GSM-7)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Length:</span>
                <span className="font-bold text-slate-900">{billingInfo.charCount} characters</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Billable Segments:</span>
                <span className="font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">
                  {billingInfo.segmentCount} Segment{billingInfo.segmentCount > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Remaining in Segment:</span>
                <span className="font-semibold text-slate-700">{billingInfo.remainingInSegment} chars</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between font-medium">
              <span className="text-slate-600">Cost (ETB @ 0.20):</span>
              <span className="text-sm font-bold text-slate-900">
                {(billingInfo.segmentCount * 0.2).toFixed(2)} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bank Browser */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenText className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Active Clinical Templates ({filteredTemplates.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Gain-Framed (Benefits) vs. Loss-Framed (Risk Awareness)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Template Code & Milestone</th>
                <th className="px-6 py-3.5">Clinical Topic</th>
                <th className="px-6 py-3.5">Amharic Gain-Framed (Benefits)</th>
                <th className="px-6 py-3.5">Amharic Loss-Framed (Cautions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Loading message library...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No templates found.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => {
                  const gainAm = tpl.variants.find((v) => v.languageCode === "am" && v.framingVariant === "gain");
                  const lossAm = tpl.variants.find((v) => v.languageCode === "am" && v.framingVariant === "loss");
                  const gainSeg = gainAm ? calculateSmsSegments(gainAm.messageContent).segmentCount : 1;
                  const lossSeg = lossAm ? calculateSmsSegments(lossAm.messageContent).segmentCount : 1;

                  return (
                    <tr key={tpl.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block font-mono">
                          {tpl.templateCode}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 mt-1 uppercase">
                          {tpl.clinicalStage}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {tpl.description || "Clinical Guidance"}
                        </span>
                        <span className="text-[11px] text-slate-400">WHO ANC Cascade</span>
                      </td>

                      <td className="px-6 py-4 max-w-sm">
                        {gainAm ? (
                          <div className="space-y-1.5">
                            <p className="text-slate-800 leading-relaxed font-sans">{gainAm.messageContent}</p>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                                {gainSeg} segment (UCS-2)
                              </span>
                              <button
                                onClick={() => handleLoadIntoCalculator(gainAm.messageContent, `gain_${tpl.id}`)}
                                className="text-teal-700 hover:text-teal-900 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                {copiedId === `gain_${tpl.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                Test in Meter
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 max-w-sm">
                        {lossAm ? (
                          <div className="space-y-1.5">
                            <p className="text-slate-800 leading-relaxed font-sans">{lossAm.messageContent}</p>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                                {lossSeg} segment (UCS-2)
                              </span>
                              <button
                                onClick={() => handleLoadIntoCalculator(lossAm.messageContent, `loss_${tpl.id}`)}
                                className="text-teal-700 hover:text-teal-900 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                {copiedId === `loss_${tpl.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                Test in Meter
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
