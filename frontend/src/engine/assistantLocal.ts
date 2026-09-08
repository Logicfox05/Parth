import type { Chip } from "./guidedChecklist";
import { masterRepository } from "../data/repositories/masterRepository";
import { recordRepository } from "../data/repositories/recordRepository";
import { computeBriefing } from "./assistantBriefing";
import { dayInfo, describeDay, nextWeeklyOff, upcomingHolidays, weeklyOffDay, WEEKDAY_LONG, type DayInfo } from "./holidays";
import { addDays, formatDisplayDate, fromISODate, pad2, todayISO } from "../utils/date";

// WHAT THE ASSISTANT KNOWS WITHOUT ASKING THE MODEL.
//
// Two things live here:
//  * buildAssistantContext() — a short, plain-text digest of live facts (today,
//    the weekly off, the next holidays and adjustment days, what's due) sent
//    with every chat message so the model answers calendar / workload
//    questions from the app's own data instead of guessing.
//  * localAnswer() — a handful of intents answered entirely on the client,
//    instantly and without the network: "is Thursday a holiday?", "next
//    holiday?", "adjustment days?", "what's due today?", "my briefing",
//    "help". Everything else goes to the model (with the context above).

export interface LocalAnswer {
  reply: string;
  chips?: Chip[];
}

export const SUGGESTED_PROMPTS: { title: string; text: string }[] = [
  { title: "What's due today?", text: "What's due today and what have you already prepared for me?" },
  { title: "Is tomorrow a holiday?", text: "Is tomorrow a holiday?" },
  { title: "Next company holiday", text: "When is the next company holiday?" },
  { title: "Adjustment days", text: "Which adjustment days are coming up?" },
  { title: "This month's reports", text: "Show me this month's reports" },
  { title: "Rat / Mice service reports", text: "Open the rat and mice service reports" },
  { title: "Daily pest control report", text: "Take me to the daily pest control report" },
  { title: "Rodent trend", text: "Show me the rodent catch trend for this year" },
];

const WEEKDAY_RE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/i;
// Deliberately narrow: bare words like "closed" or "adjustment" also occur in
// complaint / trap-position talk ("is the complaint closed today?", "I made an
// adjustment to the box") and must reach the model, not the calendar.
const HOLIDAY_RE = /\b(holiday|holidays|weekly[ -]?off|off[ -]?day|day[ -]?off|working day|adjustment (?:day|days|date|dates)|leave calendar|non-?working day)\b/i;
const ADJUSTMENT_RE = /\badjustment (?:day|days|date|dates)\b/i;
const NEXT_RE = /\b(next|upcoming|coming up|coming|list|calendar)\b/i;
const PAST_RE = /\b(last|previous|past)\b/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function weekdayIndex(word: string): number {
  const w = word.toLowerCase().slice(0, 3);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(w);
}

