import React, { useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiPlus, FiSend, FiTrash2, FiZap } from "react-icons/fi";
import { ApiError, assistantApi } from "../api/client";
import { useAuth } from "../store/AuthContext";
import { useAppStore } from "../store/AppStore";
import { isValidAppRoute, useRouter } from "../store/router";
import { readJSON, writeJSON } from "../data/storageAdapter";
import { buildAssistantContext, localAnswer, SUGGESTED_PROMPTS } from "../engine/assistantLocal";
import type { Chip } from "../engine/guidedChecklist";
import { openBriefing } from "../components/common/AssistantBriefingPopup";
import { generateId } from "../utils/id";
import { formatDisplayDate, toISODate, todayISO } from "../utils/date";

// The backend rejects messages over 2000 characters; a locally answered
// message never reaches it, so the same cap is applied here before storing.
const MAX_MESSAGE_CHARS = 2000;

// THE ASSISTANT, FULL PAGE — the same assistant as the floating widget, laid
// out like a chat app: conversations on the left, the thread in the middle,
// a composer at the bottom, suggested questions when a chat is empty. Text
// only — there is deliberately no voice / microphone control. Conversations
// are kept in this browser (localStorage) so a chat survives navigating away
// (the assistant will happily take you to another screen mid-conversation)
// and coming back.
//
// Answers come from two places: a few intents are answered on the client
// instantly (holidays / weekly off / adjustment days, what's due, the
// briefing, help — see engine/assistantLocal.ts); everything else goes to
// /api/assistant/chat with a digest of live facts attached, so the model can
// answer from the app's own data.

