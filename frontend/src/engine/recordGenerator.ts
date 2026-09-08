import type { DocumentDefinition, RecordInstance } from "../types";
import { documentRepository } from "../data/repositories/documentRepository";
import { masterRepository } from "../data/repositories/masterRepository";
import { recordRepository } from "../data/repositories/recordRepository";
import { settingsRepository } from "../data/repositories/settingsRepository";
import { dueDatesInMonth } from "./frequencyEngine";
import { createDefaultData } from "./recordDefaults";
import { generateId } from "../utils/id";
import { compareISO, todayISO } from "../utils/date";

// AUTOMATIC RECORD GENERATION (section 28). Idempotent: safe to call every
// time the Calendar/Day View/Dashboard mounts for a given month — existing
// instances for a (document, date) are never duplicated or overwritten.
export function ensureRecordsGeneratedForMonth(
  year: number,
  month: number,
  opts: { documentIds?: string[]; isDemo?: boolean } = {}
): RecordInstance[] {
  const master = masterRepository.get();
  const docs = documentRepository
    .getRecordable()
    .filter((d) => !opts.documentIds || opts.documentIds.includes(d.id));
  const holidayDates = new Set((master.holidays ?? []).map((h) => h.date));
  const existing = recordRepository.periodKeys(!!opts.isDemo);
  // Demo data is isolated and explicitly opt-in (Demo Mode), so it has no
  // business having a launch-date floor — only real Live obligations do.
  // ensureLiveStartDate() is idempotent, so this is just a read after the
  // very first call anywhere in the app's lifetime (see data/bootstrap.ts).
  const liveStartDate = opts.isDemo ? null : settingsRepository.ensureLiveStartDate(todayISO());

  const created: RecordInstance[] = [];
  const now = new Date().toISOString();

  for (const doc of docs) {
    const dueDates = dueDatesInMonth(doc, year, month);
    for (const dueDate of dueDates) {
      // Never manufacture a Live obligation for a date before this system
      // went live on this browser — otherwise simply browsing the Calendar
      // back to, say, last year would silently backfill months of "overdue"
      // records for a period when the digital system didn't exist.
      if (liveStartDate && compareISO(dueDate, liveStartDate) < 0) continue;
      // Daily Monitoring has its own on-paper "holiday" concept (a checkbox,
      // no checkpoints required — see recordDefaults.ts/validation.ts), so it
      // still gets a record shell, just pre-flagged. Every other document
      // simply never gets a due-date shell for a day the company's closed —
      // there's nothing to submit/verify, so nothing should ever show as
      // pending or overdue for that date.
      if (doc.kind !== "daily-pest-monitoring" && holidayDates.has(dueDate)) continue;
      if (existing.has(`${doc.id}|${periodKeyFor(doc, dueDate)}`)) continue;
      const rec: RecordInstance = {
        id: generateId("rec"),
        documentId: doc.id,
        periodKey: periodKeyFor(doc, dueDate),
        dueDate,
        status: "Due",
        isDemo: !!opts.isDemo,
        data: createDefaultData(doc, dueDate, master),
        createdAt: now,
        updatedAt: now,
      };
      created.push(rec);
    }
  }

  if (created.length > 0) recordRepository.upsertMany(created);
  return created;
}

export function periodKeyFor(doc: DocumentDefinition, dueDateISO: string): string {
  return `${doc.id}:${dueDateISO}`;
}