// "today", "tomorrow", "day after tomorrow", "yesterday", a weekday name
// ("this Thursday", "next Friday"), or an explicit date (ISO, dd-mm-yyyy,
// dd/mm/yyyy, "12 Nov", "12th November 2026").
function parseDateRef(text: string, today: string): { date: string; phrase: string } | null {
  const lower = text.toLowerCase();
  if (/\bday after tomorrow\b/.test(lower)) return { date: addDays(today, 2), phrase: "The day after tomorrow" };
  if (/\btomorrow\b/.test(lower)) return { date: addDays(today, 1), phrase: "Tomorrow" };
  if (/\byesterday\b/.test(lower)) return { date: addDays(today, -1), phrase: "Yesterday" };
  if (/\btoday\b/.test(lower)) return { date: today, phrase: "Today" };

  const iso = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, phrase: formatDisplayDate(`${iso[1]}-${iso[2]}-${iso[3]}`) };
  const dmy = lower.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (dmy) {
    const date = `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;
    return { date, phrase: formatDisplayDate(date) };
  }
  const dMon = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b/);
  if (dMon) {
    const year = dMon[3] ? Number(dMon[3]) : fromISODate(today).getFullYear();
    const date = `${year}-${pad2(MONTHS.indexOf(dMon[2]) + 1)}-${pad2(Number(dMon[1]))}`;
    return { date, phrase: formatDisplayDate(date) };
  }
  const wd = lower.match(WEEKDAY_RE);
  if (wd) {
    const target = weekdayIndex(wd[1]);
    const todayDow = fromISODate(today).getDay();
    if (PAST_RE.test(lower)) {
      // "last Thursday" = the most recent one strictly before today.
      const behind = (todayDow - target + 7) % 7 || 7;
      const date = addDays(today, -behind);
      return { date, phrase: `Last ${WEEKDAY_LONG[target]}, ${formatDisplayDate(date)}` };
    }
    let ahead = (target - todayDow + 7) % 7;
    if (/\bnext\b/.test(lower) && ahead === 0) ahead = 7;
    const date = addDays(today, ahead);
    return { date, phrase: ahead === 0 ? `Today (${WEEKDAY_LONG[target]})` : `${/\bnext\b/.test(lower) ? "Next " : "This "}${WEEKDAY_LONG[target]}, ${formatDisplayDate(date)}` };
  }
  return null;
}

function holidayChips(): Chip[] {
  return [
    { label: "Record Calendar", action: { type: "navigate", route: "/calendar" } },
    { label: "Holiday calendar (Master Data)", action: { type: "navigate", route: "/master-data" } },
  ];
}

function listUpcoming(today: string, limit: number): string {
  const master = masterRepository.get();
  const items = upcomingHolidays(today, master, limit, 400);
  const off = WEEKDAY_LONG[weeklyOffDay(master)];
  if (items.length === 0) return `There are no festival holidays or adjustment days on the leave calendar in the coming months — only the usual weekly off every ${off} (next one ${formatDisplayDate(nextWeeklyOff(addDays(today, 1), master))}).`;
  const lines = items.map((i) => `• ${formatDisplayDate(i.date)} (${i.weekday.slice(0, 3)}) — ${i.kind === "adjustment" ? `adjustment day${i.name ? ` for ${i.name}` : ""} (working ${i.weekday})` : i.name}`);
  return `Coming up on the Gujarat Print Pack Leave Calendar:\n${lines.join("\n")}\nThe weekly off is every ${off}; the next one is ${formatDisplayDate(nextWeeklyOff(addDays(today, 1), master))}.`;
}

function listAdjustmentDays(today: string): string {
  const master = masterRepository.get();
  const all = (master.adjustmentDays ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  if (all.length === 0) return "No adjustment days are set up in Master Data → Holidays.";
  const upcoming = all.filter((a) => a.date >= today);
  const show = upcoming.length ? upcoming : all;
  const off = WEEKDAY_LONG[weeklyOffDay(master)];
  const lines = show.map((a) => {
    const info = dayInfo(a.date, master);
    return `• ${formatDisplayDate(a.date)} (${info.weekday.slice(0, 3)})${a.forHoliday ? ` — for ${a.forHoliday}` : ""}${a.note ? ` — ${a.note}` : ""}`;
  });
  return `${upcoming.length ? "Upcoming adjustment days" : "Adjustment days this year"} — everyone reports to the company on these ${off}s, so records are due as on any working day:\n${lines.join("\n")}`;
}

function answerForDay(info: DayInfo, phrase: string, today: string): string {
  const master = masterRepository.get();
  const off = WEEKDAY_LONG[weeklyOffDay(master)];
  switch (info.kind) {
    case "weekly-off": {
      const adjustments = (master.adjustmentDays ?? []).filter((a) => a.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3);
      const adj = adjustments.length
        ? ` ${off}s the plant does work (adjustment days): ${adjustments.map((a) => `${formatDisplayDate(a.date)}${a.forHoliday ? ` for ${a.forHoliday}` : ""}`).join(", ")}.`
        : "";
      return `${phrase} is the weekly off — every ${off} is a holiday here, so no records are due and the Daily Pest Control Monitoring Record is pre-marked as a holiday.${adj}`;
    }
    case "holiday":
      return `${phrase} is a company holiday — ${info.name} (Gujarat Print Pack Leave Calendar 2026). Nothing is due; anything scheduled for that day moves to the next working day.`;
    case "adjustment":
      return `${phrase} is an adjustment day${info.name ? ` for ${info.name}` : ""}: it's a ${info.weekday}, but everyone reports to the company, so it's a normal working day — records are due as usual.`;
    default:
      return `${phrase} is a working day (${info.weekday}). Records are due as normal.`;
  }
}

export function localAnswer(message: string, isDemo: boolean, userName?: string): LocalAnswer | null {
  const text = message.trim();
  const lower = text.toLowerCase();
  const today = todayISO();
  const master = masterRepository.get();

  if (HOLIDAY_RE.test(lower)) {
    if (ADJUSTMENT_RE.test(lower)) return { reply: listAdjustmentDays(today), chips: holidayChips() };
    const ref = parseDateRef(text, today);
    if (ref) return { reply: answerForDay(dayInfo(ref.date, master), ref.phrase, today), chips: holidayChips() };
    if (NEXT_RE.test(lower)) return { reply: listUpcoming(today, 8), chips: holidayChips() };
    return null; // e.g. "which day is our weekly off?" — the model answers from the context
  }

  if (/\b(due today|what'?s due|whats due|pending today|today'?s (work|records|tasks|list)|to-?do)\b/.test(lower)) {
    // "What's due on Friday / tomorrow / this week / next month?" is about
    // another day or a span — the model handles that (it can open /day/{date}
    // or the month's calendar); only today is answered locally.
    const ref = parseDateRef(text, today);
    if (ref && ref.date !== today) return null;
    if (/\b(week|month|year|fortnight)\b/.test(lower)) return null;
    const due = recordRepository.query({ dueDate: today, isDemo });
    const done = due.filter((r) => ["Submitted", "Pending Verification", "Verified"].includes(r.status)).length;
    const open = due.length - done;
    const info = dayInfo(today, master);
    let prepared = "";
    if (!isDemo) {
      const b = computeBriefing(userName);
      const ready = b.ready.length + b.needsInput.length;
      if (ready) prepared = ` I've already prepared ${ready} of them — ${b.ready.length} ready for your OK${b.needsInput.length ? `, ${b.needsInput.length} needing a detail only you know` : ""}.`;
      if (b.awaitingVerification.length) prepared += ` ${b.awaitingVerification.length} ${b.awaitingVerification.length === 1 ? "is" : "are"} waiting for a verifier.`;
      if (b.overdue.length) prepared += ` ${b.overdue.length} older ${b.overdue.length === 1 ? "record is" : "records are"} overdue.`;
    }
    const dayNote = info.isHoliday ? ` (${info.label} — so nothing is expected today)` : "";
    return {
      reply: `${formatDisplayDate(today)}${dayNote}: ${due.length} record${due.length === 1 ? "" : "s"} due — ${done} done, ${open} still open.${prepared}`,
      chips: [
        { label: "Open today", action: { type: "navigate", route: `/day/${today}` }, tone: "primary" },
        { label: "Today's briefing", action: { type: "briefing" } },
      ],
    };
  }

  if (/\bbriefing\b/.test(lower) || /\bwhat (did|have) you (prepare|fill|do)/.test(lower)) {
    if (isDemo) return { reply: "The briefing covers your Live records — switch to Live Mode to see what I've prepared for you.", chips: [{ label: "Dashboard", action: { type: "navigate", route: "/dashboard" } }] };
    const b = computeBriefing(userName);
    const parts = [
      b.ready.length ? `${b.ready.length} record${b.ready.length === 1 ? "" : "s"} filled in and ready for your OK` : "",
      b.needsInput.length ? `${b.needsInput.length} needing a detail only you know` : "",
      b.awaitingVerification.length ? `${b.awaitingVerification.length} waiting for a verifier` : "",
      b.overdue.length ? `${b.overdue.length} overdue` : "",
    ].filter(Boolean);
    return {
      reply: parts.length ? `Here's where things stand: ${parts.join(", ")}. Open the briefing to review and submit them in one go.` : "You're all caught up — nothing is waiting on you right now.",
      chips: [{ label: "Open today's briefing", action: { type: "briefing" }, tone: "primary" }],
    };
  }

  if (/^(help|\?|what can you do\??|how do you work\??)$/.test(lower) || /\b(what can you do|what do you do|how can you help)\b/.test(lower)) {
    const off = WEEKDAY_LONG[weeklyOffDay(master)];
    return {
      reply: `I can take you anywhere in the app in plain words ("show me August's reports", "open the rat / mice service reports"), fill in a record you have open ("checker is Ramesh, time 9:15"), tell you what's due and what I've already prepared, and answer calendar questions — holidays, the ${off} weekly off, adjustment days. Text only, no voice.`,
      chips: [
        { label: "What's due today?", action: { type: "navigate", route: `/day/${today}` } },
        { label: "Pest Control", action: { type: "navigate", route: "/pest-control" } },
        { label: "This month's reports", action: { type: "navigate", route: "/reports" } },
      ],
    };
  }

  return null;
}

