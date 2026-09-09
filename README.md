# Digital Controlled Record System — Pest Control · Lamination QC & Production · Compliance

**Phase 1 prototype.** A digital reproduction of Gujarat Printpack Publication Pvt. Ltd.'s
existing paper-based controlled records — not a generic document manager. Every screen is built
from the company's actual uploaded documents (Format numbers, checkpoint wording, PC locations,
chemical charts, GAP findings, training certificates, photographed lamination registers) so the
digital record looks and behaves like the paper one it replaces. The uploaded sources are kept in
`source-documents/`.

See **REQUIREMENTS.md** for the full source-document inventory and traceability, **DATA_MODEL.md**
for architecture, **TESTING.md** for what was tested, **DEPLOYMENT.md** for how to run/deploy it,
and **FUTURE_ROADMAP.md** for how to extend this to the remaining ~141 controlled formats.

## The assistant: records are ready before you arrive

The app behaves like a personal assistant rather than a blank form:

- **Every record that falls due is pre-filled** (`src/engine/autoFill.ts`) from the user's last real
  record of that document, or from the filled specimen in the source file when there is no history —
  operators, machines, batch numbers, job lists, hourly readings inside the printed band, checkers,
  trap counts. It never invents findings, deviations or CAPA actions.
- **On login the assistant greets the user with a briefing**: what it filled in and why, what still
  needs a detail only a person knows, what is waiting for a verifier, what is coming up, and any
  compliance statement due for re-issue. Each prepared record can be viewed or submitted in one
  click ("Submit all" for the lot); each record page shows a "Your assistant has filled this in"
  banner with the exact notes. The briefing can be reopened from the top bar at any time.
- Prepared records stay **In Progress** — nothing is recorded as a person's until they press Submit,
  and verification is still a separate human step. See REQUIREMENTS.md "How the assistant pre-fills
  records" for the full rules.
- **When the briefing shows itself** (working day 09:00–18:00 by default, Master Data → Working Hours
  & Briefing): the very first time a browser opens the app; once in the **first hour** of the day
  ("here's what I've prepared"); and once in the **last hour** — only if something is still
  unsubmitted ("before you go"). Otherwise it's a click away in the top bar. Each section lists the
  first dozen items and says "…and N more" — "Submit all" still covers everything — so it opens
  instantly however big the backlog is. Records dated before the browser's launch date are treated as
  generator leftovers: never listed, never reminded about, offered as a one-click clean-up instead.
- **The assistant is a chat, present on every screen.** Message bubbles, quick-reply buttons and a
  text box — no wall of status text. Free text like *"show me all reports of August"*, *"open CAPA"*,
  *"what happened on the 15th"* or *"take me to the lamination QC documents"* navigates you straight
  there; on an open record, *"checker is Ramesh, time 9:15"* fills it in. Quick buttons always offer
  today's briefing, what's due today, this month's reports and CAPA. One endpoint,
  `POST /api/assistant/chat` (`backend/assistant.ts`, calling Groq — see **Configuration** below),
  classifies each message as `fill` / `navigate` / `reply`; a route the model proposes is re-validated
  against a strict allowlist (`isValidAppRoute`, `src/store/router.tsx`) before the app ever
  navigates to it, so a bad or hallucinated destination just falls back to a plain reply.
- **CAPA has two doors — Internal and External — and the assistant walks you through External.**
  Internal is the pest-control inspection-findings report (the Dec-2023 GAP report lives there).
  External is the Customer Complaint Handling Checklist (F/MKT/05, from "Updated Checklist.doc").
  Opening a new complaint starts the assistant automatically: it asks for the customer and complaint
  details, then goes through Section A → B → C → D → E one activity at a time ("Done today", "Done on
  a date…", "Not required", "Skip", or just type what happened — "got the samples on the 3rd" is
  understood), and finally asks *"Shall I submit it for approval?"*. Prepared By is stamped with the
  logged-in user; the approver then sees it and can approve (Verify) from the same chat, which stamps
  Approved By. Quick-reply answers never need the network; typed answers go through Groq and fall
  back gracefully. See `src/engine/guidedChecklist.ts`.
