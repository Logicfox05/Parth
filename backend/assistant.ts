// Calls Groq (server-side only) to turn a free-text message into either a
// patch of fields for whichever document is open, a place to navigate to, or
// a plain reply — see runAssistant() at the bottom. The API key must never
// reach the browser bundle, so this file is only ever invoked from
// index.ts's /api/assistant/chat route.
import { groqChatJSON } from "./groq.ts";

// Kept in sync with the shapes in src/types/record.ts. Field guides are
// plain-language, not JSON Schema, because the model just needs to know
// what each field means (e.g. that a checkpoint value is "OK"/"NOT OK") —
// the current record's own JSON, sent alongside, already shows the exact
// shape to preserve.
// Every date field below is bound to an <input type="date">, and
// timeOfChecking to an <input type="time"> — both render blank if the value
// isn't in the exact format the input expects, so the model is told that
// explicitly rather than left to infer it from a display example.
const DATE_TIME_RULE =
  'Any calendar-date field must be an ISO "YYYY-MM-DD" string (e.g. "2026-09-15"). timeOfChecking, if present, must be 24-hour "HH:MM" (e.g. "09:15" for 9:15 AM). Never use a display format like "15 Sept 2026" or "9:15 AM" for these.';

const FIELD_GUIDES: Record<string, string> = {
  "daily-pest-monitoring": `
Fields: isHoliday (boolean). checkpoints (object keyed "1".."10", each value
{ value, note }). value must be the exact string "Yes" or "No" for every
checkpoint EXCEPT checkpoint 4, where it is a plain number (total rodent
traps provided) — never write "OK"/"NOT OK", only "Yes" or "No" are valid
option values. The 10 checkpoints, in order: 1) external door pest-proofing
working, 2) gaps/entry points for pests, 3) fly catchers working & numbered,
4) total rodent traps provided (number), 5) rodent traps numbered, 6) rodent
traps placed in recorded location, 7) any pest trapped in rodent trap box,
8) any dead rodent observed (note = location, if yes), 9) any rodent cake
biting sign (note = rodent box number, if yes), 10) fly catcher tube lights
within validity. timeOfChecking (24-hour "HH:MM" string). checker (string,
the technician's name). summaryActions (array of { id, dateOfObservation,
descriptionOfObservation, actionTaken, remarks }) — dateOfObservation is a
calendar date; this array is only used when a checkpoint finding needs a
follow-up action. rodentCatches (array of { id, trapBoxNo, location, count })
— REQUIRED whenever checkpoint 7 is "Yes": one entry per trap box that caught
something, trapBoxNo like "RB-27", location one of the plant's Rodent Control
areas (e.g. "Canteen", "RM Inward & FG Dispatch room - Ground floor"), count
a whole number of rodents (>= 1). When the user says a rodent was found, set
checkpoint 7 to "Yes" AND add the catch entry; give new entries an id like
"new-1". ${DATE_TIME_RULE}`,
  "fly-catcher": `
Fields: monthYear (string, e.g. "September-26"). entries (array of { pcId,
catchCountApprox, tubeLightInstallDate, tubeLightDueDate, cleaningDoneBy,
verifiedBy }) — one entry per fly-catcher unit (PC-01, PC-02, ...);
tubeLightInstallDate and tubeLightDueDate are calendar dates. Match entries
to the user's instruction by pcId (an existing unit id already in the data —
don't invent a new pcId unless the user clearly names one that isn't there
yet); keep every existing entry in the array, only changing the ones the
user mentioned. ${DATE_TIME_RULE}`,
  "service-report": `
Fields: serviceName (string, e.g. "Rodent Control", "General Pest Control",
"Fly Control"). lines (array of { slNo, areaName,
materialName, qtyUsed, methodOfApplication, remarks }) — one line per area
treated; slNo is a plain sequential number (1, 2, 3, ...), not an id.
technicianSign (string, technician's name). customerSign (string,
customer/site contact's name).`,
  gap: `
This is the CAPA (Corrective and Preventive Action) document.
Fields: inspectionDate (calendar date). premisesName (string).
premisesAddress (string). contactPerson (string). findings (array of { id,
sNo, findingOfInspection, commentsOnFindings, correctiveActionContractor,
correctiveActionClient, targetDate, actualDateOfAction,
verifiedByServiceProvider, status, source }) — targetDate and
actualDateOfAction are calendar dates; sNo is a plain sequential number, not
an id. source must be exactly "Internal" or "External" — "Internal" for a
finding the company's own staff identified, "External" for one raised by an
outside auditor, customer, or regulator; default to "Internal" unless the
user clearly says it came from an outside party. For a new finding, set
status to "Open" unless the user says it's already resolved (then "Closed")
— "Overdue" and "Verified" are set automatically elsewhere in the app,
don't assign them yourself. generalComments (array of strings).
${DATE_TIME_RULE}`,
  training: `
Fields: trainingDate (calendar date). trainingType (string, e.g.
"Technician Certification"). trainerProvider (string). topics (array of
strings). attendees (array of { id, employeeName, department, attended });
attended is a boolean. certificateRef (string). remarks (string).
${DATE_TIME_RULE}`,
  "complaint-checklist": `
The Customer Complaint Handling Checklist (F/MKT/05). Top-level fields:
customerName, complaintNo, jobName, jobCode, poNo (strings),
complaintReceivedDate (calendar date), sections (array of 5 { key "A".."E",
title, items }), preparedBy and approvedBy ({ name, designation, date }).
Each item is { srNo, activity, done (boolean), date (calendar date or null),
comment, notRequired (boolean) } — match the user's words to the item whose
activity text fits, keep every item in every section (return the COMPLETE
sections array when changing any item, ids/order preserved), set done=true
with today's date when they say something was done, notRequired=true for
"not required"/"N/A". Never change activity text or srNo. ${DATE_TIME_RULE}`,
  "log-sheet": `
A tabular log sheet (lamination QC / production register). Fields: header
(object of string values keyed by field key) and rows (array of row objects,
each with an "id" plus one value per column key). The current data carries a
"_layout" object describing the form: _layout.headerFields lists the header
keys with their human labels; _layout.columns lists every column key with its
label, type ("text" | "number" | "time" | "date" | "select" | "yesno") and
unit; _layout.rowMode is "free" (rows can be added/removed), "timeSlots"
(one fixed row per clock time — match the user's time to the row whose fixed
time column equals it, never add rows), "fixedRows" (a printed list of test
parameters — match the user's words to the row whose fixed "parameter" column
matches and fill its observation/grade; never add or remove rows) or "single"
(exactly one row). Header keys may include footer fields such as lotStatus
(one of "Accepted", "Reject / Scrap", "Segregation", "Accepted on Deviation"),
deviationReason and inspectedBy.
Map what the user says onto column KEYS using the labels (e.g. "viscosity at
11 o'clock was 20.4" -> the row whose time is "11:00", key "viscosity", value
20.4 as a number). Numeric columns must be numbers, yesno columns exactly
"Yes" or "No", time columns 24-hour "HH:MM". When changing rows, return the
COMPLETE rows array with every existing row (and its id) preserved, only
altering what the user mentioned; give any new row an id like "new-1". Never
return the _layout object. ${DATE_TIME_RULE}`,
};

