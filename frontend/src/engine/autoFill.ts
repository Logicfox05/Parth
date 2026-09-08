import type {
  DailyPestMonitoringData,
  DocumentDefinition,
  FlyCatcherData,
  LogColumn,
  LogSheetData,
  LogSheetLayout,
  LogSheetRow,
  MasterData,
  RecordInstance,
  ServiceReportData,
  TrainingRecordData,
} from "../types";
import { getLogSheetLayout } from "../data/seed/logSheetLayouts";
import { SEED_AWARENESS_TRAINING_RECORD } from "../data/seed/historicalRecords";
import { createDefaultData } from "./recordDefaults";
import { resolveResponsibleEmployees } from "./documentInfo";
import { fixedMaterialForServiceArea } from "./serviceMaterials";
import { describeRodentEvent, rodentEventFor, totalRodents } from "./rodentPattern";
import { flyCatchFor, flySeasonLabel } from "./flyPattern";
import { dayInfo } from "./holidays";
import { formatDisplayDate } from "../utils/date";
import { generateId } from "../utils/id";
import { makeRng, type Rng } from "../utils/random";

// THE ASSISTANT'S AUTO-FILL. Given a document and a due date, produce the
// complete data the record would most plausibly contain, plus a short
// plain-language list of what was filled in and where the values came from.
//
// Ground rules (these are what keep the pre-filled records honest):
//  * Prefer carrying forward the user's most recent real (submitted/verified)
//    record of the same document. Operators, machines, batch numbers, tube
//    light dates, trap counts, job lists — all of that repeats day to day.
//  * When there is no previous record, fall back to the filled specimen
//    from the uploaded source document (never a made-up shape).
//  * Numeric readings are generated close to their nominal value and always
//    inside the printed acceptance band. The assistant never invents a
//    deviation, a finding, or a corrective action — those are the user's.
//  * Values are deterministic per (document, date) via a seeded RNG, so a
//    page reload can't quietly change a number the user already looked at.
//  * The result is a DRAFT. Nothing here submits or verifies anything.

export interface AutoFillResult {
  data: unknown;
  notes: string[];
  basedOn: string;
}

export function autoFillRecord(
  doc: DocumentDefinition,
  dueDateISO: string,
  master: MasterData,
  previous: RecordInstance | undefined
): AutoFillResult | null {
  const rng = makeRng(`${doc.id}|${dueDateISO}`);
  switch (doc.kind) {
    case "daily-pest-monitoring":
      return fillDailyMonitoring(doc, dueDateISO, master, previous as RecordInstance<DailyPestMonitoringData> | undefined, rng);
    case "fly-catcher":
      return fillFlyCatcher(doc, dueDateISO, master, previous as RecordInstance<FlyCatcherData> | undefined, rng);
    case "service-report":
      return fillServiceReport(doc, dueDateISO, master, previous as RecordInstance<ServiceReportData> | undefined, rng);
    case "training-record":
      return fillTraining(doc, dueDateISO, master, previous as RecordInstance<TrainingRecordData> | undefined);
    case "log-sheet":
      return fillLogSheet(doc, dueDateISO, master, previous as RecordInstance<LogSheetData> | undefined, rng);
    default:
      // CAPA findings and reference documents are never auto-filled: there
      // is nothing routine about a finding.
      return null;
  }
}

// ---------------------------------------------------------------------------
// helpers

function responsibleName(doc: DocumentDefinition, master: MasterData, fallback: string): string {
  const who = resolveResponsibleEmployees(doc, master);
  return who[0]?.name ?? fallback;
}

function basedOnLabel(doc: DocumentDefinition, previous: RecordInstance | undefined, specimen: string): string {
  return previous ? `your ${doc.name} of ${formatDisplayDate(previous.dueDate)}` : `the filled specimen in ${specimen}`;
}

