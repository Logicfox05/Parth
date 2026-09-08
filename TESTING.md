# TESTING.md — Test Plan & Results

Per section 42 of the build brief, the application was actually built, run, and tested in a
real Chromium browser (Playwright) against the production build — not just reviewed as source.
Four scripts live in `tests/`:

- `tests/e2e_smoke.py` — the core acceptance walkthrough (calendar → day → record →
  save/submit/verify → dashboard update → persistence → demo isolation → every module page
  loads → sidebar accordion → module-filtered library deep link), network-independent.
- `tests/e2e_backlog_regression.py` — injects a simulated pre-fix record backlog straight into
  `localStorage` before the first post-fix boot and proves the launch-date-floor fix actually holds
  (not silently promoted to "ready", cleanup banner accurate, a human-verified record with the same
  old due date survives untouched). Network-independent.
- `tests/visual_qa.py` — deeper per-module interaction checks (Fly Catcher, Service Report, CAPA
  creation, Training creation) plus full-page screenshots of every major screen for visual
  review, saved to `tests/shots/`, network-independent.
- `tests/e2e_assistant_chat.py` — the assistant "buddy" chat feature (`POST /api/assistant/chat`,
  Groq-backed): free-text navigation ("show me all reports of august" → `#/reports/2026/7`, "open
  CAPA" → `#/gap`), a plain conversational reply that does *not* navigate, and natural-language
  field filling on an already-open record. Makes real calls to Groq, so — like `visual_qa.py` —
  it's not wired into `npm run test:e2e` (network/quota-dependent); run it manually.

## How to re-run

```bash
npm run test:e2e     # builds, boots backend/index.ts on :8842, runs e2e_smoke.py THEN
                      # e2e_backlog_regression.py against it, tears down (see scripts/run-e2e.ts)
```

`visual_qa.py` and `e2e_assistant_chat.py` aren't wired into an npm script (slower / make real Groq
calls), so run them against a server you start yourself:

```bash
npm run build
API_PORT=8842 npm run server &     # Windows PowerShell: $env:API_PORT=8842; npm run server
python tests/e2e_smoke.py          # or python3, depending on platform
python tests/e2e_backlog_regression.py
python tests/visual_qa.py
python tests/e2e_assistant_chat.py # needs backend/.env's GROQ_API_KEY to actually resolve; edit
                                    # the BASE constant at the top if your server isn't on :8844
```

Both scripts now sign up a fresh, randomly-emailed account at the start of the run (the app gates
every page behind login — see `frontend/src/main.tsx`/`AuthProvider`) before exercising the rest of the app.

## Results (last full run — 08-Sep-2026 17:30, on the TypeScript-only backend/scripts, after the working-calendar + Assistant-page batch)

The run below is the production shape end to end: `frontend/scripts/build.ts` builds the bundle,
`backend/index.ts` (run directly by Node 23.6, no compile step) serves it plus the API, and every
suite runs against that. `npm run typecheck` is clean for the frontend and for the backend/scripts
(`tsconfig.node.json`).

### What this batch changed, and how it was checked

- **Briefing / bell speed.** Both used to render every pending record as a row — with a large backlog
  that meant thousands of DOM nodes, seconds to paint, and a top-bar button that looked dead. The
  briefing now lists at most 12 rows per section ("…and N more"; "Submit all" still covers every
  prepared record) and the bell dropdown at most 20 ("…and N more — open today's briefing"). Records
  dated before the browser's launch date are excluded from both and from reminders entirely — they're
  counted once as "leftover records from before this system went live" with a one-click clean-up in
  the briefing (same purge as the Dashboard banner). The clean-up now also catches leftovers an
  older build had already auto-prepared: "In Progress" with a `prepared` stamp and no human save
  since (updatedAt within two minutes of prepared.at), never anything Submitted/Verified/Rejected.
- **Briefing schedule** (`engine/briefingSchedule.ts`): first-ever open → morning slot (first hour of
  the working day) → evening slot (last hour, only if something is still unsubmitted), each at most
  once per day per browser, re-checked every minute so an app left open gets the end-of-day nudge.
  The smoke suite's "briefing on login" checks exercise the first-ever-open path (fresh browser).
- **Sidebar theme**: light panel with a teal brand band and an accent rail on the active item —
  `tests/shots/01_dashboard.png`.
- **TypeScript-only**: `backend/*.mjs` → `*.ts` (typed Express handlers, typed SQLite rows, typed
  throttles), `scripts/*.mjs` and `frontend/scripts/*.mjs` → `*.ts`; `package.json` scripts run them
  with `node --no-warnings=ExperimentalWarning`. No `.mjs` remains.
