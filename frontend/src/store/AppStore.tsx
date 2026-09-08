import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { settingsRepository, type AppMode } from "../data/repositories/settingsRepository";
import { useAuth } from "./AuthContext";

interface AppStoreValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
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
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

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
    () => ({ mode, setMode, currentUser, version, bump }),
    [mode, setMode, currentUser, version, bump]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
