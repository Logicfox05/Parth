import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMessageCircle, FiMic, FiMicOff, FiMove, FiSend, FiX, FiZap } from "react-icons/fi";
import { ApiError, assistantApi } from "../../api/client";
import { useAssistantTarget } from "../../store/AssistantContext";
import { useAuth } from "../../store/AuthContext";
import { useAppStore } from "../../store/AppStore";
import { useRouter, isValidAppRoute } from "../../store/router";
import { useDraggable } from "../../utils/useDraggable";
import { masterRepository } from "../../data/repositories/masterRepository";
import { documentRepository } from "../../data/repositories/documentRepository";
import { getDocumentInfo } from "../../engine/documentInfo";
import {
  applyAnswer,
  firstStep,
  promptFor,
  stepAfter,
  summarise,
  type Chip,
  type ChipAction,
  type GuidedAnswer,
  type GuidedPrompt,
  type GuidedStep,
} from "../../engine/guidedChecklist";
import { buildAssistantContext, localAnswer, offTopicReply } from "../../engine/assistantLocal";
import { useLanguage, useT } from "../../i18n";
import { SPEECH_LOCALES } from "../../i18n/strings";
import { settingsRepository } from "../../data/repositories/settingsRepository";
import { isVoiceInputSupported, listenForUtterance, speak, stopSpeaking, type VoiceSession } from "../../utils/speech";
import { formatDisplayDate, todayISO } from "../../utils/date";
import { generateId } from "../../utils/id";
import { openBriefing } from "./AssistantBriefingPopup";

const WIDGET_POSITION_KEY = "dcrs:v1:assistant-widget-pos";
const START_GUIDED_EVENT = "dcrs:start-guided";

// Any page can ask the assistant to open and start walking the user through
// the checklist it has registered (see ChecklistBinding in AssistantContext).
export function startGuidedChecklist(): void {
  window.dispatchEvent(new Event(START_GUIDED_EVENT));
}

const PLACEHOLDER_BY_KIND: Record<string, string> = {
  "daily-pest-monitoring": "e.g. Checkpoints 1 to 5 = Yes, checker Ramesh, time 9:15 AM",
  "fly-catcher": "e.g. PC-01 had 3 flies, cleaned by Vijay",
  "service-report": "e.g. Sprayed Cypermethrin in the Kitchen area, technician Suresh",
  "log-sheet": "e.g. 11 o'clock viscosity was 20.4, tested by Jeni",
  "complaint-checklist": "e.g. samples received on 3 Sept, or: customer is Gulab Oil, complaint CC-12",
  gap: "e.g. Found a gap near the loading dock, corrective action: install a net, target 20 Sept",
  training: "e.g. Training on 3 Sept, topic pest control basics, trainer ABC Pest Solutions",
};

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  chips?: Chip[];
}