- **Rodent catch pattern**: the Daily Pest Control Monitoring Record no longer answers checkpoint 7
  ("Any pest trapped in rodent trap box") the same way every day. `tools/pest_pattern.py`
  (Python + numpy) generates a seasonal catch pattern — monsoon-leaning daily probability, weighted
  Rodent Control Service locations, a per-catch count distribution — calibrated against the
  company's own reported history (0 rodents in 2024, 2 in 2025, 0 through Jun-2026, from "Kapila
  mam department reports .pdf"), written to `src/data/seed/pestPattern.ts`.
  `src/engine/rodentPattern.ts` applies it deterministically per calendar date so the assistant's
  pre-fill, Demo Mode, and a manual "Yes" on checkpoint 7 all agree on the same day's story
  (trap box, location, number of rodents — a new `rodentCatches` table on the record, required
  once checkpoint 7 is Yes). Reports > Rodent Trend was rebuilt as **Rodent Catch Report and Trend
  Analysis**, reproducing the company's Source / Unit / Target Pest / Year / Jan–Dec / Total table
  with the reported history alongside the digital total, plus where-found and which-box
  breakdowns; the Daily Monitoring Summary report gained a Rodents column; the Dashboard gained a
  "Rodents Trapped This Month" tile. Checked with four new smoke-suite assertions (#28–31 below)
  against a full demo year, and by dumping the deterministic pattern for 2025–2027 in a scratch
  script to confirm every year lands a handful of catches, none implausibly large, correctly
  seasonal (near-zero Jan–Apr, heaviest Jun–Oct).
- **Pest Control module restructure.** The module is now organised the way the department reads
  its paperwork — Daily Report / Service Reports (Rat / Mice, Ants & Cockroaches, Fly) / Trend
  Analysis (Rodent Catch, Fly Catcher Infestation) / Training & Reference — with an overview
  (`/pest-control`) and one page per group (`src/pages/PestControlPages.tsx`), sidebar sub-headings,
  and the assistant's route guide extended so "show me the rat reports" lands on the right page.
  The Lizard service-report variant (no specimen in the zip) was retired, with boot-time cleanup of
  its definition, reminder role and any stored records — the Document Library count check moved
  from 22 to 21. The Fly Catcher record's counts now follow a seasonal per-unit pattern
  (`tools/pest_pattern.py`, the same tool as the rodent pattern, calibrated to the August-26
  specimen), and Reports > Fly Catcher Infestation was rebuilt in the company's year layout, overall
  and per unit. Checked by eight new smoke assertions (sidebar groups, each new page, the Live
  per-unit register, the Demo-year fly total) and one new visual-QA check with two new screenshots.
  Two test selectors changed from `text=Reports` to `a[href='#/reports']` because the new
  "Service Reports" sub-heading also contains the word — a text selector now matches it first.
- **Working calendar (Thursday weekly off + leave calendar + adjustment days).** `engine/holidays.ts`
  is now the one rule for "is the plant open today?": the Thursday weekly off, the 13 festival
  holidays and the five adjustment (working) Thursdays transcribed from the Gujarat Print Pack Leave
  Calendar 2026 (REQUIREMENTS §16; the 20-11-2026 entry is printed as a Thursday but is a Friday —
  flagged TO BE CONFIRMED). The record generator and Demo Mode build records from
  `effectiveDueDatesInMonth`: Daily Monitoring is pre-marked on closed days, other daily registers
  are skipped, and fortnightly/monthly/… obligations move to the next working day instead of
  vanishing (June 2026's 4th and 18th are Thursdays — the demo Rat / Mice visits now fall on the 5th
  and 19th). The Calendar shows Weekly off / holiday / Working day chips, the Day View a banner, the
  Dashboard the day kind and the next entries on the calendar, and Master Data → Holidays gained the
  weekly-off selector and an Adjustment Days table. Checked by seven new smoke assertions (calendar
  chips for September and October 2026, the Day View banner, the pre-marked HOLIDAY row on the daily
  register, the Master Data editor, the shifted demo visits).
- **The Assistant page** (`/assistant`, ChatGPT-style, text only — no voice control) with
  conversations persisted in the browser, plus a client-side answer layer
  (`engine/assistantLocal.ts`) for calendar / workload / briefing / help questions and a live-facts
  `context` digest sent to Groq with every chat. Checked by six new smoke assertions (page opens from
  the sidebar with suggestions and a composer; no microphone control; "is 2026-09-10 a holiday?" →
  weekly off, "is 2026-10-22 a holiday?" → adjustment (working) day and "when is the next company
  holiday?" answered from the calendar without the network; the conversation survives a reload), one
  new visual-QA check with two screenshots, and one new live-Groq check in `e2e_assistant_chat.py`
  (a weekly-off question with no date reference is left to the model, which answers "Thursday" from
  the attached context; that suite's "plain reply" section now sends "hi there, how is your day
  going?" because "what can you do" is answered locally).
- **Adversarial review of this batch** (three review lenses, each finding re-checked by two
  skeptics; run as a workflow while the suites ran). Everything confirmed was fixed before the final
  run: bare "closed" / "adjustment" in the calendar regex hijacked complaint questions; "what's due
  tomorrow / this week" was answered with today's numbers; the widget answered "mark today as
  holiday" locally instead of filling the open record; "last Thursday" resolved forward; message
  timestamps mixed the UTC date with local hours; the typing bubble wasn't tied to its conversation;
  locally answered messages weren't length-capped; records an *earlier* build had created on a
  Thursday stayed stranded on a closed day (now `engine/calendarMigration.ts`, which also leaves a
  person's own draft alone); the launch-date floor compared the scheduled rather than the due date;
  a deleted seeded adjustment day came back at the next boot (`removedSeedIds`); two texts
  hard-coded "Thursday"; the holiday hint under the Daily Monitoring checkbox had its condition
  inverted; and several new checks were pinned to dates that would expire within days (now derived
  from the calendar at run time, so the suite also passes on a Thursday).
- **Groq rate limit.** The live chat suite's last check failed once with a 429 from Groq (this
  account's tokens-per-minute allowance, five calls in ~20 s each carrying the route guide + context).
  `backend/groq.ts` now retries a 429 once after the delay Groq asks for (bounded), and the suite
  pauses before its final model call.
- **Bug found by running the suite at 17:10 — a double briefing.** A first-ever open inside a slot
  window (09:00–10:00 or 17:00–18:00) showed the "first" briefing and then, the instant it was
  dismissed, the slot's own briefing straight over the page — a modal overlay that swallowed every
  click (the suite timed out on `text=Record Calendar`, with Playwright reporting the widget's
  `<div class="no-print">` intercepting pointer events). `recordBriefingShown("first")` now also
  marks the current slot as shown (`engine/briefingSchedule.ts`), so the assistant interrupts once
  per slot as designed. Every earlier run had happened outside those windows, which is why it had
  never shown up.
- One label in the new checks used a "→" arrow, which the Windows cp1252 console cannot print —
  Python's `print` raised `UnicodeEncodeError` mid-run. Labels are ASCII-only now (em dashes are
  fine in cp1252; arrows are not).

### `e2e_smoke.py` — all 97 check sites passed (the "Section C / D / E is announced next" row runs three times, so 99 checks at run time), 0 unexpected console errors

| # | Check | Result |
|---|---|---|
| 1 | Login screen renders (app gates on auth) | PASS |
| 2 | Assistant briefing popup greets the user on login | PASS |
| 3 | Briefing lists records the assistant filled in | PASS |
| 4 | Dashboard heading renders after signup | PASS |
| 5 | Top bar shows the signed-up user | PASS |
| 6 | Dashboard shows the assistant's briefing card | PASS |
| 7 | No unexpected console errors on initial load | PASS |
| 8 | Calendar grid renders | PASS |
| 9 | Today cell present | PASS |
| 10 | No pre-launch backlog banner after browsing old calendar months | PASS |
| 11 | Day view opens | PASS |
| 12 | Opened a Daily Pest Monitoring record from Day View | PASS |
| 13 | Record page shows checkpoint table | PASS |
| 14 | Daily record was pre-filled by the assistant | PASS |
| 15 | Record submitted (status Pending Verification) | PASS |
| 16 | Record verified | PASS |
| 17 | Opened the F-QC-30 viscosity log sheet from Day View | PASS |
| 18 | Log sheet shows the F-QC-30 header | PASS |
| 19 | Log sheet was pre-filled with 24 hourly rows | PASS |
| 20 | Prepared banner explains what was filled | PASS |
| 21 | Log sheet submitted (status Pending Verification) | PASS |
| 22 | Status persists after reload | PASS |
| 23 | Dashboard shows stat tiles | PASS |
| 24 | Demo data was generated on entering Demo Mode (not pre-empted by Live shells) | PASS |
| 25 | Explicit demo generation is idempotent and reports a count | PASS |
| 26 | Demo mode banner visible | PASS |
| 27 | Demo calendar shows completed (filled) records, not blank shells | PASS |
| 28 | Rodent report uses the company's layout (Source / Unit / Target Pest / Year / Total) | PASS |
| 29 | Rodent report shows the reported 2025 history (2 rodents, May & June) | PASS |
| 30 | Digital rodent total over the demo year is non-zero (pattern applied) | PASS |
| 31 | Rodent report breaks catches down by location | PASS |
| 32 | Fly Catcher Infestation trend has a non-zero yearly total in Demo Mode (seasonal fly pattern applied) | PASS |
| 33 | Fly Catcher Infestation trend lists all 13 units in the company's year layout | PASS |
| 34 | Demo service visits never sit on the Thursday weekly off — a visit scheduled on a Thursday is dated the next working day | PASS |
| 35 | Live mode banner visible after switch | PASS |
| 36 | CAPA home offers exactly the two options, Internal and External | PASS |
| 37 | CAPA Internal list shows seeded Dec-2023 inspection | PASS |
| 38 | CAPA External list shows the F/MKT/05 checklist | PASS |
| 39 | New complaint auto-starts the assistant walk-through | PASS |
| 40 | Assistant asks for the customer first | PASS |
| 41 | Header details captured on the form | PASS |
| 42 | Assistant announces Section A | PASS |
| 43 | Section B is announced after A's five activities | PASS |
| 44 | Section C / D / E is announced next | PASS |
| 45 | After E the assistant asks for approval | PASS |
| 46 | Form shows all 31 activities done | PASS |
| 47 | Assistant confirms submission | PASS |
| 48 | Checklist status is Pending Verification (awaiting approval) | PASS |
| 49 | Prepared By was stamped with the logged-in user | PASS |
| 50 | Assistant offers to approve | PASS |
| 51 | Assistant confirms approval | PASS |
| 52 | Checklist status is Verified (approved) | PASS |
| 53 | Training list shows seeded record | PASS |
| 54 | Training list shows the Dec-2025 awareness programme | PASS |
| 55 | SOC list shows both statements | PASS |
| 56 | SOC detail renders the declaration | PASS |
| 57 | Chemical master shows pesticide chart | PASS |
| 58 | SOP reference shows Lizard quarterly frequency | PASS |
| 59 | Reports page renders tabs | PASS |
| 60 | Lamination QC report renders | PASS |
| 61 | Document Library lists all 21 documents | PASS |
| 62 | Document Library shows the lamination module | PASS |
| 63 | Document Library shows the QC inspection module | PASS |
| 64 | Document Library groups both CAPA documents under the CAPA module | PASS |
| 65 | Sidebar has a collapsible Pest Control module header | PASS |
| 66 | Sidebar has a CAPA module with Internal and External links | PASS |
| 67 | Pest Control module starts expanded (Training link visible) | PASS |
| 68 | Collapsing the module header hides its links | PASS |
| 69 | A collapsed module stays collapsed after navigating elsewhere | PASS |
| 70 | Expanding it again restores the links | PASS |
| 71 | Module link deep-links Document Library filtered to that module | PASS |
| 72 | Filtered library shows only that module's documents | PASS |
| 73 | Pest Control module lists its report groups in the sidebar | PASS |
| 74 | Rat / Mice service reports open on their own page | PASS |
| 75 | Service report list shows this month's fortnightly visit(s) | PASS |
| 76 | Daily Report page shows the month register with today's row | PASS |
| 77 | Fly Catcher Infestation page renders the per-unit register (Live) | PASS |
| 78 | Pest Control overview shows the four groups | PASS |
| 79 | Opened the F/QC/37 pouching inspection from Day View | PASS |
| 80 | Inspection shows the 11 printed test parameters | PASS |
| 81 | Inspection observations were pre-filled from the specimen | PASS |
| 82 | Lot status pre-set to Accepted and inspector signed | PASS |
| 83 | Inspection record submitted | PASS |
| 84 | Search returns results for PC-01 | PASS |
| 85 | Search finds the lamination operator on the prepared log sheets | PASS |
| 86 | Calendar marks every Thursday of September 2026 as the weekly off | PASS |
| 87 | Calendar shows Janmashtami (04-Sep-2026) from the leave calendar | PASS |
| 88 | Adjustment day 22-Oct-2026 is a working Thursday (October: 4 weekly offs + 1 working day) | PASS |
| 89 | Day View explains a Thursday as the weekly off | PASS |
| 90 | Daily Report register pre-marks the next weekly-off Thursday as a HOLIDAY row | PASS |
| 91 | Master Data shows the weekly off (Thursday) and the leave calendar's five adjustment days | PASS |
| 92 | Assistant page opens from the sidebar with suggestions and a composer | PASS |
| 93 | Assistant page has no voice / microphone control | PASS |
| 94 | Assistant answers a weekly-off date from the working calendar (no network needed) | PASS |
| 95 | Assistant explains an adjustment day as a working Thursday | PASS |
| 96 | Assistant lists what's next on the leave calendar (or says the year's list is done) and names the weekly off | PASS |
| 97 | Assistant conversation persists across a reload | PASS |

(One benign console entry — the pre-login `GET /api/auth/me` 401, expected on every fresh
session — is filtered out of the "unexpected console errors" check rather than counted as a
failure; it's logged by Chromium for any non-2xx fetch response and is not something the app
treats as an error.)

Two checks changed meaning in this run. The old "GAP / Corrective Action" sidebar label no longer
exists (the module was renamed CAPA earlier without the suite being re-run), and the old "Demo
generation created new records" check assumed the Dashboard did *not* pre-generate demo data —
it now deliberately fills the year so far on entering Demo Mode, so the check was rewritten to
assert what the original bug was actually about: demo data exists and is real data, not blank
shells.

### `visual_qa.py` — 13/13 interaction checks passed (13 `check()` calls at run time), 0 JS errors

| # | Check | Result |
|---|---|---|
| 1 | Assistant briefing shown on login (captured as `00_briefing.png`) | PASS |
| 2 | Signed up and reached the dashboard | PASS |
| 3 | Opened a Fly Catcher record via Search, filled all 13 PCs, submitted | PASS |
| 4 | Opened a Service Report record via Search, filled technician sign, submitted | PASS |
| 5 | Process Parameter / ALC & Production / Adhesive Mixing log sheets open with the prepared banner | PASS |
| 6 | Created a new CAPA record, added a finding | PASS |
| 7 | Created a new Training record, added an attendee | PASS |
| 8 | Pest Control overview renders its four groups — Daily Report / Service Reports / Trend Analysis / Training & Reference (captured as `15_pest_control_overview.png`; the Fly Catcher Infestation page as `16_pest_fly_catcher_infestation.png`) | PASS |
| 9 | Assistant page renders its suggestions and composer (captured as `17_assistant_page.png`; the October-2026 Record Calendar with its Weekly off / Working day chips as `18_calendar_october_holidays.png`) | PASS |
| 10 | SOC detail page renders | PASS |
| 11 | Print media emulation renders a clean original-style layout (no sidebar/topbar/buttons) | PASS |
| 12 | 22 full-page screenshots captured for visual review (`tests/shots/`) | PASS |
| 13 | No JS errors across the whole pass | PASS |

### `e2e_assistant_chat.py` — 9/9 checks passed, 0 JS errors (real Groq calls)

| # | Check | Result |
|---|---|---|
| 1 | Navigated to Reports for August via free text ("show me all reports of august" → `#/reports/2026/7`, correctly 0-indexed) | PASS |
| 2 | Assistant showed a confirmation reply alongside the navigation | PASS |
| 3 | Navigated to CAPA via free text ("open CAPA" → `#/gap`) | PASS |
| 4 | A conversational message ("hi there, how is your day going?") did not navigate anywhere | PASS |
| 5 | Assistant gave a reply message for it | PASS |
| 6 | Opened a Daily Pest Monitoring record for the fill test | PASS |
| 7 | Fill instruction ("checker is Buddy QA Tester") applied a field | PASS |
| 8 | Checker field actually updated in the form | PASS |
| 9 | Assistant page: "which day of the week is our weekly off?" (no date reference, so not answered locally) — the model replied "Thursday" from the live-facts `context` attached to the call | PASS |

Also verified directly against the Groq API (`GET /openai/v1/models`) that this account's key has no
access to the commonly-documented `llama-3.3-70b-versatile` default (404s) — the model this app
actually uses, `openai/gpt-oss-120b`, was found by listing what the key *does* have access to, and
correctly handled relative-date reasoning ("the 15th of last month" against a today of 2026-09-08 →
`/day/2026-08-15`) and module-slug navigation ("lamination quality control documents" →
`/library/lamination-quality-control`) in ad-hoc testing beyond the scripted checks above.

### Bug fix: unbounded record-backlog generation ("3484 records ready")

A real user reported the login briefing showing thousands of prepared records instead of the
handful actually due. Root cause: `engine/recordGenerator.ts`'s `ensureRecordsGeneratedForMonth` —
called by Calendar, Reports, Day View, Dashboard and the reminder engine for whatever month is being
*viewed* — had no lower bound, so browsing the Calendar back through old months (including months
before the system existed) silently created a "Due" shell for every recurring document on every day
of that month; the assistant then dutifully auto-filled and surfaced all of it as "ready for your
OK". Fixed with a per-browser `liveStartDate` floor (`settingsRepository.ts`, set once on first
boot, never generating a Live record before it) plus a narrowly-scoped, human-in-the-loop cleanup
for backlog a pre-fix session already created (`engine/backlogCleanup.ts` — only ever removes
records that are still blank/untouched, dueDate before the floor, isDemo:false, never a seeded
historical specimen; a Dashboard banner surfaces the count and a "Clean up N" button, dismissible
without deleting anything). Verified via `e2e_smoke.py` check #47 (browsing 2019/2020 calendar
months, then confirming the Dashboard shows no cleanup banner) and manually via the
`purgePreLaunchNoise()`/`findPreLaunchNoise()` pair.