- **The sidebar is organized module-by-module and collapsible** — Pest Control, CAPA, Lamination —
  Quality Control, Lamination — Production, Quality Control — Inspection Records, and Quality —
  Compliance each expand/collapse independently; a module you close stays closed until you open it
  again (remembered per browser). Modules without their own list page link into Document Library
  pre-filtered to just that module (`/library/{module-slug}`).
- **The Pest Control module is laid out the way the department reads its paperwork** (`/pest-control`
  overview, `src/pages/PestControlPages.tsx`): **Daily Report** — the Daily Pest Control Monitoring
  Record as a month register (`/pest/daily`); **Service Reports** — Gurudev Pest Control's three
  fortnightly visit reports, Rat / Mice (Rodent Control Service), Ants & Cockroaches (General Pest
  Control Services) and Fly Control (`/pest/service/{rodent|general|fly}`), each with last visit,
  next due, materials and areas; **Trend Analysis** — the Rodent Catch Report and Trend Analysis and
  the Fly Catcher Infestation trend (`/pest/trend/{rodent|fly-catcher}`), both in the company's own
  Source / Unit / Target Pest / Year / Jan–Dec / Total layout; **Training & Reference** — Training
  Records, Chemical Master, SOP. The assistant navigates there from plain speech ("show me the rat
  reports", "fly catcher infestation for this year").
- **Two languages — English and ગુજરાતી — chosen on the Dashboard.** The whole interface switches
  instantly, on every page: navigation, headings, buttons, statuses, tabs, the assistant's own
  wording. It's remembered per browser and also reachable from the top bar. What deliberately does
  **not** translate is the controlled documents' own text — format numbers (F/HR/17), the printed
  check points transcribed verbatim from the paper form, the licence and its terms, the Statements of
  Compliance — because translating a controlled record's wording would break the traceability the
  system exists to provide. (The Gujarati F/QC/13 in-process sheet stays Gujarati either way.) Ask
  the assistant something in Gujarati and it answers in Gujarati.
- **The assistant listens and talks.** Press the microphone on the Assistant page (or in the floating
  widget) and speak — the browser's own speech recognition turns it into text, which then follows
  exactly the same path as anything typed, so nothing is sent anywhere extra. **It waits until you
  have finished the whole sentence**: your words appear in the composer as you speak, a pause to think
  mid-sentence does not send anything, and the question goes only after you have actually stopped
  talking (2.5 s of silence) — or the moment you press **Done**, which sends what you have said rather
  than throwing it away. A question asked out loud is answered out loud; the speaker button turns that
  on for typed questions too. Both follow the chosen language (Indian English or Gujarati). Chrome and
  Edge support it; where a browser doesn't (Firefox), the button says so instead of failing silently.
  Listening is always press-to-talk — the microphone is never left open, and it is released when you
  leave the page.
- **The assistant only answers about this software.** It is a tool for operating this record system,
  not a general chatbot: ask it something outside the system — general knowledge, news, weather, a
  joke, a poem, coding or medical/legal advice — and it politely declines and offers what it can do
  here instead, without answering the question even partially. That rule is enforced twice: a hard
  SCOPE block in the model's system prompt (`backend/assistant.ts`), plus a small client-side list of
  unmistakably-general phrasings declined instantly with no network call
  (`offTopicReply`, `src/engine/assistantLocal.ts`). Greetings and "what can you do?" are still
  answered warmly — and questions about the plant's own work are, of course, in scope.
- **The assistant lists a document's records for exactly the date span you name** — "I want documents
  of daily pest control monitoring record from 1 to 19 January", "pest control records for this
  week", "fly catcher documents for September". Answered locally (`src/engine/assistantLocal.ts`), so
  it's instant: an explicit day-to-day span (even shorthand like "1 to 19 January", month stated once)
  lists only those days, never a whole month unless that's what was asked (a bare month name, or
  "this/last/next month", does list the whole month); the document or module you name (over 30
  recognised aliases, falling back to the whole module — "pest", "lamination" — when you don't name
  one document) scopes which records show. Only fires when both a document/module and a date are
  named, so plain navigation phrasing ("show me all reports of august") is untouched and still goes
  to the model.