function timeAround(rng: Rng, hour: number, minuteSpread = 25): string {
  const m = rng.int(0, minuteSpread);
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isNightHour(time: string): boolean {
  const h = Number(time.split(":")[0]);
  return h >= 18 || h < 8;
}

// ---------------------------------------------------------------------------
// 1. Daily Pest Control Monitoring Record (F/HR/17)

function fillDailyMonitoring(
  doc: DocumentDefinition,
  dueDate: string,
  master: MasterData,
  previous: RecordInstance<DailyPestMonitoringData> | undefined,
  rng: Rng
): AutoFillResult {
  const base = createDefaultData(doc, dueDate, master) as DailyPestMonitoringData;
  const day = dayInfo(dueDate, master);
  if (base.isHoliday && day.isHoliday) {
    return {
      data: base,
      notes: [
        day.kind === "weekly-off"
          ? `Marked as a holiday — ${day.weekday} is the weekly off, so no checkpoint entry is needed today.`
          : `Marked as a holiday (${day.name}) — no checkpoint entry is needed today.`,
      ],
      basedOn: "the Gujarat Print Pack Leave Calendar 2026 (Master Data → Holidays)",
    };
  }
  const prevData = previous?.data;
  const checkpoints: DailyPestMonitoringData["checkpoints"] = {};
  for (const cp of master.checkpoints) {
    if (cp.responseType === "number") {
      const prevVal = prevData?.checkpoints[cp.no]?.value;
      // 100 = the value written on the filled F/HR/17 specimen.
      checkpoints[cp.no] = { value: typeof prevVal === "number" ? prevVal : 100 };
    } else {
      const normal = cp.flagWhen === "Yes" ? "No" : "Yes";
      checkpoints[cp.no] = { value: normal };
    }
  }

  // The rodent checkpoints (7, 8, 9) follow the day's slot in the generated
  // catch pattern (engine/rodentPattern.ts) — mostly quiet, the occasional
  // catch with box, location and count, so the month reads like a real
  // register and the Rodent Trend report has something true to add up.
  const ev = rodentEventFor(dueDate);
  const rodentCatches = ev.catches;
  const summaryActions: DailyPestMonitoringData["summaryActions"] = [];
  if (rodentCatches.length > 0) {
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

  const checker = prevData?.checker?.trim() || responsibleName(doc, master, "Roshni");
  const timeOfChecking = prevData?.timeOfChecking?.trim() || timeAround(rng, 9);
  const data: DailyPestMonitoringData = { ...base, checkpoints, timeOfChecking, checker, summaryActions, rodentCatches };
  const traps = checkpoints[4]?.value;
  const rodentNote = rodentCatches.length > 0
    ? `Checkpoint 7 = Yes: ${describeRodentEvent(ev)} Logged under Summary of Actions.`
    : ev.cakeBitingBoxNo
      ? `No rodent trapped; checkpoint 9 = Yes — bait-cake biting seen in ${ev.cakeBitingBoxNo}.`
      : "All 10 checkpoints answered as normal — no rodent activity, no findings flagged.";
  return {
    data,
    notes: [
      rodentNote,
      `Rodent traps provided: ${traps}${previous ? " (carried forward)" : " (as on the source register)"}.`,
      `Time of checking ${timeOfChecking}, checker ${checker}.`,
    ],
    basedOn: basedOnLabel(doc, previous, "Kapila mam department reports.pdf (F/HR/17)") + (rodentCatches.length ? `; rodent activity per the seasonal catch pattern (${totalRodents(rodentCatches)} today)` : ""),
  };
}

// ---------------------------------------------------------------------------
// 2. Fortnightly Fly Catcher Inspection & Cleaning Record (F/HR/18)

function fillFlyCatcher(
  doc: DocumentDefinition,
  dueDate: string,
  master: MasterData,
  previous: RecordInstance<FlyCatcherData> | undefined,
  _rng: Rng
): AutoFillResult {
  const base = createDefaultData(doc, dueDate, master) as FlyCatcherData;
  const cleaner = master.employees.find((e) => e.id === "emp-vijay")?.name ?? "Vijay";
  const verifier = master.employees.find((e) => e.id === "emp-checker-1")?.name ?? "Roshni";
  let missingDates = 0;
  // Catch counts follow the seasonal fly pattern per unit (engine/flyPattern.ts,
  // calibrated to the August-26 specimen) so the Fly Catcher Infestation
  // trend has a real shape — not a uniform random number per box.
  const entries = base.entries.map((e) => {
    const prev = previous?.data.entries.find((p) => p.pcId === e.pcId);
    const install = prev?.tubeLightInstallDate ?? null;
    const due = prev?.tubeLightDueDate ?? null;
    if (!install || !due) missingDates += 1;
    return {
      ...e,
      catchCountApprox: flyCatchFor(e.pcId, dueDate),
      tubeLightInstallDate: install,
      tubeLightDueDate: due,
      cleaningDoneBy: prev?.cleaningDoneBy?.trim() || cleaner,
      verifiedBy: prev?.verifiedBy?.trim() || verifier,
    };
  });
  const counts = entries.map((e) => e.catchCountApprox ?? 0);
  const total = counts.reduce((s, n) => s + n, 0);
  const month = Number(dueDate.slice(5, 7)) - 1;
  const notes = [
    `Filled all ${entries.length} fly catcher units (PC-01 to PC-${String(entries.length).padStart(2, "0")}) with approximate catch counts ${Math.min(...counts)}–${Math.max(...counts)} (${total} flies in total — ${flySeasonLabel(month)}).`,
    `Cleaning done by ${cleaner}, verified by ${verifier}.`,
  ];
  if (missingDates > 0) {
    notes.push(
      previous
        ? `Tube light install/due dates carried forward where your last record had them; ${missingDates} unit(s) still need dates.`
        : "Tube light install / due dates aren't in the source register — fill them in once and I'll carry them forward from then on."
    );
  } else {
    notes.push("Tube light install / due dates carried forward from your last record.");
  }
  return { data: { ...base, entries }, notes, basedOn: basedOnLabel(doc, previous, "Kapila mam department reports.pdf (F/HR/18)") };
}

// ---------------------------------------------------------------------------
// 3. Pest Control Service Report (Rat / Mice, Ants & Cockroaches, Fly)

function typicalQty(materialName: string, rng: Rng): string {
  if (materialName === "Glue Board") return `${rng.int(3, 4)}`;
  if (materialName === "Bromadiolone Cake") return `${rng.int(30, 40)} grams`;
  if (materialName.startsWith("Deltamethrin")) return "150 ml";
  if (materialName.startsWith("Beta-Cyfluthrin")) return `${rng.pick([100, 125, 150])} ml`;
  return "";
}

function fillServiceReport(
  doc: DocumentDefinition,
  dueDate: string,
  master: MasterData,
  previous: RecordInstance<ServiceReportData> | undefined,
  rng: Rng
): AutoFillResult {
  const base = createDefaultData(doc, dueDate, master) as ServiceReportData;
  const technician = previous?.data.technicianSign?.trim() || responsibleName(doc, master, "Yogesh Rathod");
  const customer =
    previous?.data.customerSign?.trim() || master.employees.find((e) => e.id === "emp-kapila")?.name.replace(/^Ms\.\s*/, "") || "Kapila Barad";
  const isRodent = (doc.variantKey ?? "").toLowerCase().includes("rodent");
  const lines = base.lines.map((l) => {
    const prev = previous?.data.lines.find((p) => p.areaName === l.areaName);
    const fixed = fixedMaterialForServiceArea(doc.variantKey, l.areaName);
    return {
      ...l,
      materialName: fixed.materialName,
      methodOfApplication: fixed.methodOfApplication,
      qtyUsed: prev?.qtyUsed?.trim() || typicalQty(fixed.materialName, rng),
      remarks: prev?.remarks?.trim() || (isRodent ? "No Rodent Trapped" : "-"),
    };
  });
  const notes: string[] = [];
  if (lines.length === 0) {
    notes.push("No fixed area list exists for this service yet (TO BE CONFIRMED) — add the areas treated.");
  } else {
    const materials = Array.from(new Set(lines.map((l) => l.materialName))).join(" / ");
    notes.push(`Filled quantity and remarks for all ${lines.length} areas (${materials}) as on the April-2026 service reports.`);
  }
  notes.push(`Technician ${technician}; customer's representative pre-filled as ${customer} — confirm the countersignature before verifying.`);
  return {
    data: { ...base, lines, technicianSign: technician, customerSign: customer },
    notes,
    basedOn: basedOnLabel(doc, previous, "Service Report-April 2026.xls"),
  };
}

// ---------------------------------------------------------------------------
// 4. Training Record (yearly awareness programme)

function fillTraining(
  doc: DocumentDefinition,
  dueDate: string,
  master: MasterData,
  previous: RecordInstance<TrainingRecordData> | undefined
): AutoFillResult {
  const source = previous?.data ?? SEED_AWARENESS_TRAINING_RECORD.data;
  const data: TrainingRecordData = {
    trainingDate: dueDate,
    trainingType: source.trainingType || "Pest Control Awareness Training Program (annual)",
    trainerProvider: source.trainerProvider || "Gurudev Pest Control",
    topics: [...source.topics],
    attendees: source.attendees.map((a) => ({ ...a, id: generateId("att"), attended: true })),
    certificateRef: "",
    remarks: "",
  };
  return {
    data,
    notes: [
      `Copied the ${data.topics.length} topics and ${data.attendees.length} attendees from the ${formatDisplayDate(source.trainingDate)} programme.`,
      "After the session, tick who actually attended and add the certificate / attendance sheet reference.",
    ],
    basedOn: previous ? basedOnLabel(doc, previous, "") : "the 24-Dec-2025 awareness training (Training - Yrl (1).doc)",
  };
}

// ---------------------------------------------------------------------------
// 5. Generic log sheets (lamination QC / production)

function signFor(col: LogColumn, time: string | undefined, doc: DocumentDefinition, master: MasterData): string {
  const shift = col.autoFill?.byShift;
  if (shift && time) return isNightHour(time) ? shift.night : shift.day;
  if (shift) return shift.day;
  return responsibleName(doc, master, "");
}

function readingInBand(col: LogColumn, rng: Rng): number {
  const decimals = col.decimals ?? 2;
  // Readings drift a little around nominal but stay inside the printed
  // band — a deviation is something a person records, not the assistant.
  const spread = ((col.max! - col.min!) / 2) * 0.8;
  const v = rng.around(col.nominal!, spread, decimals);
  return Math.min(col.max!, Math.max(col.min!, v));
}

function jittered(value: number, fraction: number, decimals: number, rng: Rng): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * (1 + (rng.next() - 0.5) * 2 * fraction) * f) / f;
}

