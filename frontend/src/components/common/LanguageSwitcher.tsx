import React from "react";
import { FiGlobe } from "react-icons/fi";
import { useLanguage, useT } from "../../i18n";
import { LANGUAGE_NAMES, type Language } from "../../i18n/strings";

const LANGS: Language[] = ["en", "gu"];

// Switching language re-renders the whole app (the flag lives in AppStore,
// which wraps everything), so every screen changes at once — nothing to
// reload and nothing to re-open.
export function LanguageSwitcher({ variant = "pills" }: { variant?: "pills" | "compact" }) {
  const { lang, setLang } = useLanguage();
  const t = useT();

  if (variant === "compact") {
    return (
      <select
        className="input input-sm lang-select"
        aria-label={t("common.language")}
        title={t("common.language")}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_NAMES[l]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="pill-tabs" role="group" aria-label={t("common.language")}>
      {LANGS.map((l) => (
        <div key={l} className={`pill-tab ${lang === l ? "active" : ""}`} onClick={() => setLang(l)} data-lang={l}>
          {l === "en" && <FiGlobe size={12} style={{ marginRight: 5, verticalAlign: -2 }} />}
          {LANGUAGE_NAMES[l]}
        </div>
      ))}
    </div>
  );
}
