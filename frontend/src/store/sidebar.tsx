import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readJSON, writeJSON } from "../data/storageAdapter";

// Whether the navigation panel is showing. Lives in its own tiny store rather
// than inside Sidebar itself because two components need it: the panel (which
// carries the close button) and the top bar (which carries the button that
// brings it back). Without a shared store, closing the panel would hide the
// only control able to reopen it.
const VISIBLE_KEY = "sidebar-visible";

// Below this width the panel can't sit beside the content without squeezing a
// record table, so it behaves as an overlay drawer instead: hidden by default,
// slid over the page when opened, dismissed by the backdrop / Escape / picking
// a link. Matches the breakpoint in styles.css — keep the two in step.
const NARROW_QUERY = "(max-width: 1024px)";

function matchNarrow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(NARROW_QUERY).matches;
}

// The remembered preference only ever describes the wide layout. A phone-sized
// drawer left open would otherwise reopen over the content on every visit.
const readPreference = (): boolean => readJSON<boolean>(VISIBLE_KEY, true);

interface SidebarValue {
  visible: boolean;
  /** True while the panel is an overlay drawer rather than a column. */
  narrow: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [narrow, setNarrow] = useState<boolean>(matchNarrow);
  const [visible, setVisible] = useState<boolean>(() => (matchNarrow() ? false : readPreference()));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setNarrow(e.matches);
      // Crossing the breakpoint re-derives visibility: an overlay never starts
      // open, and going back to a wide window restores what the user chose there.
      setVisible(e.matches ? false : readPreference());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setVisible((v) => {
      const next = !v;
      if (!narrow) writeJSON(VISIBLE_KEY, next);
      return next;
    });
  }, [narrow]);

  const close = useCallback(() => {
    setVisible((v) => {
      if (!v) return v;
      if (!narrow) writeJSON(VISIBLE_KEY, false);
      return false;
    });
  }, [narrow]);

  const value = useMemo<SidebarValue>(() => ({ visible, narrow, toggle, close }), [visible, narrow, toggle, close]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