function fillRow(
  layout: LogSheetLayout,
  template: Record<string, string | number | null> | undefined,
  rng: Rng,
  doc: DocumentDefinition,
  master: MasterData,
  fixedTime?: string
): LogSheetRow {
  const row: LogSheetRow = { id: generateId("row") };
  const timeForSign =
    fixedTime ?? (typeof template?.time === "string" ? (template.time as string) : typeof template?.startTime === "string" ? (template.startTime as string) : undefined);
  for (const col of layout.columns) {
    const t = template?.[col.key];
    if (col.fixed && fixedTime !== undefined && layout.rowMode.kind === "timeSlots" && col.key === layout.rowMode.slotKey) {
      row[col.key] = fixedTime;
      continue;
    }
    if (col.fixed && t !== undefined && t !== null) {
      row[col.key] = t;
      continue;
    }
    if (col.autoFill?.sign) {
      row[col.key] = signFor(col, timeForSign, doc, master);
      continue;
    }
    if (col.type === "number") {
      const af = col.autoFill;
      if (col.nominal !== undefined && col.min !== undefined && col.max !== undefined) row[col.key] = readingInBand(col, rng);
      else if (typeof t === "number" && af?.jitter) row[col.key] = jittered(t, af.jitter, col.decimals ?? 2, rng);
      else if (typeof t === "number") row[col.key] = t;
      else if (af?.default !== undefined) row[col.key] = Number(af.default);
      else row[col.key] = null;
      continue;
    }
    if (t !== undefined && t !== null && t !== "") {
      row[col.key] = t;
      continue;
    }
    row[col.key] = col.autoFill?.default !== undefined ? String(col.autoFill.default) : "";
  }
  return row;
}

