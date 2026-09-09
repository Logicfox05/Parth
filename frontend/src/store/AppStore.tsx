import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { settingsRepository, type AppMode } from "../data/repositories/settingsRepository";
import type { Language } from "../i18n/strings";
import { useAuth } from "./AuthContext";

interface AppStoreValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  // Interface language. Held here (rather than in its own provider) because
  // this store already wraps the whole app, so setting it re-renders every
  // screen at once — which is exactly what changing language must do.
  lang: Language;
  setLang: (l: Language) => void;
  // The name recorded against submit/verify/reject actions. Sourced from the
  // logged-in account (see AuthContext) — previously a free-text "Acting as"
  // dropdown with no real identity behind it (see FUTURE_ROADMAP.md).
  currentUser: string;
  version: number;
  bump: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<AppMode>(() => settingsRepository.get().mode);
  const [lang, setLangState] = useState<Language>(() => settingsRepository.get().language);
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setLang = useCallback(
    (l: Language) => {
      settingsRepository.update({ language: l });
      setLangState(l);
      // Tell assistive tech and the browser which language the page is now in.
      if (typeof document !== "undefined") document.documentElement.lang = l;
      bump();
    },
    [bump]
  );

  const setMode = useCallback(
    (m: AppMode) => {
      settingsRepository.update({ mode: m });
      setModeState(m);
      bump();
    },
    [bump]
  );

  const currentUser = user?.name ?? "Guest User";

  const value = useMemo<AppStoreValue>(
    () => ({ mode, setMode, lang, setLang, currentUser, version, bump }),
    [mode, setMode, lang, setLang, currentUser, version, bump]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
