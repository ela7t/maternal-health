"use client";

import { useEffect } from "react";
import { AMHARIC_DICT } from "@/lib/i18n/amharicDict";

const EXTRA_DICT: Record<string, string> = {
  "Hide done today": "ዛሬ የተጠናቀቁትን ደብቅ",
  "Show done today": "ዛሬ የተጠናቀቁትን አሳይ",
  "All birth outcomes logged": "ሁሉም የወሊድ ውጤቶች ተመዝግበዋል",
  "All visits attended on time": "ሁሉም ቀጠሮዎች በወቅቱ ተከናውነዋል",
  "All phone numbers reachable": "ሁሉም ስልክ ቁጥሮች ይገኛሉ",
  "No clinic visits scheduled over the next 7 days": "በሚቀጥሉት 7 ቀናት የታቀደ ክትትል የለም",
  "Scheduled contacts planned over the next 7 days": "በሚቀጥሉት 7 ቀናት የታቀዱ ቀጠሮዎች",
  "Requires phone follow-up": "የስልክ ክትትል ያስፈልገዋል",
  "mothers assigned to you": "ለእርስዎ የተመደቡ እናቶች",
  "Maternal & Newborn Care": "የእናቶች እና ጨቅላ ሕፃናት ክብካቤ",
  "Wolkite & Jimma Primary Health Program": "ወልቂጤ እና ጅማ የመጀመሪያ ደረጃ ጤና ፕሮግራም",
  "Strictly De-Identified": "ማንነትን የማይገልጽ (De-Identified)",
  "Standard": "መደበኛ",
  "✓ Standard": "✓ መደበኛ",
  "✓ Record visit": "✓ ቀጠሮ መዝግብ",
  "Review & reschedule": "ይመልከቱ እና ቀጠሮ ያስተካክሉ",
  "Record birth": "ወሊድ መዝግብ",
  "Complete Enrollment & Generate Schedule": "ምዝገባን ያጠናቅቁ እና መርሃግብር ይፍጠሩ",
  "Continue to Contact & Consent": "ወደ ስልክ እና ፈቃድ ይቀጥሉ",
  "Continue to Dating & Risk": "ወደ እርግዝና ቀን እና ስጋት ይቀጥሉ",
  "Back to Demographics": "ወደ መለያ መረጃ ተመለስ",
  "Back to Contact": "ወደ ስልክ መረጃ ተመለስ",
  "Delete Record...": "መዝገብ ሰርዝ...",
  "View ›": "ይመልከቱ ›",
  "All Facilities": "ሁሉም ተቋማት",
  "Print report": "ሪፖርት አትም",
  "Clinical Benchmarks": "ክሊኒካዊ መለኪያዎች",
  "Care Continuum Cascade": "የክብካቤ ቀጣይነት ሰንሰለት",
  "Gestational & Risk Profile": "የእርግዝና እና የስጋት መገለጫ",
  "All Sections (Combined)": "ሁሉም ክፍሎች (በአንድ ላይ)",
  "Operational": "በስራ ላይ",
  "SMS Dispatches": "የተላኩ የSMS መልእክቶች",
  "Clinical Encounters & Timeline": "ክሊኒካዊ ክትትሎች እና የጊዜ ሰሌዳ",
  "Reveal": "አሳይ",
  "Hide": "ደብቅ",
};

const LOWER_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(AMHARIC_DICT)) {
    map.set(k.toLowerCase(), v);
  }
  for (const [k, v] of Object.entries(EXTRA_DICT)) {
    map.set(k.toLowerCase(), v);
  }
  return map;
})();

