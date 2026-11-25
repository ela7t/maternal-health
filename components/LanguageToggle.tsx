"use client";

import { useEffect, useState } from "react";

export function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "am">("en");

  useEffect(() => {
    const saved = (localStorage.getItem("ui_lang") as "en" | "am") || "en";
    setLang(saved);
    document.documentElement.lang = saved;
    document.documentElement.classList.toggle("font-amharic", saved === "am");
    window.dispatchEvent(new CustomEvent("mnh-lang-change", { detail: saved }));
  }, []);

  const toggle = () => {
    const next = lang === "en" ? "am" : "en";
    setLang(next);
    localStorage.setItem("ui_lang", next);
    document.documentElement.lang = next;
    document.documentElement.classList.toggle("font-amharic", next === "am");
    window.dispatchEvent(new CustomEvent("mnh-lang-change", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="lang-toggle-btn"
      aria-label="Toggle English / Amharic"
      title="Switch language (EN / አማ)"
    >
      <span className={lang === "en" ? "lang-active" : ""}>EN</span>
      <span className="lang-sep">/</span>
      <span className={lang === "am" ? "lang-active" : ""}>አማ</span>
    </button>
  );
}
