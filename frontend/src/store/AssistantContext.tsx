import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ComplaintChecklistData } from "../types";

// Lets whichever document page is currently on screen hand its live data
// and change-handler to the single, globally-mounted assistant widget (see
// DocumentAssistant.tsx, mounted once in App.tsx). Pages that aren't a
// fillable document simply never register a target, so the widget stays
// visible everywhere but explains itself instead of trying to fill fields.
export interface AssistantTarget {
  documentKind: string;
  // The specific DocumentDefinition.id — distinct from documentKind, since
  // one kind (e.g. "service-report") covers several formats (Rodent/
  // General/Fly/Lizard Control). Needed to look up the exact document for
  // the "about this document" (What/How/Who/When) card.
  documentId: string;
  currentData: unknown;
  onApply: (patch: Record<string, unknown>) => void;
  // Present only on a Customer Complaint Handling Checklist page: lets the
  // widget run its guided A→E walk-through against the live record and
  // drive the submit/approve steps (see engine/guidedChecklist.ts).
  checklist?: ChecklistBinding;
}

export interface ChecklistBinding {
  recordId: string;
  title: string; // e.g. "Complaint CC-07 · Gulab Oil And Food"
  getData: () => ComplaintChecklistData;
  setData: (data: ComplaintChecklistData) => void;
  editable: boolean;
  canApprove: boolean;
  submit: () => { ok: boolean; errors: string[] };
  approve: () => { ok: boolean; errors: string[] };
  sendBack: (reason: string) => void;
  // A brand-new / still-empty checklist asks the widget to open itself and
  // start the walk-through without the user having to find the button.
  autoStart: boolean;
}

interface AssistantContextValue {
  // The live target lives in a ref, not state: currentData/onApply change
  // on every keystroke, and re-rendering the whole app on every keystroke
  // (via context state) would re-render the registering page too, which
  // would hand back a new target object and re-trigger the same update —
  // an infinite loop. A ref lets reads always be fresh without ever
  // triggering a render.
  ref: React.MutableRefObject<AssistantTarget | null>;
  // Coarse, reactive signals for the widget to redraw on — only change when
  // the active target's kind/id actually changes (navigating to a different
  // document, or a record becoming non-editable), not on every keystroke.
  targetKind: string | null;
  targetDocumentId: string | null;
  // Changes whenever something the widget renders chips from changes on the
  // checklist binding (editable / canApprove / autoStart) — e.g. right after
  // Submit, so "Review & approve" appears without waiting for an unrelated
  // re-render. Set from the registering page's effect, i.e. AFTER the ref
  // has been refreshed, so anything keyed on it reads a fresh ref.
  targetSignature: string;
  setTargetKind: (kind: string | null) => void;
  setTargetDocumentId: (id: string | null) => void;
  setTargetSignature: (s: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AssistantTarget | null>(null);
  const [targetKind, setTargetKind] = useState<string | null>(null);
  const [targetDocumentId, setTargetDocumentId] = useState<string | null>(null);
  const [targetSignature, setTargetSignature] = useState("");
  return (
    <AssistantContext.Provider value={{ ref, targetKind, targetDocumentId, targetSignature, setTargetKind, setTargetDocumentId, setTargetSignature }}>
      {children}
    </AssistantContext.Provider>
  );
}

function useAssistantInternal(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("Assistant hooks must be used within AssistantProvider");
  return ctx;
}

// Called from a document page's render with its current target (or null
// while not editable / not a fillable document). Keeps the ref fresh on
// every render (cheap, no re-render triggered) and only flips the reactive
// `targetKind`/`targetDocumentId` when they actually change, so navigating
// away — or a record becoming non-editable — correctly updates the widget
// without looping.
export function useSetAssistantTarget(target: AssistantTarget | null) {
  const { ref, setTargetKind, setTargetDocumentId, setTargetSignature } = useAssistantInternal();

  useEffect(() => {
    ref.current = target;
    return () => {
      ref.current = null;
    };
  });

  const kind = target?.documentKind ?? null;
  const documentId = target?.documentId ?? null;
  const c = target?.checklist;
  const signature = [kind, documentId, c?.recordId ?? "", c?.editable ? "e" : "", c?.canApprove ? "a" : "", c?.autoStart ? "s" : ""].join("|");
  useEffect(() => {
    setTargetKind(kind);
    setTargetDocumentId(documentId);
    setTargetSignature(signature);
    return () => {
      setTargetKind(null);
      setTargetDocumentId(null);
      setTargetSignature("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, documentId, signature]);
}

// Used by the globally-mounted widget: `hasTarget`/`targetKind`/
// `targetDocumentId`/`targetSignature` are safe to use in render/deps (they
// only change on navigation or a lifecycle change), `getTarget()` reads the
// always-fresh ref at the moment the user actually sends a message.
export function useAssistantTarget(): {
  hasTarget: boolean;
  targetKind: string | null;
  targetDocumentId: string | null;
  targetSignature: string;
  getTarget: () => AssistantTarget | null;
} {
  const { ref, targetKind, targetDocumentId, targetSignature } = useAssistantInternal();
  return { hasTarget: targetKind !== null, targetKind, targetDocumentId, targetSignature, getTarget: () => ref.current };
}