export const SUPPORTED_DOCUMENT_KINDS = Object.keys(FIELD_GUIDES);

// Every screen the assistant is allowed to send someone to, in the exact
// shape the frontend's isValidAppRoute() (src/store/router.tsx) accepts —
// kept in sync by hand since this prompt and that validator both encode the
// same small route grammar. The model only ever picks a route; the frontend
// re-validates it before calling navigate(), so a malformed or hallucinated
// path never reaches the router — it just falls back to a plain reply.
const ROUTE_GUIDE = `
Valid navigation targets (use EXACTLY this shape, "path/param" meaning substitute a real value):
- /dashboard — the home/overview screen
- /library — Document Library, every controlled document
- /library/{moduleSlug} — Document Library filtered to one module. moduleSlug is the module name,
  lowercased, non-letters/digits turned into single hyphens: "pest-control", "lamination-quality-control",
  "lamination-production", "quality-control-inspection-records", "quality-compliance"
- /calendar — this month's Record Calendar
- /calendar/{year}/{month0} — Record Calendar for a specific month. month0 is 0-based (January=0 ... December=11)
- /day/{YYYY-MM-DD} — everything due on one specific date
- /reports — Reports, current month
- /reports/{year}/{month0}/{tab} — Reports for a specific month and tab. tab is one of:
  monthly (overall records report), daily (Daily Monitoring summary), rodent (Rodent Trend),
  flycatcher (Fly Catcher Trend), chemical (Chemical Usage), gap (CAPA Status), training (Training Status),
  lamination (Lamination QC). Default to "monthly" if the user didn't ask for a specific kind of report.
- /pest-control — the Pest Control module overview: Daily Report, Service Reports, Trend Analysis, Training & Reference
- /pest/daily — the Daily Pest Control Monitoring Record (F/HR/17) register for the current month
- /pest/daily/{year}/{month0} — that register for a specific month
- /pest/service/rodent — the Rat / Mice service reports (Rodent Control Service, by Gurudev Pest Control). Use for
  "rat", "mice", "rodent service", "rodent report"
- /pest/service/general — the Ants & Cockroaches service reports (General Pest Control Services). Use for "ants",
  "cockroach", "general pest"
- /pest/service/fly — the Fly Control service reports (spraying visits). Use for "fly service", "fly control report"
- /pest/service/{rodent|general|fly}/{year} — those service reports for a specific year
- /pest/trend/rodent — Rodent Catch Report and Trend Analysis (rodents per month, per location, per trap box)
- /pest/trend/fly-catcher — Fly Catcher Infestation: the fortnightly F/HR/18 inspection records and flies per
  unit (PC-01..PC-13) per month. Use for "fly catcher", "flies caught", "infestation"
- /pest/trend/{rodent|fly-catcher}/{year} — those trends for a specific year
- /gap — CAPA (Corrective & Preventive Action) home: choose Internal or External
- /gap/internal — CAPA Internal: pest-control inspection findings reports
- /gap/external — CAPA External: customer complaint handling checklists (F/MKT/05)
- /training — Training Records list
- /chemical-master — the Chemical / Pesticide Application Chart
- /sop — the Standard Operating Procedure reference
- /licence — the pest control service provider's (Gurudev Pesticides) Government of Gujarat insecticide licence,
  Form III, kept on file as scanned pages. Use for "licence", "license", "form III", "insecticide licence",
  "Gurudev's licence"
- /soc — Statements of Compliance list
- /assistant — the full-page Assistant chat (the user may already be there; rarely a navigation target)
- /search — the global search screen
- /master-data — admin reference data (employees, chemicals, PC IDs, holidays, ...)
- /demo — Demo Mode (synthetic data for trying the app out)
Never invent a path outside this list, and never include a record id (you don't know any).`;

