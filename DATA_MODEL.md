# DATA_MODEL.md — Architecture & Data Model

## Layered architecture

```
components/ pages/          UI — reads repositories directly (cheap, localStorage-scale),
                              writes go through engine/ functions, never touch storage directly.
        │
engine/                     Frequency engine, recurring-record generator, validation,
                              lifecycle transitions. Pure functions over the types below.
        │
data/repositories/          One repository per collection: documentRepository, masterRepository,
                              recordRepository, settingsRepository. This is the ONLY layer that
                              knows the storage key names.
        │
data/storageAdapter.ts      IStorageAdapter interface + LocalStorageAdapter (+ MemoryStorageAdapter
                              fallback). readJSON/writeJSON helpers.
        │
        ▼
   localStorage (namespaced "dcrs:v1:*")
```

**Why this shape, and how to swap storage later** (section 39's explicit requirement): every
repository method is storage-agnostic — `documentRepository.getAll()`, `recordRepository.query(filter)`,
etc. To move to a real database, replace `LocalStorageAdapter` with e.g. a `RestApiAdapter` or a
`SqliteAdapter` implementing the same 4-method `IStorageAdapter` interface (`getItem/setItem/
removeItem/keys`), or — for a proper multi-user backend — replace the repository internals with
`fetch()` calls against a REST/GraphQL API using the exact same method signatures. **Nothing above
the repository layer needs to change.** No component, page or engine function imports
`storageAdapter.ts` directly.

## Document-template architecture (section 40)

Rather than one JSON-schema-driven universal renderer (over-engineering for 6 concrete formats
in a 1-week prototype) or six fully independent hardcoded pages (which would not scale to 141
formats), this prototype uses a **middle-ground, metadata-driven registry**:

- `DocumentDefinition` (`src/types/document.ts`) is master/config data — Format No., Revision,
  Frequency, `ScheduleConfig` — one row per controlled format. Adding the next of the ~141
  formats starts here.
- `DocumentKind` (`src/types/common.ts`) maps a definition to **one renderer component** — new
  structures (e.g. a Quality lab test report) get a new `kind` + one new `*RecordView.tsx`
  component + one new payload type in `src/types/record.ts`; structures that are shape-compatible
  with an existing kind (e.g. a 4th or 5th Service Report variant) need **zero new code** — just
  another `DocumentDefinition` row with a different `variantKey`.
- Every renderer shares the same building blocks: `DocumentHeader` (company/title/Format/Rev/Date
  block), `StatusBadge`, `DemoTag`, `RecordActionBar` (Save/Submit/Verify/Reject/Print), and the
  `.doc-table` / `.doc-header` CSS primitives — so a new document type is visually consistent
  "for free."
- The **frequency engine** (`engine/frequencyEngine.ts`), **record generator**
  (`engine/recordGenerator.ts`), **validation** (`engine/validation.ts`) and **lifecycle**
  (`engine/recordLifecycle.ts`) are all generic over `DocumentDefinition` + `RecordInstance` —
  they do not special-case individual documents except where a document's *validation rules*
  genuinely differ (e.g. Service Report requires a customer signature to verify; GAP requires
  every finding closed).

See FUTURE_ROADMAP.md for how this scales concretely to Phase 2/3 (~95 more formats).

### The generic `log-sheet` kind (second batch of documents)

The five lamination registers from "Audit documents.zip" are all "header fields + a grid" forms, so
instead of five renderers there is one: `DocumentKind "log-sheet"` renders through
`LogSheetRecordView.tsx` using a **`LogSheetLayout`** looked up by `DocumentDefinition.id` in
`src/data/seed/logSheetLayouts.ts`. A layout declares the header fields, the columns (type, unit,
acceptance band `min/max/nominal`, required, fixed), how rows are created (`free` / `timeSlots` /
`single`), the specimen rows from the source photo, and per-column **auto-fill behaviour** (sign,
carry-forward, jitter, default). Payload is `LogSheetData { header, rows[] }`. Validation
(`validation.ts`) and the assistant (`autoFill.ts`, and the field guide in `backend/assistant.ts`,
run through Groq) are generic over the layout, so a sixth register is one layout entry +
one DocumentDefinition row. `compliance-statement` is a second new kind: reference-only, content in
`complianceStatements.ts`, with a validity date the briefing tracks.

## The assistant: auto-fill + briefing

```
bootstrap() / Dashboard mount / login popup
        │
        ▼
engine/assistantPrepare.ts  prepareDueRecords()
        │  for every Live record due ≤ today still in Scheduled/Due (never In Progress —
        │  that's a person's partial work) and not yet `prepared`:
        ▼
engine/autoFill.ts          autoFillRecord(doc, dueDate, master, previousConfirmedRecord)
        │  carry forward → else specimen; readings inside band via a seeded PRNG keyed on
        │  (documentId, dueDate) so values are stable across reloads/devices; returns
        │  { data, notes[], basedOn }
        ▼
RecordInstance.prepared = { at, by: "assistant", notes, basedOn }, status "In Progress"
        │
        ▼
engine/assistantBriefing.ts computeBriefing(): ready (passes validateForSubmit) / needsInput /
                            overdue (unpreparable kinds, e.g. CAPA) / awaitingVerification /
                            upcoming / compliance renewals; submitPreparedRecords() re-validates
                            each record before submitting.
        ▼
AssistantBriefingPopup (once per session, reopenable via a window event from the top bar,
dashboard card and assistant widget) · PreparedBanner on each record · "Prepared" chips.
```

`prepared` is kept after submission so the audit trail reads "prepared by assistant, submitted by
<user>". Demo Mode reuses `autoFillRecord` for log sheets and training, so demo data looks the same
as prepared Live data (still `isDemo: true`).

## Seed synchronisation (existing installs pick up new documents)

Each repository's `ensureSeeded()` now merges rather than only seeding an empty store:
`documentRepository` re-syncs the seed list by id on every boot (definitions are configuration,
nothing in the UI edits them); `masterRepository` adds missing employees / holidays / chemicals /
areas / role keywords by id without touching admin edits; `recordRepository` adds missing historical
records by id. `recordRepository` also keeps an in-memory copy of the parsed records array
(refreshed on every write) — with 24-row hourly log sheets the JSON is large enough that re-parsing
localStorage on every read visibly froze the Demo generator.

## Core types (`src/types/`)

```ts
DocumentDefinition {
  id, kind, name, formatNo, revisionNo, revisionDate, department, module, frequency,
  status, description, sourceFile, schedule: ScheduleConfig, variantKey?, isReferenceOnly?
}

RecordInstance<TData> {
  id, documentId, periodKey, dueDate, status: RecordStatus, isDemo,
  data: TData, createdAt, updatedAt,
  submittedBy?, submittedAt?, verifiedBy?, verifiedAt?, rejectedBy?, rejectedAt?, rejectionReason?,
  prepared?: { at, by: "assistant", notes: string[], basedOn: string }
}
```

Per-document `TData` payloads: `DailyPestMonitoringData`, `FlyCatcherData`, `ServiceReportData`,
`GapInspectionData`, `TrainingRecordData`, `LogSheetData` (all in `src/types/record.ts`); layout
types for log sheets in `src/types/logSheet.ts`.

`DailyPestMonitoringData.rodentCatches?: RodentCatch[]` (`{ id, trapBoxNo, location, count }`) holds
the catch details behind checkpoint 7 — one row per trap box that caught something. It is optional
only so records saved before the field existed still load; validation requires at least one row
(with a location and a count ≥ 1) whenever checkpoint 7 is "Yes". `data/selectors.ts`
(`rodentStatsForYear`, `rodentsInMonth`) adds these up for Reports > Rodent Catch Report and the
Dashboard tile. The values the assistant / Demo Mode put there come from `engine/rodentPattern.ts`
(`rodentEventFor(dateISO)`, seeded per calendar date) using the parameters in
`data/seed/rodentPattern.ts`, which is **generated** by `tools/rodent_pattern.py` — edit the Python
and re-run it rather than the `.ts`.

## Record lifecycle (state diagram)

```
 Scheduled ──▶ Due ──▶ In Progress ──[Submit, validated]──▶ Pending Verification
                                                                  │        │
                                                       [Verify, validated] │ [Reject + reason]
                                                                  ▼        ▼
                                                              Verified   Rejected
                                                                             │
                                                                  [Resume Editing]
                                                                             ▼
                                                                       In Progress
```

- The recurring-record generator (`ensureRecordsGeneratedForMonth`) creates every new instance
  directly in status **Due** (section 28 requirement) — never pre-completed.
- `saveDraft()` moves Due/Scheduled → In Progress on first edit; further saves keep the record in
  In Progress.
- `submitRecord()` runs `validateForSubmit()` (per-document-kind field completeness rules) and,
  only if valid, moves the record straight to **Pending Verification** and stamps
  `submittedBy`/`submittedAt`. ("Submitted" is a state the type system supports — used in Demo
  Mode's synthetic status distribution — but Live Mode's one Submit action folds it into Pending
  Verification immediately, matching the simple 2-click workflow the master prompt asks for in
  section 36.)
- `verifyRecord()` runs `validateForVerify()` (e.g. Service Report needs `customerSign`; GAP
  needs every finding Closed/Verified) and only then moves to **Verified**. *A record can never
  reach Verified without passing this check* — the explicit requirement in section 16.
- `rejectRecord()` / `resumeAfterRejection()` implement the Rejected → Correct → Resubmit loop.

## Demo vs. Live data integrity (section 38)

Every `RecordInstance` carries `isDemo: boolean`. `recordRepository.query()` and every page take an
`isDemo` filter derived from the app-wide Live/Demo toggle (`useAppStore().mode`), so:

- Demo-mode records are **never** returned by a Live-mode query and vice versa.
- The UI wraps any demo content in a `.demo-watermark` div, whose CSS `::before` injects the
  literal banner *"DEMO / SYNTHETIC DATA — NOT AUDIT EVIDENCE"* — this cannot be suppressed by a
  component forgetting a prop, because it is a CSS pseudo-element on the wrapper class, not a
  conditionally-rendered React node.
- `clearAllDemoData()` deletes only `isDemo: true` rows — Live data is structurally unreachable
  from that call (it filters, never touches the rest of the array before writing back).
- **Fixed bug** (historical — the per-period existence check has since become
  `recordRepository.periodKeys(isDemo)`, one Set per generation call instead of a scan per date):
  the check used to look at only `documentId`+`periodKey`, not `isDemo` — so a Live record occupying a period (e.g. every date in
  the current month, auto-generated by `bootstrap()`) silently blocked a Demo record from *ever*
  being generated for that same period, and separately, Dashboard/Calendar/DayView/Reports each
  called the generic `ensureRecordsGeneratedForMonth(..., { isDemo })` on mount using whatever mode
  you were viewing in — meaning simply *browsing* those pages in Demo mode pre-filled every date
  with blank shell records ahead of time, which then made Demo Mode's own "Generate Demo Records"
  button (`generateDemoRecordsForMonth`) report success while creating nothing, because the slots
  were already "taken" by data-less stubs. Fixed by (1) adding `isDemo` to the period-uniqueness
  check, and (2) making those four pages always pass `isDemo: false` to the generic
  generator — Demo data is now only ever created by the explicit button, never as a side effect of
  navigation. See `tests/e2e_smoke.py`'s "Demo generation actually created new records" check,
  which specifically reproduces the page-visit ordering that used to trigger this.

## Storage keys (namespace `dcrs:v1:`)

| Key | Shape | Repository |
|---|---|---|
| `documents` | `DocumentDefinition[]` | `documentRepository` |
| `master` | `MasterData` (single object) | `masterRepository` |
| `records` | `RecordInstance[]` | `recordRepository` |
| `settings` | `AppSettings` (mode, liveStartDate) | `settingsRepository` |

All are seeded once (`ensureSeeded()`) on first run from `src/data/seed/*` — see
`src/data/bootstrap.ts`, called once from `main.tsx`.

## The CAPA module: Internal vs External, and the guided walk-through

`/gap` is a chooser with exactly two doors. **Internal** (`kind: "gap-inspection"`, `GapPage.tsx`) is
the pest-control inspection-findings report that has been there since Phase 1. **External** (`kind:
"complaint-checklist"`, `CapaPage.tsx`) is the Customer Complaint Handling Checklist F/MKT/05:
`ComplaintChecklistData` = six header fields + `sections[5].items[]` (each `{ srNo, activity, done,
date, comment, notRequired }`, verbatim from `src/data/seed/complaintChecklist.ts`) + `preparedBy` /
`approvedBy` sign-offs. Both documents share the module "CAPA (Corrective & Preventive Action)".

The assistant fills a complaint checklist *conversationally* — that is the reason the widget became
a chat. `src/engine/guidedChecklist.ts` is a pure state machine: `firstStep(data)` → the first blank
required header detail, else Section A; `promptFor(step)` → the question plus quick-reply chips
("Done today", "Done on a date…", "Not required", "Skip"; per section "Let's go" / "All N done today"
/ "Skip this section"; at the end "Submit for approval" / "Not yet"); `applyAnswer(data, step,
answer)` → new data + a one-line acknowledgement; `stepAfter(data, step)` → header → A → B → C → D →
E → approval. Chip answers never touch the network. A typed answer about an activity ("got the
samples on the 3rd") goes to `POST /api/assistant/checklist-answer` (Groq) and comes back as
`{ done, notRequired, date, comment }`; if that call fails the text is kept as the comment and the
activity marked done, so a model outage never blocks the walk-through. The page registers a
`ChecklistBinding` on the assistant context (`getData/setData/submit/approve/sendBack`, plus
`autoStart` for a brand-new checklist so the widget opens itself). Submit stamps Prepared By with
the logged-in user; approval is the Verify step and stamps Approved By (designation defaulting to
"QA Head", per activity 31).

## Dead code removed (Sept-2026 cleanup)

Un-exported/deleted because nothing referenced them: `AuditEvent`, `FREQUENCIES`, `RECORD_STATUSES`,
`recordNumber()`, `settingsRepository.nextSequence()` and its `sequenceCounters` /
`lastGeneratedThrough` fields (stored copies keep any stale keys harmlessly — `get()` spreads over
defaults), `recordRepository.existsForPeriod()` / `todayStats()`, `ensureRecordsGeneratedForRange()`,
`selectors.isDemoModeFilter()`, `DemoWatermarkBar`, and the unused date helpers `formatMonthYear` /
`addMonths` / `isPast` / `weekdayOf`. `tests/screenshot_final.png` (a generated artifact) is gone and
no longer written.

## Why re-render works without a state-management library

No Redux/Zustand/MobX was available offline (see DEPLOYMENT.md), so `AppStoreProvider`
(`src/store/AppStore.tsx`) exposes a single `version: number` + `bump()`. Any component that
mutates a repository calls `bump()` afterwards; components read repositories directly during
render (cheap at this data scale) and are simply re-rendered when `version` changes via React
context. This is intentionally the simplest thing that works for a localStorage-scale prototype —
see FUTURE_ROADMAP.md for the production recommendation (React Query / SWR style cache once a
real network API exists).