- **The assistant also has a screen of its own** — **Assistant** in the sidebar (`/assistant`,
  `src/pages/AssistantPage.tsx`): a ChatGPT-style page with your conversations on the left, the thread
  in the middle, suggested questions when a chat is empty and a composer at the bottom (typed or
  spoken — see the voice bullet above). Conversations are kept in the browser, so a chat
  survives the assistant taking you to another screen. Calendar and workload questions ("is Thursday a
  holiday?", "next company holiday?", "adjustment days?", "what's due today?", "my briefing") are
  answered instantly on the client from the app's own data (`src/engine/assistantLocal.ts`); everything
  else goes to Groq with a short digest of live facts attached (today's working-day status, the weekly
  off, upcoming holidays, what's due), so the model answers from real data.
- **The company's working calendar is built in** (`src/engine/holidays.ts`, Master Data → Holidays):
  **Thursday is the weekly off**, the 13 festival holidays and the five adjustment (working)
  Thursdays come straight from the Gujarat Print Pack Leave Calendar 2026 in the zip. On a closed day
  the Daily Pest Control Monitoring Record is pre-marked as a holiday, no lamination log sheet is
  expected, no reminder fires, and a fortnightly / monthly / quarterly / yearly record that lands on it
  is due the next working day instead of disappearing. The Record Calendar, Day View and Dashboard
  all say which kind of day it is. Records an earlier build left on a closed day are brought into line
  at start-up (moved to the next working day, re-marked as a holiday, or dropped — only ones nobody
  has worked on), and a seeded holiday or adjustment day you delete in Master Data stays deleted.
- **The Daily Pest Control Monitoring Record is shown in its own F/HR/17 layout** — the company's
  three-page monthly register exactly as the blank format in the zip prints it
  (`src/components/records/DailyRegisterSheet.tsx`): page 1 the header, the two instruction lines and
  the ten check points; page 2 dates 1–19; page 3 dates 20–31 and the Summary of Actions Taken if
  Pest Observed. Each row is that day's record (Yes / No per check point, the trap count in column 4,
  the number of pests trapped in column 7, HOLIDAY written across a closed day, time of checking,
  checker); click a row to open the day. It is the default view of Pest Control > Daily Report, the
  Reports > Daily Monitoring Summary tab, and prints as three pages; the original blank pages can be
  shown alongside for comparison.
- **The service provider's insecticide licence is on file, unchanged** — Gurudev Pesticides'
  Government of Gujarat Form III licence (`/licence`, Pest Control > Training & Reference). The
  supplied PDF is held byte for byte and opens from the page ("Open the original PDF"); the two pages
  shown on screen are that same file page for page, with a verbatim transcription (registration and
  licence numbers, expert staff, the terms and conditions as printed) beneath them for reading and
  search only.

## What's implemented

**Documents (22 configured):**

- Pest Control (9), in the module's four groups — *Daily Report*: Daily Pest Control Monitoring
  Record (F/HR/17). *Service Reports*: Rat / Mice (Rodent Control Service), Ants & Cockroaches
  (General Pest Control Services), Fly Control Services — the three reports in the April-2026
  service-report workbook. *Trend Analysis*: Fortnightly Fly Catcher Inspection & Cleaning Record
  (F/HR/18), which feeds the Fly Catcher Infestation trend (the Rodent Catch trend is computed from
  the daily record). *Training & Reference*: Training Record (**Yearly**, with both the Dec-2025
  technician certificate and the 24-Dec-2025 awareness programme loaded as history), Chemical
  Master, SOP, and Gurudev Pesticides' Government of Gujarat insecticide licence (Form III, kept as
  the scanned pages, unaltered, plus a transcription). (A Lizard Control service-report variant that existed earlier was retired — no
  specimen for it exists in the uploaded files; the SOP's lizard section is still in SOP Reference.)
- CAPA (Corrective & Preventive Action) (2): **Internal** — Pest Control Inspection Findings Report
  (the Dec-2023 GAP report as history); **External** — Customer Complaint Handling Checklist
  (F/MKT/05, Rev 00 / 21.07.2026): 31 activities in five sections A–E plus Prepared-by / Approved-by,
  filled conversationally by the assistant.
- Lamination — Quality Control (3, from the photographed registers in "Audit documents.zip"):
  Lamination Adhesive Viscosity Record (F-QC-30, 24 hourly readings), Adhesive Mixing Ratio Record
  (F-QC-32), Temperature Monitoring Record — Hot Room (F-QC-40.C).
- Lamination — Production (2): Solvent Base Lamination Process Parameter Record, ALC & Production
  Report (F-PRD-18).
- Quality Control — Inspection Records (4): Pouching Process (F/QC/37), Slitting - Lamination Grade
  Film (F/QC/35), Lamination Grade Printed Film (F/QC/34) and the Gujarati In Process Quality Control
  sheet for printing (F/QC/13). Fixed printed test parameters with read-only specifications; the
  assistant carries observations, grades, lot status and the inspector's sign forward; "Approved by /
  QA Manager" is the Verify step, not a box to type in.
- Quality — Compliance (2): Statements of Compliance for Pressure Labels (F/QC-09) and Flexible
  Packaging (F/QC-38), with validity tracking (two years from publication).

All grid-shaped registers share one generic **log-sheet** renderer driven by a layout registry
(`src/data/seed/logSheetLayouts.ts`) — a new register is a layout entry plus a DocumentDefinition
row, no new component.

**Previously delivered (unchanged):**

- **Document → Frequency → Date → Record** core model, driving Dashboard, Document Library,
  Calendar (month view) and Day View.
- **Six digitized document types**, each reproducing its source format's header, fields and
  tables rather than a generic form:
  1. Daily Pest Control Monitoring Record (F/HR/17) — 10 checkpoints, daily.
  2. Fortnightly Fly Catcher Inspection & Cleaning Record (F/HR/18) — PC‑01…PC‑13.
  3. Pest Control Service Report — Rat / Mice (Rodent), Ants & Cockroaches (General Pest) and Fly
     Control variants.
  4. GAP / Corrective Action report (with the real Dec‑2023 findings loaded as history).
  5. Training Record (with the real Dec‑2025 technician certificate loaded as history).
  6. Chemical Master (Pesticide Application Chart) + SOP reference.
- **Frequency engine** (Daily / Weekly / Fortnightly / Monthly / Quarterly / Yearly / As Required)
  that generates due record shells automatically and idempotently.
- **Record lifecycle**: Scheduled → Due → In Progress → Submitted → Pending Verification →
  Verified, with Rejected → Resume → Resubmit, and validation that blocks Verified without the
  required sign-off.
- **Demo Mode**: one-click synthetic month generation, always watermarked
  "DEMO / SYNTHETIC DATA — NOT AUDIT EVIDENCE", fully isolated from Live data (`isDemo` flag).
- **Reports**: Monthly summary, Daily Monitoring register view (with a Rodents column — count, box,
  location per day), **Rodent Catch Report and Trend Analysis** in the company's own Source / Unit
  / Target Pest / Year / Jan–Dec / Total layout (their reported 2024–2026 history alongside the
  digital total, a bar chart, and where-found / which-box breakdowns), Fly Catcher Trend, Chemical
  Usage, CAPA Status, Training Status, **Lamination QC** — all computed from stored data, with CSV
  export and original-style print.
- **Pest patterns**: the Daily Pest Control Monitoring Record's pre-fill (and Demo Mode) follows a
  generated seasonal rodent-catch pattern — mostly quiet days, a few catches a year clustered in the
  monsoon, each with trap box, location and number of rodents — and the Fly Catcher record's counts
  follow a seasonal per-unit fly pattern (busy entrances and dispatch gates in the monsoon, near-empty
  boards in winter). Both are produced by `tools/pest_pattern.py` (Python + numpy; rodents calibrated
  against the company's reported 0 / 2 / 0 rodents for 2024 / 2025 / Jan–Jun 2026, flies against the
  August-2026 F/HR/18 specimen) into `src/data/seed/pestPattern.ts`, and applied deterministically per
  date by `src/engine/rodentPattern.ts` / `flyPattern.ts`. Answering Yes to checkpoint 7 by hand opens
  the same catch-details table.
- **Master Data** screen (Employees, Chemicals, PC IDs, Rodent Stations, Areas, Checkpoints,
  Documents) seeded from source, editable for the fields safe to edit in a prototype.
- **Global search** across records, dates, PC IDs, employees, status.
- Local persistence (see **DEPLOYMENT.md** for why LocalStorage and how to move to a server DB).
- **Accounts**: real signup/login (`backend/`, a small Express + SQLite service) gates the app —
  no more free-text "Acting as" dropdown. Passwords are bcrypt-hashed, sessions are a signed JWT
  in an httpOnly cookie, and every submit/verify/reject action now records the actual logged-in
  user. The first account created on a fresh install becomes `admin`; every later signup is
  `staff`. See DEPLOYMENT.md for how this is deployed alongside the static frontend.

## Quick start

Needs **Node.js 23.6+** (the backend and scripts are TypeScript run directly by Node — no compile
step) and Python 3 with Playwright for the browser tests. The whole repository is TypeScript + Python;
there is no plain JavaScript.

```bash
npm install
npm run dev       # frontend (http://localhost:5173) + auth API (http://localhost:4000) together
```

Open `http://localhost:5173` and sign up — the first account becomes an administrator. For a
single-process production build:

```bash
npm start         # builds frontend/dist/ then serves it + the API from one Express process
```

See DEPLOYMENT.md for LAN pilot instructions and what still lives in the browser (`localStorage`)
vs. the server (accounts).

## Configuration

`backend/.env` — one required key:

```
GROQ_API_KEY=...          # powers the assistant (fill / navigate / reply) — see backend/groq.ts
GROQ_MODEL=...             # optional override; defaults to a model this key actually has access to
                            # (check with GET https://api.groq.com/openai/v1/models if you swap keys —
                            # not every model name commonly seen in Groq docs is enabled per-account)
```

Without `GROQ_API_KEY` set, every screen still works — only the assistant widget's replies fail
(with a clear "isn't configured yet" message), never silently.

## A note on the build toolchain

This prototype was built in a sandboxed environment with **no access to the npm/PyPI package
registries or any CDN** (an infrastructure constraint of the build environment, discovered at
the start of this build — see DEPLOYMENT.md for the full explanation). React, TypeScript and
Playwright were available locally; Vite, Tailwind CLI and react-router-dom were not and could
not be installed. The app is therefore built with **esbuild** (already present on disk) instead
of Vite, and styled with a small hand-written CSS design system instead of Tailwind, with a
minimal hand-rolled router instead of react-router-dom. None of this affects the architecture
the master prompt asked for — component structure, the data layer, and the document-template
approach are unchanged — and every substitution is a mechanical, later swap (documented in
DEPLOYMENT.md) once this project is built somewhere with normal registry access.