A related visual bug from the same root cause — the Dashboard's "Records Due Today" table
truncating document names with a page-level horizontal scrollbar instead of wrapping/scrolling
internally — was a separate CSS issue (`.doc-table` used `overflow: hidden`, clipping instead of
scrolling; the two side-by-side flex cards lacked `min-width: 0`, so a wide table forced the whole
row wider than the viewport) fixed alongside it and confirmed visually in `tests/shots/01_dashboard.png`.

**A second, more serious bug in the fix itself** was caught by an adversarial review before this
shipped: `prepareDueRecords()` (which auto-fills due records — see the assistant section above) had
no floor of its own, only `ensureRecordsGeneratedForMonth` did. On the very next app load after the
fix, it would have silently promoted the *entire* pre-existing backlog to "In Progress" + prepared —
before the Dashboard's cleanup banner was ever seen — because its query only checked `dueDate <=
today`, never `dueDate >= liveStartDate`. Compounding that, `findPreLaunchNoise()`'s "In Progress +
prepared, untouched" check (`prepared.at === updatedAt`) could never actually hold, since
`prepared.at` was stamped once for a whole batch while `upsertMany()` independently re-stamped a
fresh `updatedAt` per record — two unrelated `new Date().toISOString()` calls that are essentially
never bit-for-bit equal. Both under-inclusive (never deleted anything real), but together they would
have made the cleanup banner report near-zero while thousands of ghost "In Progress" records kept
populating Reports/Calendar/reminders/the login briefing, unreachable by cleanup. Fixed by (1)
flooring `prepareDueRecords()` the same way as the generator, so pre-launch backlog stays plain
"Due" and is never auto-filled/surfaced as "ready", and (2) `upsertMany()` no longer re-stamps
`updatedAt` (every current caller already sets it explicitly), with `assistantPrepare.ts` now
setting `updatedAt` to the exact same value as `prepared.at`. Directly proven end-to-end by
`tests/e2e_backlog_regression.py`, which injects a simulated 50-record pre-fix backlog plus one
human-verified record sharing its oldest due date straight into `localStorage` before the first
post-fix boot, then asserts the backlog stays "Due" (not silently promoted), the briefing doesn't
claim it's "ready", the cleanup banner reports it accurately, and the verified record survives
cleanup untouched.

**Other review findings acted on:** `isValidAppRoute` (`src/store/router.tsx`) rejected valid
`/gap/<id>` and `/training/<id>` deep links despite the router fully supporting them — fixed. The
sidebar's auto-expand-active-module effect would silently re-open a module the instant you
navigated to any other page inside it, undoing an explicit collapse — simplified to a
persisted-choice-always-wins model (no more path-based override) so closing a module actually
sticks. A stale/unknown `/library/{slug}` deep link showed the *entire* unfiltered library under a
misleading "Filtered to: {slug}" badge instead of an empty result — fixed to show nothing. Reports
and Calendar could paint one stale frame (Reports) or stay stuck entirely (Calendar — it had no
props-resync logic at all) when the assistant navigated to a new month while already mounted on that
page — fixed by keying both on their route params in `App.tsx` so a genuine route change forces a
clean remount. On the security side: the assistant endpoint's raw error text (which could include
a vendor error body from Groq) is no longer forwarded to the client, `currentData` now has an
explicit size cap, and — since signup was completely unthrottled while the assistant's 20-calls/
10-min cap is per-account — added a per-IP signup throttle so that cap can't be trivially bypassed
by scripting fresh accounts.

### CAPA Internal / External + the guided complaint checklist — what the suites prove

- `e2e_smoke.py` drives the whole External flow through the chat widget, with NO network: New
  Complaint auto-opens the assistant → it asks for the customer and complaint number (typed) → job
  name / job code / PO skipped by chip → received date "Today" by chip → Section A "Let's go" then
  five "Done today" taps → Sections B–E via "All N done today" → "Shall I submit it for approval now?"
  → "Submit for approval" → status Pending Verification with Prepared By stamped as the logged-in
  user → "Review & approve" → "Approve" → status Verified. It also asserts the form shows 31 / 31
  (the printed Sr. No. runs 1–32 but skips 6), that `/gap` offers exactly Internal and External,
  that the sidebar's CAPA module has both links, and that a collapsed sidebar module now stays
  collapsed after navigating elsewhere.
- `e2e_assistant_chat.py` re-verifies the redesigned chat widget against live Groq (navigate, reply,
  fill), using `.chat-msg.bot` bubbles and the icon-only `button[aria-label='Send']`.
- `visual_qa.py` captures `06_capa_home.png` (the two-door chooser) and
  `07b_complaint_walkthrough.png` (a new complaint with the assistant's first question already asked).
- Found and fixed while writing these: the widget rendered its quick chips from a stale target ref,
  so "Review & approve" never appeared after Submit (fixed with a reactive `targetSignature` on the
  assistant context); and the redesigned panel was a fixed 640px tall, covering the Day View's "Open"
  buttons bottom-right (now sized to content, capped, scrolling inside).

### QC inspection records (F/QC/13, /34, /35, /37) — checked by hand against the screenshots

- Fixed parameter rows render with the printed specification as read-only text; only the
  observation / grade / pass / defect-count cells are inputs. No add/remove row buttons.
- Lot status defaults to Accepted; the reason field is validated only when the lot is not Accepted;
  "Approved by (QA Manager)" is not an input — the record's Verify step stamps the verifier.
- F/QC/13 renders the Gujarati procedure, grading rules and the collapsible A/B/C/F grade chart;
  grades pre-filled from the 6-9-26 specimen (B/A/A/–/A/B, defect counts +2/–/–/–/–/+2).
- CAPA: the Source dropdown (not on the paper form) was removed from the grid; findings on a
  submitted report can now be closed individually or with "Close all open findings" without
  rejecting the report first.

### Assistant / auto-fill checks done by hand against the screenshots

- Login briefing: greeting uses the logged-in name and time of day; each prepared record shows
  its Format No., due date and the two "what I filled" notes; "Submit all N" submitted every
  passing record and the popup re-rendered as "Waiting for a verifier" (see
  `13_briefing_after_submit_all` in the scratch run) — nothing was submitted that failed validation.
- F-QC-30: 24 fixed hourly rows, readings all within 19.0–21.0, day tester "Jeni" 09:00–17:00 and
  08:00, night tester "Singh" 18:00–07:00 — matches the specimen's split exactly.
- F-QC-32: three batch rows, quantities exactly 15 / 1.65 / 19.5 kg (weighed set quantities),
  only the viscosity varies; checked-by follows the shift of the batch time.
- Process Parameter Record: machine set-points copied verbatim from the specimen (3.00 / 2.00 /
  45 / 3.00 / 42 / 52 / 81–65 / 52 / 40 / 15% / 6.00), header (operator, machine, ratio, adhesive
  / hardener make-code-batch) carried forward. An earlier draft randomised these and was corrected —
  set-points are settings, not readings.
- Temperature: six readings 44–47 °C inside the 43–47 band, Sign resolved to the QC Tester.
- Values are deterministic per (document, date): reloading a prepared record shows the same
  numbers (seeded PRNG in `src/utils/random.ts`).
- localStorage after one full month of Live + demo data: ~206 KB — well inside the browser limit.

## Manual coverage mapped to the section‑42 checklist

- **Calendar: Month → Day → Record.** Verified — clicking any date navigates to Day View;
  clicking a record opens the correct typed renderer for its document kind.
- **Daily Monitoring: Open → fill → save → submit → verify.** Verified end-to-end in
  `e2e_smoke.py`; validation was also confirmed to *block* submit when checkpoints are left
  blank (see "Validation" below).
- **Fly Catcher: PC selection → data → save → report.** Verified — PC locations are read-only
  master data auto-populated per row; Fly Catcher Trend report reflects entered catch counts.
- **Rodent: Station → inspection → save → report.** No dedicated Rodent Inspection form exists
  in the source material (see REQUIREMENTS.md §6/§8) — rodent-relevant data is captured via
  Daily Monitoring checkpoints 4-9 and the Rodent Control Service Report, both of which were
  tested; Rodent Trend report was confirmed to compute from checkpoint 7 data.
- **Service Report: Service → area → chemical → quantity → save.** Verified — the Chemical
  Master suggestion banner appears for the matching service type; area lines are editable and
  addable.
- **GAP: Finding → action → target date → close → verify.** Verified — adding a finding, setting
  a target date, and clicking "Close" (which stamps `actualDateOfAction`) all work; verifying the
  whole inspection is correctly blocked while any finding remains Open/Overdue (see Validation).
- **Training: Training → employees → attendance → save.** Verified — attendees can be added with
  a name/department/attended checkbox; submit requires at least one attendee marked attended.
- **Demo Mode: Generate month → open records → edit → dashboard update.** Verified — generating a
  demo month populates the calendar with a DEMO watermark everywhere, editing a demo record works
  identically to a live one, and Dashboard/Reports figures update immediately (shared `version`
  bump mechanism, see DATA_MODEL.md).
- **Persistence: Refresh browser → data remains.** Verified — `localStorage` under the
  `dcrs:v1:` namespace; confirmed via full page reload mid-test.
- **Validation: Invalid/missing data → proper error.** Verified for three cases:
  1. Submitting a Daily Monitoring record with unanswered checkpoints shows a red error banner
     listing exactly which checkpoints are missing, and does *not* change status.
  2. Verifying a Service Report without a customer signature is blocked with an explicit error.
  3. Verifying a GAP inspection with any Open/Overdue finding is blocked with an explicit error
     naming how many findings are unresolved.
- **Printing: Record → Print → readable document.** Verified via `page.emulate_media("print")` —
  sidebar, topbar, mode banner and action buttons are hidden; form fields render as plain text
  (borders/pickers suppressed in print CSS) so the printout reads like a filled paper record, not
  a screenshot of a web form.

## Content/data-fidelity pass (second source review)

Re-checked `Kapila mam department reports .pdf` directly against the digitized Daily Pest
Monitoring form and Service Report, prompted by the company confirming the actual response
vocabulary and Service Report field behavior. Two content fixes and one functional bug came out
of it:

- **Daily Monitoring response vocabulary**: changed from a mixed OK/Not-OK + Yes/No control to
  Yes/No throughout (matching the filled specimen exactly), with per-checkpoint "which answer is a
  finding" polarity now explicit (`DailyCheckpointDef.flagWhen`, `engine/checkpoints.ts`) instead
  of a hardcoded `"NOT OK" || "Yes"` check — verified interactively that checkpoint 1 (finding on
  "No") and checkpoint 2 (finding on "Yes") each flag correctly, and that the demo generator's
  ~8-92% split lands on the *correct* side for every checkpoint (previously it would have made
  "pest proofing not working" the *common* case after a naive vocabulary swap — checked by
  inspecting generated `localStorage` data directly, not just the UI).
- **Service Report Material Name / Method of Application**: now fixed, read-only values pre-filled
  per area (`engine/serviceMaterials.ts`) instead of free-text inputs — Quantity Used and Remarks
  remain manually entered. Verified visually: all 16 Rodent Control areas show "Glue Board /
  Trouble gum placement" except "First floor - Offline punching & QC Inspection", which correctly
  shows the documented exception "Bromadiolone Cake / Baiting".
- **Bug found and fixed**: Demo Mode's "Generate Demo Records" could silently create nothing (or
  silently create blank, data-less records) depending on which page you'd viewed first — see
  DATA_MODEL.md's Demo/Live integrity section for the root cause and fix. Caught by generating demo
  data for the *current* month (the first thing anyone would try) and finding the reported "38
  created" didn't match reality; `tests/e2e_smoke.py` now has a check that specifically reproduces
  the page-visit ordering that triggered it.

## Authentication testing

Both scripts above now start every run at the login screen and go through real signup before
touching the rest of the app, which exercises:
- The auth gate itself (unauthenticated → login screen, not the app).
- Signup → session cookie → dashboard, with the real account name shown in the top bar.
- Every lifecycle action recording the signed-up identity (`submittedBy`/`verifiedBy`), asserted
  directly in the manual pass (see RecordPage's audit-trail line: "Submitted … by <name>").

Manually verified in addition (not yet scripted): wrong-password rejection (`Invalid email or
password.` shown, no session issued), duplicate-email signup rejection (`An account with that
email already exists.`), first-account-becomes-admin / later accounts become `staff`, session
persists across a full page reload and across an app restart (same `backend/data/app.db` +
`jwt-secret.txt`), and logout returning to the login screen.

## Known Phase‑1 limitations (by design, not oversight)

- Accounts are real (signup/login/logout, hashed passwords, signed sessions — see DEPLOYMENT.md's
  Accounts / Authentication section) but there is no LDAP/SSO and no role-based access control yet
  — `role` is issued and displayed, nothing is gated by it (flagged in FUTURE_ROADMAP.md).
- No multi-user concurrency for *operational data* — `localStorage` is per-browser; two people
  editing the same record on two different devices will not see each other's changes (last write
  wins within one device). This is intentional for the current single-shared-device deployment
  model (see DEPLOYMENT.md); the storage abstraction is what needs to change next for true
  multi-device sync, and accounts already exist for it.
- TypeScript type-checking (`npm run typecheck`) now passes cleanly — `@types/react` /
  `@types/react-dom` are installed (this project no longer builds in the original network-locked
  sandbox described in DEPLOYMENT.md's toolchain note) and `tsconfig.json`'s `lib`/`target` were
  bumped to ES2022 to match the `Array.prototype.at()` calls already in the codebase.