// One free-text answer about ONE checklist activity, during the assistant's
// guided A→E walk-through of a Customer Complaint Handling Checklist —
// "yes, got the samples on the 3rd", "not needed for this one", "still
// waiting on the customer". Returns exactly what the frontend's
// applyAnswer() needs; the frontend falls back to "done today + comment" if
// this call fails, so a model outage never blocks the walk-through.
export interface ChecklistAnswer {
  done: boolean;
  notRequired: boolean;
  date: string | null;
  comment: string;
}

export async function interpretChecklistAnswer({ activity, answer, today }: { activity: string; answer: string; today: string }): Promise<ChecklistAnswer> {
  const system = [
    "You are helping fill in one line of a customer-complaint handling checklist at a printing/packaging plant.",
    `Today's date is ${today} (ISO).`,
    `The checklist activity is: "${activity}"`,
    "The user has just answered, in their own words, whether/when that activity was done. Interpret it.",
    "Reply with ONLY a JSON object of the exact shape:",
    '{ "done": true|false, "notRequired": true|false, "date": "YYYY-MM-DD" or null, "comment": "..." }',
    "done=true if they say it was done/completed/received/verified/etc. notRequired=true if they say it's not required / not applicable / N/A / not needed.",
    'date: the completion date they mention (resolve words like "today", "yesterday", "last Monday", "3rd" (this month), "3 Sept" against today\'s date), else null. Day-first for numeric dates like 3/9 (3 September).',
    "comment: a short, factual note in their words (what was found, who did it, what's pending) — never invent details; empty string if nothing beyond done/not done was said.",
    "If they say it is NOT done yet / pending / waiting, set done=false, notRequired=false and put the reason in comment.",
  ].join("\n\n");

  const raw = await groqChatJSON({ system, user: answer.trim(), temperature: 0.1 });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The assistant returned an unexpected response shape.");
  }
  const result = raw as Record<string, unknown>;
  const date = typeof result.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : null;
  return {
    done: result.done === true,
    notRequired: result.notRequired === true,
    date,
    comment: typeof result.comment === "string" ? result.comment.trim().slice(0, 300) : "",
  };
}

