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

  const selectLang = (next: "en" | "am") => {
    setLang(next);
    localStorage.setItem("ui_lang", next);
    document.documentElement.lang = next;
    document.documentElement.classList.toggle("font-amharic", next === "am");
    window.dispatchEvent(new CustomEvent("mnh-lang-change", { detail: next }));
  };

  return (
    <div className={`lang-switcher ${lang === "am" ? "is-am" : "is-en"}`} role="group" aria-label="Language switcher">
      <div className="lang-slider" />
      <button
        type="button"
        onClick={() => selectLang("en")}
        className={`lang-btn ${lang === "en" ? "active" : ""}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => selectLang("am")}
        className={`lang-btn ${lang === "am" ? "active" : ""}`}
      >
        አማ
      </button>
    </div>
  );
}