function translateString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const exact = LOWER_LOOKUP.get(trimmed.toLowerCase());
  if (exact) {
    return raw.replace(trimmed, exact);
  }

  // Dynamic clinical patterns
  const patterns: Array<[RegExp, (...args: string[]) => string]> = [
    [/^Showing (\d+) priority items?$/i, (_, n) => `${n} ቅድሚያ የሚሰጣቸው ጉዳዮች`],
    [/^(\d+) years?$/i, (_, n) => `${n} ዓመት`],
    [/^(\d+) yrs$/i, (_, n) => `${n} ዓመት`],
    [/^Week (\d+)$/i, (_, n) => `ሳምንት ${n}`],
    [/^(\d+) days? to delivery$/i, (_, n) => `እስከ ወሊድ ${n} ቀናት`],
    [/^(\d+) days? away$/i, (_, n) => `${n} ቀናት ቀርተዋል`],
    [/^(\d+) days? ago$/i, (_, n) => `ከ${n} ቀናት በፊት`],
    [/^(\d+) mins? ago$/i, (_, n) => `ከ${n} ደቂቃዎች በፊት`],
    [/^Antenatal visit is in (\d+) days?$/i, (_, n) => `የቅድመ ወሊድ ክትትል በ${n} ቀናት ውስጥ`],
    [/^Antenatal visit is tomorrow$/i, () => `የቅድመ ወሊድ ክትትል ነገ ነው`],
    [/^Antenatal visit is today$/i, () => `የቅድመ ወሊድ ክትትል ዛሬ ነው`],
    [/^Clinical Encounters & Timeline \((\d+)\)$/i, (_, n) => `ክሊኒካዊ ክትትሎች እና የጊዜ ሰሌዳ (${n})`],
    [/^SMS Dispatches \((\d+)\)$/i, (_, n) => `የተላኩ የSMS መልእክቶች (${n})`],
  ];

  for (const [re, fmt] of patterns) {
    const m = trimmed.match(re);
    if (m) {
      return raw.replace(trimmed, fmt(...m));
    }
  }

  return null;
}

const originalTextMap = new WeakMap<Text, string>();
const originalAttrMap = new WeakMap<Element, Record<string, string>>();

function applyLanguageToDom(lang: "en" | "am") {
  const roots = [
    document.querySelector("main.main-content"),
    document.querySelector("footer.app-footer"),
  ].filter(Boolean) as Element[];

  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const parentTag = node.parentElement?.tagName;
      if (parentTag !== "SCRIPT" && parentTag !== "STYLE" && parentTag !== "CODE") {
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, node.nodeValue || "");
        }
        const orig = originalTextMap.get(node) || "";
        if (lang === "en") {
          if (node.nodeValue !== orig) node.nodeValue = orig;
        } else {
          const translated = translateString(orig);
          if (translated && node.nodeValue !== translated) {
            node.nodeValue = translated;
          }
        }
      }
      node = walker.nextNode() as Text | null;
    }

    const attrTargets = root.querySelectorAll("[placeholder], [title], [aria-label]");
    attrTargets.forEach((el) => {
      let saved = originalAttrMap.get(el);
      if (!saved) {
        saved = {};
        for (const attr of ["placeholder", "title", "aria-label"]) {
          const val = el.getAttribute(attr);
          if (val) saved[attr] = val;
        }
        originalAttrMap.set(el, saved);
      }

      for (const [attr, origVal] of Object.entries(saved)) {
        if (lang === "en") {
          if (el.getAttribute(attr) !== origVal) el.setAttribute(attr, origVal);
        } else {
          const translated = translateString(origVal);
          if (translated && el.getAttribute(attr) !== translated) {
            el.setAttribute(attr, translated);
          }
        }
      }
    });
  }
}

export function I18nTextTranslator() {
  useEffect(() => {
    let currentLang: "en" | "am" =
      (localStorage.getItem("ui_lang") as "en" | "am") || "en";
    let rafId = 0;

    const run = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyLanguageToDom(currentLang));
    };

    run();

    const onLangChange = (e: Event) => {
      const next = (e as CustomEvent).detail as "en" | "am";
      if (next) {
        currentLang = next;
        run();
      }
    };

    const observer = new MutationObserver(() => {
      if (currentLang === "am") run();
    });

    const mainEl = document.querySelector("main.main-content");
    if (mainEl) {
      observer.observe(mainEl, { childList: true, subtree: true });
    }

    window.addEventListener("mnh-lang-change", onLangChange);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("mnh-lang-change", onLangChange);
    };
  }, []);

  return null;
}