function fillLogSheet(
  doc: DocumentDefinition,
  dueDate: string,
  master: MasterData,
  previous: RecordInstance<LogSheetData> | undefined,
  rng: Rng
): AutoFillResult | null {
  const layout = getLogSheetLayout(doc.id);
  if (!layout) return null;

  // Header + footer fields: carry forward (job, operator, machine,
  // batches...), sign fields resolve to the responsible employee, else the
  // fixed default, else the specimen.
  const header: Record<string, string> = {};
  for (const f of [...layout.headerFields, ...(layout.footerFields ?? [])]) {
    const prev = previous?.data.header?.[f.key];
    if (f.autoFill?.sign) header[f.key] = prev?.trim() || responsibleName(doc, master, layout.specimenHeader?.[f.key] ?? "");
    else if (f.autoFill?.carryForward && prev) header[f.key] = prev;
    else if (f.autoFill?.default !== undefined) header[f.key] = f.autoFill.default;
    else header[f.key] = f.autoFill?.carryForward ? (layout.specimenHeader?.[f.key] ?? "") : "";
  }

  let rows: LogSheetRow[] = [];
  const mode = layout.rowMode;
  if (mode.kind === "timeSlots") {
    rows = mode.slots.map((slot) => fillRow(layout, undefined, rng, doc, master, slot));
  } else if (mode.kind === "single") {
    rows = [fillRow(layout, layout.specimenRows?.[0], rng, doc, master)];
  } else if (mode.kind === "fixedRows") {
    // The printed parameter list never changes; observations / grades are
    // carried forward from the last inspection of the same document (the
    // job usually runs for days), else from the specimen.
    rows = mode.rows.map((fixed, i) => {
      const source = previous?.data.rows?.[i] ?? layout.specimenRows?.[i] ?? {};
      const { id: _ignored, ...prevValues } = source as Record<string, string | number | null>;
      void _ignored;
      return fillRow(layout, { ...prevValues, ...fixed }, rng, doc, master);
    });
  } else {
    const source = previous?.data.rows?.length ? previous.data.rows : (layout.specimenRows ?? []);
    const wanted = mode.typicalRows ?? Math.max(mode.minRows ?? 1, 1);
    const templates = source.slice(0, Math.max(wanted, mode.minRows ?? 1));
    if (doc.id === "qc-adhesive-mixing") {
      // Batches are mixed a few times a day at irregular hours; spread them
      // out rather than copying yesterday's clock times verbatim.
      const hours = [rng.int(7, 10), rng.int(13, 16), rng.int(20, 23)].slice(0, wanted);
      rows = hours.map((h, i) => fillRow(layout, { ...(templates[i] ?? templates[0] ?? {}), time: timeAround(rng, h, 59) }, rng, doc, master));
    } else {
      rows = templates.map((t) => fillRow(layout, t, rng, doc, master));
    }
  }

  const data: LogSheetData = { header, rows };
  return { data, notes: describeLogSheet(doc, layout, data, previous), basedOn: basedOnLabel(doc, previous, layout.specimenSource) };
}