// THE ASSISTANT — one chat, everywhere. Message bubbles, quick-reply chips,
// and a text box. Three things happen in here:
//  1. Free text → the Groq-backed /api/assistant/chat: fill the open record,
//     navigate somewhere, or just answer.
//  2. Quick chips → instant local actions (briefing, today's due list, ...).
//  3. The guided walk-through of a Customer Complaint Handling Checklist —
//     header details, then Sections A→E one activity at a time, then the
//     approval question — driven by engine/guidedChecklist.ts (chips never
//     need the network; typed answers are interpreted by the backend and
//     fall back to "done + comment" if that fails).
export function DocumentAssistant() {
  const { hasTarget, targetKind, targetDocumentId, targetSignature, getTarget } = useAssistantTarget();
  const { elRef, style: dragStyle, dragHandleProps, didJustDrag, reclamp } = useDraggable(WIDGET_POSITION_KEY);
  const { user } = useAuth();
  const { version, currentUser, mode } = useAppStore();
  const { path, navigate } = useRouter();
  const { lang } = useLanguage();
  const t = useT();
  const isDemo = mode === "demo";
  const speechLocale = SPEECH_LOCALES[lang];
  const voiceSupported = isVoiceInputSupported();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [guided, setGuided] = useState<{ step: GuidedStep; prompt: GuidedPrompt } | null>(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [awaitingSendBackReason, setAwaitingSendBackReason] = useState(false);
  const [listening, setListening] = useState(false);
  const sessionRef = useRef<VoiceSession | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef<Set<string>>(new Set());
  const guidedRef = useRef(guided);
  guidedRef.current = guided;

  const firstName = (user?.name ?? currentUser).trim().split(/\s+/)[0];

  useEffect(() => {
    reclamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, pickingDate]);

  // ---- message helpers -----------------------------------------------------
  const post = (role: "bot" | "user", text: string, chips?: Chip[]) => {
    if (!text && !chips?.length) return;
    setMessages((m) => [...m.map((x) => (x.chips ? { ...x, chips: undefined } : x)), { id: generateId("msg"), role, text, chips }]);
  };
  const bot = (text: string, chips?: Chip[]) => post("bot", text, chips);
  const me = (text: string) => post("user", text);

  // Greeting once, when the panel first opens.
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const t = getTarget();
    const where = t?.checklist ? ` I can see you're on ${t.checklist.title}.` : hasTarget ? " I can see you have a record open — tell me what to put in it." : "";
    bot(`Hi ${firstName}! 👋${where}\nAsk me to open anything, or tell me what happened and I'll fill it in. The quick buttons below are always there.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- guided walk-through -------------------------------------------------
  const askStep = (step: GuidedStep) => {
    const t = getTarget();
    if (!t?.checklist) return;
    if (step.kind === "finished") {
      setGuided(null);
      return;
    }
    const data = t.checklist.getData();
    // A section that's already complete doesn't need a tap — announce it
    // and move straight on.
    if (step.kind === "section-intro" && data.sections[step.sectionIndex].items.every((it) => it.done || it.notRequired || it.comment.trim())) {
      bot(promptFor(step, data, currentUser).text);
      askStep(stepAfter(data, step));
      return;
    }
    const prompt = promptFor(step, data, currentUser);
    setGuided({ step, prompt });
    bot(prompt.text, prompt.chips);
  };

  const beginGuided = () => {
    const t = getTarget();
    if (!t?.checklist) {
      bot("Open a customer complaint checklist first (CAPA → External), then I'll walk you through it section by section.", [
        { label: "Open CAPA → External", action: { type: "navigate", route: "/gap/external" }, tone: "primary" },
      ]);
      return;
    }
    const data = t.checklist.getData();
    if (t.checklist.canApprove) {
      const s = summarise(data);
      bot(
        `${t.checklist.title} is waiting for approval — ${s.done} of ${s.total} activities done${s.notRequired ? `, ${s.notRequired} not required` : ""}${s.blank ? `, ${s.blank} left blank` : ""}. Prepared by ${data.preparedBy.name || "—"}${data.preparedBy.date ? ` on ${formatDisplayDate(data.preparedBy.date)}` : ""}. Approve it?`,
        [
          { label: "Approve", action: { type: "approve" }, tone: "success" },
          { label: "Send back", action: { type: "sendBack" }, tone: "danger" },
        ]
      );
      return;
    }
    if (!t.checklist.editable) {
      bot("This checklist is already signed off — nothing left to fill in. You can still print it.");
      return;
    }
    const step = firstStep(data);
    bot(`Let's do ${t.checklist.title} together. I'll go section by section — A to E — one activity at a time, and then ask you to submit it for approval. Tap an answer, or just type what happened.`);
    askStep(step);
  };

  const answerGuided = (answer: GuidedAnswer, echo?: string) => {
    const g = guidedRef.current;
    const t = getTarget();
    if (!g || !t?.checklist) return;
    if (echo) me(echo);
    setPickingDate(false);
    const data = t.checklist.getData();
    const res = applyAnswer(data, g.step, answer);
    if (res.data !== data) t.checklist.setData(res.data);
    if (res.ack) bot(res.ack);
    if (res.stay) {
      const prompt = promptFor(g.step, res.data, currentUser);
      setGuided({ step: g.step, prompt });
      bot(prompt.text, prompt.chips);
      return;
    }
    askStep(stepAfter(res.data, g.step));
  };

  const runAction = (chip: Chip) => {
    const a: ChipAction = chip.action;
    const t = getTarget();
    switch (a.type) {
      case "guided":
        answerGuided(a.answer, chip.label);
        return;
      case "pickDate":
        setPickingDate(true);
        return;
      case "submit": {
        me(chip.label);
        if (!t?.checklist) return;
        const r = t.checklist.submit();
        if (r.ok) {
          setGuided(null);
          bot("Submitted ✅ It's now waiting for the QA Head's approval — they'll see it in their briefing and can approve it right from here. Nothing more for you to do on this one.");
        } else {
          bot(`Before I can submit it: ${r.errors.join(" ")} Let's sort that out.`);
          askStep(firstStep(t.checklist.getData()));
        }
        return;
      }
      case "later":
        me(chip.label);
        setGuided(null);
        bot("No problem — everything you've answered is saved on the form. Tap \"Walk me through it\" whenever you want to pick it up again.");
        return;
      case "approve": {
        me(chip.label);
        if (!t?.checklist) return;
        const r = t.checklist.approve();
        bot(r.ok ? "Approved ✅ The checklist is signed off as Approved By with your name and today's date, and the complaint is closed." : `I couldn't approve it yet: ${r.errors.join(" ")}`);
        return;
      }
      case "sendBack":
        me(chip.label);
        setAwaitingSendBackReason(true);
        bot("What should they fix? Type a short note and I'll send it back with that.");
        return;
      case "navigate":
        me(chip.label);
        bot("On it.");
        navigate(a.route);
        return;
      case "briefing":
        me(chip.label);
        setOpen(false);
        openBriefing();
        return;
      case "startGuided":
        me(chip.label);
        beginGuided();
        return;
      case "focusInput":
        setInput("");
        inputRef.current?.focus();
        return;
    }
  };

  const quickChips: Chip[] = useMemo(() => {
    const t = getTarget();
    const chips: Chip[] = [];
    if (t?.checklist?.editable && !guided) chips.push({ label: "Walk me through it (A → E)", action: { type: "startGuided" }, tone: "primary" });
    if (t?.checklist?.canApprove) chips.push({ label: "Review & approve", action: { type: "startGuided" }, tone: "success" });
    if (guided) chips.push({ label: "Stop the walk-through", action: { type: "later" } });
    chips.push({ label: "Today's briefing", action: { type: "briefing" } });
    chips.push({ label: "What's due today?", action: { type: "navigate", route: `/day/${todayISO()}` } });
    chips.push({ label: "This month's reports", action: { type: "navigate", route: "/reports" } });
    if (!path.startsWith("/gap")) chips.push({ label: "Open CAPA", action: { type: "navigate", route: "/gap" } });
    if (hasTarget && !t?.checklist) chips.push({ label: "Fill this record for me…", action: { type: "focusInput", placeholder: "" } });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTarget, targetKind, targetDocumentId, targetSignature, guided, path, version]);

  // A fresh, empty complaint checklist opens the assistant and starts the
  // walk-through by itself — the whole point is that nobody has to work out
  // where to begin. Once per record.
  useEffect(() => {
    const t = getTarget();
    if (t?.checklist?.autoStart && !startedRef.current.has(t.checklist.recordId)) {
      startedRef.current.add(t.checklist.recordId);
      setOpen(true);
      // Let the greeting effect post first so the walk-through reads in order.
      setTimeout(() => beginGuided(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSignature]);

  // Leaving the checklist page ends any walk-through in progress.
  useEffect(() => {
    if (guidedRef.current && targetKind !== "complaint-checklist") {
      setGuided(null);
      setPickingDate(false);
    }
    setAwaitingSendBackReason(false);
  }, [targetKind, targetDocumentId]);

  useEffect(() => {
    const onStart = () => {
      setOpen(true);
      setTimeout(() => beginGuided(), 0);
    };
    window.addEventListener(START_GUIDED_EVENT, onStart);
    return () => window.removeEventListener(START_GUIDED_EVENT, onStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never leave the microphone open or a reply mid-sentence when the widget
  // unmounts (navigating to the full-page Assistant does exactly that).
  useEffect(() => {
    return () => {
      sessionRef.current?.cancel();
      stopSpeaking();
    };
  }, []);

  // ---- sending free text ---------------------------------------------------
  // `spoken` = the question came in by voice, so the answer is read back even
  // when "read replies aloud" is off.
  const send = async (raw?: string, spoken = false) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const t2 = getTarget();
    const speakReplies = settingsRepository.get().speakReplies;
    const readOut = (reply: string) => {
      if (spoken || speakReplies) speak(reply, speechLocale);
    };

    if (awaitingSendBackReason && t2?.checklist) {
      me(text);
      setAwaitingSendBackReason(false);
      t2.checklist.sendBack(text);
      bot("Sent back with your note. It's back with whoever prepared it.");
      return;
    }

    const g = guidedRef.current;
    if (g && t2?.checklist) {
      if (g.prompt.freeText === "header") {
        answerGuided({ type: "text", text }, text);
        return;
      }
      if (g.prompt.freeText === "item" && g.step.kind === "item") {
        me(text);
        setLoading(true);
        try {
          const activity = t2.checklist.getData().sections[g.step.sectionIndex].items[g.step.itemIndex].activity;
          const parsed = await assistantApi.checklistAnswer(activity, text, todayISO());
          answerGuided({ type: "parsed", ...parsed });
        } catch {
          answerGuided({ type: "text", text });
        } finally {
          setLoading(false);
        }
        return;
      }
      if (g.step.kind === "approval" && /^(yes|yeah|yep|ok|okay|sure|submit|go ahead|do it)\b/i.test(text)) {
        runAction({ label: text, action: { type: "submit" } });
        return;
      }
    }

    me(text);
    // Calendar / workload / help QUESTIONS are answered right here from the
    // app's own data — instant, and no network needed (engine/assistantLocal.ts).
    // With a record open, an instruction like "mark today as holiday" is a
    // fill request for the model, not a calendar question — only genuine
    // questions take the local path then.
    const looksLikeQuestion =
      /\?\s*$/.test(text) || /^(is|was|are|were|when|which|what|who|how|do|does|did|can|could|will|tell me|list|show|give me|i want|find|get me)\b/i.test(text);
    // With a record open, free text is normally data to fill in — but an
    // out-of-scope message never is, so it is declined either way.
    const local = !t2 || looksLikeQuestion ? localAnswer(text, isDemo, user?.name) : offTopicReply(text);
    if (local) {
      bot(local.reply, local.chips);
      readOut(local.reply);
      return;
    }
    setLoading(true);
    try {
      const result = await assistantApi.chat({
        message: text,
        today: todayISO(),
        currentRoute: path,
        documentKind: t2?.documentKind,
        currentData: t2?.currentData,
        context: buildAssistantContext(isDemo, user?.name),
        language: lang,
      });
      if (result.action === "fill" && t2) {
        const fields = Object.keys(result.patch ?? {});
        if (fields.length === 0) {
          bot("Hmm, I couldn't pick anything out of that — mind rephrasing?");
        } else {
          t2.onApply(result.patch ?? {});
          bot(`${result.reply}\nI've filled in ${fields.join(", ")} — take a look and Save when it's right.`);
        }
        readOut(result.reply);
        return;
      }
      if (result.action === "navigate" && result.route && isValidAppRoute(result.route)) {
        bot(result.reply);
        readOut(result.reply);
        navigate(result.route);
        return;
      }
      bot(result.reply);
      readOut(result.reply);
    } catch (err) {
      bot(err instanceof ApiError ? err.message : t("ai.error"));
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    // Pressing it while listening means "I've finished" — send what was said.
    if (listening) {
      sessionRef.current?.finish();
      sessionRef.current = null;
      setListening(false);
      return;
    }
    if (!voiceSupported) {
      bot(t("ai.voiceUnsupported"));
      return;
    }
    stopSpeaking();
    setListening(true);
    sessionRef.current = listenForUtterance({
      lang: speechLocale,
      // Show the sentence building in the box, so a pause mid-thought
      // clearly hasn't cut them off.
      onInterim: (partial) => setInput(partial),
      onFinal: (transcript) => {
        setInput("");
        void send(transcript, true);
      },
      onError: (kind) => bot(kind === "denied" ? t("ai.voiceDenied") : t("ai.voiceError")),
      onEnd: () => {
        sessionRef.current = null;
        setListening(false);
      },
    });
  };

  const describeDocument = () => {
    if (!targetDocumentId) return;
    const doc = documentRepository.getById(targetDocumentId);
    if (!doc) return;
    const info = getDocumentInfo(doc, masterRepository.get());
    me("About this document");
    bot(`${doc.name}\nWHAT — ${info.what}\nWHO — ${info.whoLabel}\nWHEN — ${info.when}\nHOW — ${info.how}`);
  };

  const placeholder = guided
    ? guided.prompt.freeText === "item"
      ? "…or type what happened, e.g. \"received on 3 Sept with photos\""
      : guided.prompt.freeText === "header"
        ? "Type it here"
        : "Tap an answer above, or ask me something else"
    : (targetKind && PLACEHOLDER_BY_KIND[targetKind]) || t("ai.defaultPlaceholder");

  const subtitle = getTarget()?.checklist?.title ?? (hasTarget ? t("ai.recordOpenSubtitle") : t("ai.widgetSubtitle"));

  // The full-page Assistant IS the chat on that screen — two chat boxes
  // would just be confusing. (After every hook above, so the hook order is
  // identical on every render.)
  if (path === "/assistant") return null;

  return (
    <div ref={elRef} className="no-print" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 50, ...dragStyle }}>
      {!open && (
        <button
          className="btn btn-primary"
          style={{ borderRadius: 999, boxShadow: "var(--shadow-lg)", cursor: "grab", touchAction: "none" }}
          onClick={() => {
            if (!didJustDrag()) setOpen(true);
          }}
          {...dragHandleProps}
        >
          <FiMessageCircle size={15} /> {t("ai.widgetOpen")}
        </button>
      )}
      {open && (
        // Sized to its content, capped — a short conversation shouldn't park a
        // 640px panel over the page (it sits bottom-right, exactly where most
        // tables keep their "Open" buttons); a long one scrolls inside.
        <div className="card" style={{ width: 370, maxHeight: "min(640px, calc(100vh - 40px))", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)" }}>
          <div
            className="flex items-center justify-between"
            style={{ cursor: "grab", touchAction: "none", padding: "12px 14px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
            {...dragHandleProps}
          >
            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
              <span className="chat-avatar">
                <FiZap size={12} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="text-sm font-semibold flex items-center gap-1">
                  {t("ai.title")} <FiMove size={10} className="text-faint" />
                </div>
                <div className="text-xs text-muted truncate" style={{ maxWidth: 250 }}>
                  {subtitle}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasTarget && (
                <button className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onPointerDown={(e) => e.stopPropagation()} onClick={describeDocument} title="About this document">
                  ?
                </button>
              )}
              <button
                className={`btn btn-ghost btn-sm btn-icon ${listening ? "voice-on" : ""}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleListening}
                aria-label={listening ? t("ai.stopVoice") : t("ai.startVoice")}
                title={voiceSupported ? (listening ? t("ai.stopVoice") : t("ai.startVoice")) : t("ai.voiceUnsupported")}
                aria-pressed={listening}
              >
                {listening ? <FiMicOff size={14} /> : <FiMic size={14} />}
              </button>
              <button className="btn btn-ghost btn-sm" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)} aria-label="Close assistant">
                <FiX size={14} />
              </button>
            </div>
          </div>

          <div ref={logRef} className="chat-log" style={{ flex: "1 1 auto", minHeight: 120, overflowY: "auto", padding: 14 }}>
            {messages.map((m) => (
              <React.Fragment key={m.id}>
                <div className={`chat-msg ${m.role}`}>{m.text}</div>
                {m.chips && m.chips.length > 0 && (
                  <div className="chat-chips" style={{ alignSelf: "flex-start", maxWidth: "95%" }}>
                    {m.chips.map((c) => (
                      <button key={c.label} type="button" className={`chat-chip ${c.tone ?? ""}`} onClick={() => runAction(c)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {pickingDate && (
              <div className="chat-msg bot" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="text-xs">Which date?</span>
                <input
                  type="date"
                  className="input input-sm"
                  style={{ width: 150 }}
                  autoFocus
                  max={todayISO()}
                  onChange={(e) => {
                    if (e.target.value) answerGuided({ type: "doneOn", date: e.target.value }, formatDisplayDate(e.target.value));
                  }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setPickingDate(false)}>
                  Cancel
                </button>
              </div>
            )}
            {loading && (
              <div className="chat-msg bot">
                <span className="chat-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", padding: "8px 12px 10px", flexShrink: 0 }}>
            <div className="chat-chips mb-2">
              {quickChips.map((c) => (
                <button key={c.label} type="button" className={`chat-chip ${c.tone ?? ""}`} style={{ fontSize: 11, padding: "3px 9px" }} onClick={() => runAction(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-start">
              <textarea
                ref={inputRef}
                className="input"
                rows={2}
                style={{ flex: 1, resize: "none", fontSize: 13 }}
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
              />
              <button className="btn btn-primary btn-sm" style={{ alignSelf: "stretch" }} onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send">
                <FiSend size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