export function buildAssistantContext(isDemo: boolean, userName?: string): string {
  const master = masterRepository.get();
  const today = todayISO();
  const t = dayInfo(today, master);
  const tomorrow = dayInfo(addDays(today, 1), master);
  const off = WEEKDAY_LONG[weeklyOffDay(master)];
  const upcoming = upcomingHolidays(today, master, 8, 150).map((i) =>
    i.kind === "adjustment" ? `${formatDisplayDate(i.date)} (${i.weekday}) adjustment day${i.name ? ` for ${i.name}` : ""} — a WORKING day` : `${formatDisplayDate(i.date)} (${i.weekday}) ${i.name} — holiday`
  );
  const due = recordRepository.query({ dueDate: today, isDemo });
  const done = due.filter((r) => ["Submitted", "Pending Verification", "Verified"].includes(r.status)).length;
  let workload = `Records due today: ${due.length} (${done} submitted or verified, ${due.length - done} still open).`;
  if (!isDemo) {
    const b = computeBriefing(userName);
    workload += ` Prepared by the assistant and waiting for review: ${b.ready.length + b.needsInput.length}. Awaiting verification: ${b.awaitingVerification.length}. Overdue: ${b.overdue.length}.`;
  }
  return [
    `Today: ${describeDay(t)}.`,
    `Tomorrow: ${describeDay(tomorrow)}.`,
    `Weekly off: every ${off} (next: ${formatDisplayDate(nextWeeklyOff(addDays(today, 1), master))}). An "adjustment day" is a ${off} on which everyone reports to the company — a working day that makes up for a festival holiday. Source: Gujarat Print Pack Leave Calendar 2026 (Master Data → Holidays).`,
    `Upcoming holidays / adjustment days: ${upcoming.length ? upcoming.join("; ") : "none in the next five months"}.`,
    "Scheduling rule: a Daily Pest Control Monitoring Record on a closed day is pre-marked as a holiday; other daily registers have no sheet that day; fortnightly / monthly / quarterly / yearly records that land on a closed day move to the next working day.",
    workload,
    `Mode: ${isDemo ? "Demo (synthetic data)" : "Live"}. User: ${userName ?? "unknown"}.`,
  ]
    .join("\n")
    .slice(0, 3800);
}