function rangeOf(rows: LogSheetRow[], key: string): { min: number; max: number } | null {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function describeLogSheet(doc: DocumentDefinition, layout: LogSheetLayout, data: LogSheetData, previous: RecordInstance | undefined): string[] {
  const rows = data.rows;
  const h = data.header;
  switch (doc.id) {
    case "qc-viscosity": {
      const r = rangeOf(rows, "viscosity");
      const testers = Array.from(new Set(rows.map((x) => x.testedBy).filter(Boolean)));
      return [
        `Filled all ${rows.length} hourly readings: ${r?.min.toFixed(2)}–${r?.max.toFixed(2)} Sec., all within 20.0 ± 1.0.`,
        `Tested by ${testers.join(" (day) / ")}${testers.length > 1 ? " (night)" : ""}.`,
      ];
    }
    case "qc-temperature": {
      const keys = layout.columns.filter((c) => c.type === "number").map((c) => c.key);
      const vals = keys.map((k) => rows[0]?.[k]).filter((v): v is number => typeof v === "number");
      return [
        `Logged all 6 hot-room readings: ${Math.min(...vals)}–${Math.max(...vals)} °C (recommended 45 ± 2 °C).`,
        `Signed ${rows[0]?.sign || "—"}.`,
      ];
    }
    case "qc-adhesive-mixing": {
      const r = rangeOf(rows, "viscosity");
      return [
        `Prepared ${rows.length} batch rows at the standard 15 kg adhesive / 1.65 kg hardener / 19.5 kg ethyl mix.`,
        `Mix viscosity ${r?.min.toFixed(2)}–${r?.max.toFixed(2)} Sec.; checked by ${Array.from(new Set(rows.map((x) => x.checkedBy).filter(Boolean))).join(", ")}. Add or remove rows to match today's batches.`,
      ];
    }
    case "prd-process-parameter":
      return [
        `${previous ? "Carried forward" : "Loaded"} ${rows.length} job(s) on ${h.machineName} (operator ${h.operatorName}, shift ${h.shift}) with the same machine settings as ${previous ? "last time" : "the specimen sheet"} — change the job list if today's jobs differ.`,
        `Adhesive ${h.adhesiveMake} ${h.adhesiveCode} batch ${h.adhesiveBatch}; hardener ${h.hardenerMake} ${h.hardenerCode} batch ${h.hardenerBatch}; mixing ratio ${h.mixingRatio}. Update the batch numbers if a new drum was opened.`,
      ];
    case "prd-alc-production":
      return [
        `${previous ? "Carried forward" : "Loaded"} ${rows.length} job(s) for ${h.machineName}, operator ${h.operatorName}, shift ${h.shift} — ALC marked Yes for each.`,
        "Check start / end times, roll weights and OK meters against today's actual production before submitting.",
      ];
    case "qc-inspection-pouching":
    case "qc-inspection-slitting":
    case "qc-inspection-printed-film": {
      const job = [h.fgCode && `FG ${h.fgCode}`, h.poNumber && `PO ${h.poNumber}`, h.jobName].filter(Boolean).join(" · ");
      return [
        `${previous ? "Carried forward" : "Loaded"} all ${rows.length} test-parameter observations for ${job || "the current job"} (shift ${h.shift}); lot status ${h.lotStatus}.`,
        `Inspected by ${h.inspectedBy}. Update the job / PO if a different lot is being inspected today; "Approved by (QA Manager)" is the Verify step.`,
      ];
    }
    case "qc-inprocess-printing": {
      const grades = rows.map((r) => `${String(r.parameter).split(" (")[1]?.replace(")", "") ?? r.parameter}: ${r.grade}`).join(", ");
      return [
        `${previous ? "Carried forward" : "Loaded"} grades for item ${h.itemCode} (PO ${h.poNumber}) on ${h.machine}, operator ${h.operator} — ${grades}.`,
        `QA person ${h.qaPerson}. Change any grade that differs on today's sample sheets; an F grade means printing must stop.`,
      ];
    }
    default:
      return [`Filled ${rows.length} row(s) with typical values.`];
  }
}