interface StoredMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  at: string; // ISO timestamp
  chips?: Chip[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

interface StoredState {
  activeId: string | null;
  conversations: Conversation[];
}

const STORE_KEY = "assistant-conversations";
const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 200;

function loadState(): StoredState {
  const s = readJSON<Partial<StoredState>>(STORE_KEY, {});
  return { activeId: s.activeId ?? null, conversations: Array.isArray(s.conversations) ? s.conversations : [] };
}

// Timestamps are stored as UTC ISO strings; both the date and the time shown
// come from the same LOCAL Date, so a 01:15 IST message isn't labelled with
// the previous (UTC) calendar day.
function dayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formatDisplayDate(toISODate(d));
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDisplayDate(toISODate(d))} ${hh}:${mm}`;
}

export function AssistantPage() {
  const { user } = useAuth();
  const { mode, currentUser } = useAppStore();
  const { navigate } = useRouter();
  const isDemo = mode === "demo";
  const [state, setState] = useState<StoredState>(loadState);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Which conversation the in-flight request belongs to — the typing bubble
  // is only shown there, and that conversation can't be deleted from under
  // its own pending reply.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstName = (user?.name ?? currentUser).trim().split(/\s+/)[0];
  const active = state.conversations.find((c) => c.id === state.activeId) ?? null;

  useEffect(() => {
    writeJSON(STORE_KEY, state);
  }, [state]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.activeId]);

  const createConversation = (): string => {
    const id = generateId("conv");
    const now = new Date().toISOString();
    setState((s) => ({
      activeId: id,
      conversations: [{ id, title: "New chat", createdAt: now, updatedAt: now, messages: [] }, ...s.conversations].slice(0, MAX_CONVERSATIONS),
    }));
    return id;
  };

  const removeConversation = (id: string) => {
    setState((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      return { activeId: s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId, conversations };
    });
  };

  const append = (convId: string, msg: StoredMessage) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              updatedAt: msg.at,
              title: c.title === "New chat" && msg.role === "user" ? msg.text.slice(0, 48) : c.title,
              // Older chips are retired once the conversation moves on — the
              // same rule as the widget, so a stale "Open" button can't act
              // on an outdated answer.
              messages: [...c.messages.map((m) => (m.chips ? { ...m, chips: undefined } : m)), msg].slice(-MAX_MESSAGES),
            }
      ),
    }));
  };

  const runChip = (chip: Chip) => {
    const a = chip.action;
    if (a.type === "navigate") navigate(a.route);
    else if (a.type === "briefing") openBriefing();
    else if (a.type === "focusInput") inputRef.current?.focus();
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text || loading) return;
    setInput("");
    const convId = active?.id ?? createConversation();
    const stamp = () => new Date().toISOString();
    append(convId, { id: generateId("msg"), role: "user", text, at: stamp() });

    const local = localAnswer(text, isDemo, user?.name);
    if (local) {
      append(convId, { id: generateId("msg"), role: "bot", text: local.reply, at: stamp(), chips: local.chips });
      return;
    }

    setLoading(true);
    setPendingId(convId);
    try {
      const result = await assistantApi.chat({
        message: text,
        today: todayISO(),
        currentRoute: "/assistant",
        context: buildAssistantContext(isDemo, user?.name),
      });
      if (result.action === "navigate" && result.route && isValidAppRoute(result.route)) {
        append(convId, {
          id: generateId("msg"),
          role: "bot",
          text: result.reply,
          at: stamp(),
          chips: [{ label: "Open it again", action: { type: "navigate", route: result.route } }],
        });
        navigate(result.route);
        return;
      }
      append(convId, { id: generateId("msg"), role: "bot", text: result.reply, at: stamp() });
    } catch (err) {
      append(convId, {
        id: generateId("msg"),
        role: "bot",
        text: err instanceof ApiError ? err.message : "Sorry — something went wrong on my end. Try again in a moment.",
        at: stamp(),
      });
    } finally {
      setLoading(false);
      setPendingId(null);
    }
  };

  return (
    <div className={`assistant-page ${isDemo ? "demo-watermark" : ""}`}>
      <aside className="assistant-side card">
        <div className="assistant-side-head">
          <span className="text-sm font-semibold">Conversations</span>
          <button className="btn btn-primary btn-sm" onClick={() => createConversation()} aria-label="New chat">
            <FiPlus size={13} /> New chat
          </button>
        </div>
        <div className="assistant-side-list">
          {state.conversations.length === 0 && <div className="text-xs text-faint" style={{ padding: "10px 12px" }}>No conversations yet — ask anything below.</div>}
          {state.conversations.map((c) => (
            <div key={c.id} className={`assistant-conv ${c.id === state.activeId ? "active" : ""}`} onClick={() => setState((s) => ({ ...s, activeId: c.id }))}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="text-sm truncate">{c.title}</div>
                <div className="text-xs text-faint">{dayLabel(c.updatedAt)}</div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                aria-label="Delete conversation"
                title={c.id === pendingId ? "Waiting for a reply — try again in a moment" : "Delete conversation"}
                disabled={c.id === pendingId}
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(c.id);
                }}
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="assistant-main card">
        <header className="assistant-head">
          <span className="chat-avatar" style={{ width: 30, height: 30 }}>
            <FiZap size={14} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="font-semibold">Assistant</div>
            <div className="text-xs text-muted truncate">Ask, navigate, fill — in plain words. Knows today's work, the leave calendar and every register. This system only; text only.</div>
          </div>
        </header>

        <div ref={logRef} className="assistant-log chat-log">
          {(!active || active.messages.length === 0) && (
            <div className="assistant-welcome">
              <h2 className="text-xl mb-1">Hi {firstName} 👋</h2>
              <p className="text-muted mb-4" style={{ maxWidth: 560 }}>
                I'm your buddy for this system. Ask me what's due, where something is, whether a day is a holiday, or tell me what happened and I'll fill it in. I answer about this
                software and its records only — anything outside it I'll politely decline. Pick a question to start, or type your own.
              </p>
              <div className="assistant-suggestions">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p.title} type="button" className="assistant-suggestion" onClick={() => send(p.text)}>
                    <FiMessageSquare size={13} className="text-faint" />
                    <span>
                      <strong>{p.title}</strong>
                      <span className="text-xs text-muted" style={{ display: "block" }}>
                        {p.text}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {active?.messages.map((m) => (
            <React.Fragment key={m.id}>
              <div className={`chat-msg ${m.role}`} title={timeLabel(m.at)}>
                {m.text}
              </div>
              {m.chips && m.chips.length > 0 && (
                <div className="chat-chips" style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                  {m.chips.map((c) => (
                    <button key={c.label} type="button" className={`chat-chip ${c.tone ?? ""}`} onClick={() => runChip(c)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
          {loading && pendingId === active?.id && (
            <div className="chat-msg bot">
              <span className="chat-typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        <div className="assistant-composer">
          <textarea
            ref={inputRef}
            className="input assistant-input"
            rows={2}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder="Message the assistant… (Enter to send, Shift+Enter for a new line)"
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
          <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send message">
            <FiSend size={14} /> Send
          </button>
        </div>
        <div className="text-xs text-faint" style={{ padding: "0 16px 12px" }}>
          Answers cover this record system only — not general questions. Text only, no voice input. Conversations are saved in this browser. The assistant never submits or verifies
          anything by itself.
        </div>
      </section>
    </div>
  );
}
