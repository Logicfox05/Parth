// DEMO MODE synthetic data generator (sections 13/14/38). Every record this
// produces is stamped isDemo:true and is clearly rendered with a
// DEMO / SYNTHETIC watermark everywhere in the UI — it must never be
// mistaken for a real completed company record.
import type {
  DailyPestMonitoringData,
  DocumentDefinition,
  FlyCatcherData,
  RecordInstance,
  RecordStatus,
  ServiceReportData,
} from "../types";
import { documentRepository } from "./repositories/documentRepository";
import { masterRepository } from "./repositories/masterRepository";
import { recordRepository } from "./repositories/recordRepository";
import { dueDatesInMonth } from "../engine/frequencyEngine";
import { periodKeyFor } from "../engine/recordGenerator";
import { fixedMaterialForServiceArea } from "../engine/serviceMaterials";
import { autoFillRecord } from "../engine/autoFill";
import { describeRodentEvent, rodentEventFor } from "../engine/rodentPattern";
import { generateId } from "../utils/id";
import { compareISO, todayISO } from "../utils/date";

const DEMO_CHECKERS = ["Roshni", "Vijay", "Yogesh Rathod", "Priya Solanki"];
const DEMO_REMARKS = ["", "", "", "Monitored, no issues found.", "Reported to supervisor.", "Minor gap sealed same day."];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chance(p: number): boolean {
  return Math.random() < p;
}
function randTime(): string {
  const h = 8 + Math.floor(Math.random() * 2);
  const m = Math.floor(Math.random() * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function statusForDate(dueDate: string, today: string): RecordStatus {
  if (dueDate > today) return "Due";
  if (dueDate === today) return pick<RecordStatus>(["Due", "In Progress", "Submitted"]);
  // past dates: mostly verified, some pending/submitted, rare rejected
  const r = Math.random();
  if (r < 0.75) return "Verified";
  if (r < 0.9) return "Pending Verification";
  if (r < 0.97) return "Submitted";
  return "Rejected";
}

function buildDailyData(dueDate: string, isHoliday: boolean): DailyPestMonitoringData {
  if (isHoliday) {
    return { isHoliday: true, checkpoints: {}, timeOfChecking: "", checker: "", summaryActions: [], rodentCatches: [] };
  }
  const checkpoints: DailyPestMonitoringData["checkpoints"] = {};
  const master = masterRepository.get();
  const summaryActions: DailyPestMonitoringData["summaryActions"] = [];
  for (const cp of master.checkpoints) {
    if (cp.responseType === "number") {
      checkpoints[cp.no] = { value: 100 };
    } else {
      // Non-rodent checkpoints: a rare (~1.5%) housekeeping finding — a
      // door closer, a gap, a tube light — with its own action row.
      const flagged = cp.no < 7 || cp.no === 10 ? chance(0.015) : false;
      const value = flagged ? cp.flagWhen! : cp.flagWhen === "Yes" ? "No" : "Yes";
      checkpoints[cp.no] = { value };
      if (flagged) {
        summaryActions.push({
          id: generateId("act"),
          dateOfObservation: dueDate,
          descriptionOfObservation: `Checkpoint ${cp.no}: ${cp.text}`,
          actionTaken: "Reported to Production Supervisor; rectified the same day (demo data).",
          remarks: pick(DEMO_REMARKS),
        });
      }
    }
  }
  // Rodent checkpoints 7/8/9 follow the same seasonal catch pattern the
  // Live assistant uses (engine/rodentPattern.ts), so a demo year shows a
  // believable trend — quiet months, a few catches in the monsoon.
  const ev = rodentEventFor(dueDate);
  if (ev.catches.length > 0) {
    checkpoints[7] = { value: "Yes" };
    summaryActions.push({
      id: generateId("act"),
      dateOfObservation: dueDate,
      descriptionOfObservation: describeRodentEvent(ev),
      actionTaken: "Rodent removed and disposed; glue board replaced in the box; Gurudev Pest Control informed.",
      remarks: "Box re-checked next day.",
    });
  }
  if (ev.deadRodentLocation) checkpoints[8] = { value: "Yes", note: ev.deadRodentLocation };
  if (ev.cakeBitingBoxNo) checkpoints[9] = { value: "Yes", note: ev.cakeBitingBoxNo };

  return {
    isHoliday: false,
    checkpoints,
    timeOfChecking: randTime(),
    checker: pick(DEMO_CHECKERS),
    summaryActions,
    rodentCatches: ev.catches,
  };
}

function buildFlyCatcherData(monthYear: string): FlyCatcherData {
  const master = masterRepository.get();
  return {
    monthYear,
    entries: master.pcLocations.map((pc) => ({
      pcId: pc.id,
      catchCountApprox: chance(0.7) ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10),
      tubeLightInstallDate: "2025-12-24",
      tubeLightDueDate: "2026-12-23",
      cleaningDoneBy: pick(["Vijay", "Ramesh"]),
      verifiedBy: pick(DEMO_CHECKERS),
    })),
  };
}

// Realistic quantity range/unit per fixed material, matching the ranges
// actually observed in the source specimens (REQUIREMENTS.md §5) rather than
// one generic "ml" range for every material (glue boards are counted in
// pieces, not millilitres).
function randomQtyFor(materialName: string): string {
  if (materialName === "Glue Board") return `${2 + Math.floor(Math.random() * 4)}`;
  if (materialName === "Bromadiolone Cake") return `${30 + Math.floor(Math.random() * 11)} grams`;
  return `${100 + Math.floor(Math.random() * 51)} ml`;
}

function buildServiceReportData(doc: DocumentDefinition): ServiceReportData {
  const master = masterRepository.get();
  const areas = master.areas.filter((a) => a.context === `service-report:${doc.variantKey}`);
  return {
    serviceName: doc.variantKey ?? doc.name,
    lines: (areas.length ? areas : [{ id: "adhoc", name: "General area (demo)", context: "" }]).map((a, i) => {
      const fixed = fixedMaterialForServiceArea(doc.variantKey, a.name);
      return {
        slNo: i + 1,
        areaName: a.name,
        materialName: fixed.materialName,
        qtyUsed: randomQtyFor(fixed.materialName),
        methodOfApplication: fixed.methodOfApplication,
        remarks: pick(["-", "-", "No Rodent Trapped", "Routine service"]),
      };
    }),
    technicianSign: "Yogesh Rathod",
    customerSign: chance(0.7) ? "Kapila Barad" : "",
  };
}

export function generateDemoRecordsForMonth(year: number, month: number): number {
  const docs = documentRepository.getRecordable();
  const today = todayISO();
  const created: RecordInstance[] = [];
  const now = new Date().toISOString();

  const master = masterRepository.get();
  const holidayDates = new Set((master.holidays ?? []).map((h) => h.date));
  const existing = recordRepository.periodKeys(true);

  for (const doc of docs) {
    const dueDates = dueDatesInMonth(doc, year, month);
    // The most recent demo record before this month, so the assistant's
    // carry-forward logic has something to chain from for log sheets.
    let previous: RecordInstance | undefined = recordRepository
      .query({ documentId: doc.id, isDemo: true })
      .filter((r) => compareISO(r.dueDate, `${year}-${String(month + 1).padStart(2, "0")}-01`) < 0)
      .sort((a, b) => compareISO(b.dueDate, a.dueDate))[0];

    for (const dueDate of dueDates) {
      const periodKey = periodKeyFor(doc, dueDate);
      if (existing.has(`${doc.id}|${periodKey}`)) continue;
      if (doc.kind !== "daily-pest-monitoring" && holidayDates.has(dueDate)) continue;

      const status = statusForDate(dueDate, today);
      const isHoliday = doc.kind === "daily-pest-monitoring" && new Date(dueDate).getDay() === 0 && chance(0.15);
      let data: unknown;
      if (doc.kind === "daily-pest-monitoring") data = buildDailyData(dueDate, isHoliday);
      else if (doc.kind === "fly-catcher") data = buildFlyCatcherData(`${year}-${month + 1}`);
      else if (doc.kind === "service-report") data = buildServiceReportData(doc);
      else if (doc.kind === "log-sheet" || doc.kind === "training-record") {
        // Same engine the Live assistant uses, so demo log sheets look
        // exactly like the prepared real ones (still isDemo:true below).
        const filled = autoFillRecord(doc, dueDate, master, previous);
        if (!filled) continue;
        data = filled.data;
      } else continue;

      const rec: RecordInstance = {
        id: generateId("demo"),
        documentId: doc.id,
        periodKey,
        dueDate,
        status,
        isDemo: true,
        data,
        createdAt: now,
        updatedAt: now,
        submittedBy: status !== "Due" && status !== "In Progress" ? pick(DEMO_CHECKERS) : undefined,
        submittedAt: status !== "Due" && status !== "In Progress" ? `${dueDate}T10:00:00.000Z` : undefined,
        verifiedBy: status === "Verified" ? "Kapila Barad" : undefined,
        verifiedAt: status === "Verified" ? `${dueDate}T15:00:00.000Z` : undefined,
        rejectionReason: status === "Rejected" ? "Missing checker signature (demo data)." : undefined,
      };
      created.push(rec);
      previous = rec;
    }
  }

  recordRepository.upsertMany(created);
  return created.length;
}

export function clearAllDemoData(): number {
  return recordRepository.clearDemoData();
}

// Generates demo data for the year so far (January through next month) in
// one call — idempotent (generateDemoRecordsForMonth skips any period that
// already has a demo record), so calling it every time Dashboard mounts
// while in Demo Mode is cheap after the first time. Only ever touches
// isDemo:true records; never called for Live data. Lets someone switch into
// Demo Mode and immediately browse the months that have history without
// visiting the Demo Mode page first. Months further ahead would only be
// blank "Due" shells (nothing to demo) and, with five daily lamination log
// sheets of 24 rows each, would roughly double localStorage usage for no
// benefit — they can still be generated explicitly from the Demo Mode page.
export function ensureDemoRecordsGeneratedForYear(year: number): number {
  const now = new Date();
  const lastMonth = year < now.getFullYear() ? 11 : year > now.getFullYear() ? -1 : Math.min(11, now.getMonth() + 1);
  let total = 0;
  for (let month = 0; month <= lastMonth; month++) {
    total += generateDemoRecordsForMonth(year, month);
  }
  return total;
}