export interface AssistantResult {
  action: "fill" | "navigate" | "reply";
  patch?: Record<string, unknown>;
  route?: string;
  reply: string;
}

export async function runAssistant({
  message,
  today,
  currentRoute,
  documentKind,
  currentData,
  context,
}: {
  message: string;
  today: string;
  currentRoute: string;
  documentKind?: string;
  currentData?: unknown;
  // Plain-text digest of live app facts prepared by the frontend (today's
  // working-day status, the weekly off, upcoming holidays / adjustment days,
  // what's due) — see frontend/src/engine/assistantLocal.ts. Capped by the
  // route handler.
  context?: string;
}): Promise<AssistantResult> {
  if (typeof message !== "string" || !message.trim()) throw new Error("Message is required.");

  const canFill = !!documentKind && !!FIELD_GUIDES[documentKind];
  const system = [
    "You are the in-app assistant for a digital controlled-record-keeping system used by a printing/packaging",
    "plant's pest control, lamination QC/production and quality-compliance teams. Your job is to make the app",
    "effortless: fill in a record when asked, or take the person straight to the screen they're describing —",
    "never make them hunt through menus for something you can already tell they want.",
    `Today's date is ${today} (ISO). The user is currently on the app route "${currentRoute}".`,
    ROUTE_GUIDE,
    context && context.trim()
      ? `Live facts from the app right now — rely on these for anything about dates, holidays, the weekly off, adjustment days or what is due, and never contradict them:\n${context.trim()}`
      : "",
    'Questions about holidays, the weekly off, adjustment (make-up working) days, or what is due today are answered from the live facts above with action "reply" — do not navigate for them unless the user asks to open a screen.',
    canFill
      ? `The user currently has a "${documentKind}" record open and editable. Field guide for it:${FIELD_GUIDES[documentKind]}\nIts current data (JSON): ${JSON.stringify(currentData ?? {})}`
      : "No document is currently open for editing, so you cannot fill in fields right now — if the message describes data entry, explain (in `reply`) that they should open the relevant record first, and if you can tell which screen that is, also navigate them there.",
    "Reply with ONLY a JSON object of the exact shape:",
    '{ "action": "fill" | "navigate" | "reply", "patch": {...}, "route": "/...", "reply": "..." }',
    '"reply" is ALWAYS required: one short, warm, plain-language sentence confirming what you did (or, for "reply", answering/explaining).',
    'Use "fill" only when a document is open (see above) and the message clearly states data to enter into it — "patch" then follows the field-filling rules below; omit "route".',
    'Use "navigate" when the message is asking to see/open a different screen, date, month\'s reports, or module — "route" must be one of the exact shapes listed above; omit "patch".',
    'Use "reply" for anything else — greetings, thanks, questions you cannot act on, or a fill/navigate request you are not confident about; omit "patch" and "route" rather than guessing wrong.',
    "Field-filling rules (only used with action \"fill\"): each patch value must be the COMPLETE new value for that top-level field — for array fields, include every item (changed and unchanged), not just a diff. Omit any field you are not changing. Never invent data the user did not state or clearly imply. If you add a new array item whose shape has an \"id\" field, set it to a short string like \"new-1\" (not for plain numeric fields like slNo/sNo — continue the existing sequence).",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await groqChatJSON({ system, user: message.trim() });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The assistant returned an unexpected response shape.");
  }
  const result = raw as Record<string, unknown>;

  // Downgrade rather than hard-fail on a malformed action: a model that
  // ignores one instruction (picks "fill" with nothing open, or "navigate"
  // without a route) shouldn't turn into a scary error for the user — it
  // should just fall back to showing whatever reply text it gave.
  let action = result.action as AssistantResult["action"];
  const validPatch = result.patch && typeof result.patch === "object" && !Array.isArray(result.patch);
  if (action === "fill" && (!canFill || !validPatch)) action = "reply";
  if (action === "navigate" && typeof result.route !== "string") action = "reply";
  if (action !== "fill" && action !== "navigate" && action !== "reply") action = "reply";

  return {
    action,
    patch: action === "fill" ? (result.patch as Record<string, unknown>) : undefined,
    route: action === "navigate" ? (result.route as string) : undefined,
    reply: typeof result.reply === "string" && result.reply.trim() ? result.reply.trim() : "Done.",
  };
}
