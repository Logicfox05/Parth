// Cross-cutting read helpers used by Dashboard / Reports / Search so pages
// don't duplicate aggregation logic.
import type { DailyPestMonitoringData, GapFinding, GapInspectionData, RecordInstance } from "../types";
import { recordRepository } from "./repositories/recordRepository";
import { documentRepository } from "./repositories/documentRepository";
import { todayISO, compareISO, pad2 } from "../utils/date";
import { totalRodents } from "../engine/rodentPattern";

// Rodents recorded on the Daily Pest Control Monitoring Record (checkpoint 7
// + catch details) — what Reports > Rodent Trend and the Dashboard add up.
// Only records a person has confirmed or the assistant has prepared count
// (anything with data); blank shells contribute nothing.
export interface RodentMonth {
  month: number; // 0-11
  rodents: number;
  catchDays: number;
}

export interface RodentYearStats {
  year: number;
  months: RodentMonth[];
  total: number;
  catchDays: number;
  byLocation: { location: string; rodents: number; catchDays: number }[];
  byBox: { trapBoxNo: string; location: string; rodents: number }[];
  daysRecorded: number;
}

export function rodentStatsForYear(year: number, isDemo: boolean): RodentYearStats {
  const records = recordRepository.query({
    documentId: "daily-pest-monitoring",
    isDemo,
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`,
  }) as RecordInstance<DailyPestMonitoringData>[];
  const months: RodentMonth[] = Array.from({ length: 12 }, (_, m) => ({ month: m, rodents: 0, catchDays: 0 }));
  const byLocation = new Map<string, { rodents: number; catchDays: number }>();
  const byBox = new Map<string, { location: string; rodents: number }>();
  let daysRecorded = 0;
  for (const r of records) {
    if (r.data.isHoliday) continue;
    daysRecorded += 1;
    const catches = r.data.rodentCatches ?? [];
    const n = r.data.checkpoints[7]?.value === "Yes" ? Math.max(totalRodents(catches), catches.length ? 0 : 1) : 0;
    if (n === 0) continue;
    const m = Number(r.dueDate.slice(5, 7)) - 1;
    months[m].rodents += n;
    months[m].catchDays += 1;
    const seen = new Set<string>();
    for (const c of catches) {
      const loc = c.location || "Location not recorded";
      const l = byLocation.get(loc) ?? { rodents: 0, catchDays: 0 };
      l.rodents += Number(c.count) || 0;
      if (!seen.has(loc)) {
        l.catchDays += 1;
        seen.add(loc);
      }
      byLocation.set(loc, l);
      const box = c.trapBoxNo || "—";
      const b = byBox.get(box) ?? { location: loc, rodents: 0 };
      b.rodents += Number(c.count) || 0;
      byBox.set(box, b);
    }
    if (catches.length === 0) {
      const l = byLocation.get("Location not recorded") ?? { rodents: 0, catchDays: 0 };
      l.rodents += 1;
      l.catchDays += 1;
      byLocation.set("Location not recorded", l);
    }
  }
  return {
    year,
    months,
    total: months.reduce((s, m) => s + m.rodents, 0),
    catchDays: months.reduce((s, m) => s + m.catchDays, 0),
    byLocation: Array.from(byLocation.entries())
      .map(([location, v]) => ({ location, ...v }))
      .sort((a, b) => b.rodents - a.rodents || a.location.localeCompare(b.location)),
    byBox: Array.from(byBox.entries())
      .map(([trapBoxNo, v]) => ({ trapBoxNo, ...v }))
      .sort((a, b) => b.rodents - a.rodents || a.trapBoxNo.localeCompare(b.trapBoxNo)),
    daysRecorded,
  };
}

export function rodentsInMonth(year: number, month: number, isDemo: boolean): number {
  const from = `${year}-${pad2(month + 1)}-01`;
  const to = `${year}-${pad2(month + 1)}-31`;
  return (recordRepository.query({ documentId: "daily-pest-monitoring", isDemo, fromDate: from, toDate: to }) as RecordInstance<DailyPestMonitoringData>[])
    .filter((r) => !r.data.isHoliday && r.data.checkpoints[7]?.value === "Yes")
    .reduce((s, r) => s + Math.max(totalRodents(r.data.rodentCatches), r.data.rodentCatches?.length ? 0 : 1), 0);
}

export function allGapFindings(isDemo: boolean): { record: RecordInstance<GapInspectionData>; finding: GapFinding }[] {
  const records = recordRepository.query({ documentId: "gap-inspection", isDemo }) as RecordInstance<GapInspectionData>[];
  const out: { record: RecordInstance<GapInspectionData>; finding: GapFinding }[] = [];
  for (const r of records) {
    for (const f of r.data.findings) out.push({ record: r, finding: f });
  }
  return out;
}

export function refreshGapFindingStatuses(isDemo: boolean): void {
  const today = todayISO();
  const records = recordRepository.query({ documentId: "gap-inspection", isDemo }) as RecordInstance<GapInspectionData>[];
  for (const r of records) {
    let changed = false;
    const findings = r.data.findings.map((f) => {
      if (f.status === "Closed" || f.status === "Verified") return f;
      const overdue = !!f.targetDate && compareISO(f.targetDate, today) < 0 && !f.actualDateOfAction;
      const next = overdue ? "Overdue" : "Open";
      if (next !== f.status) changed = true;
      return { ...f, status: next as GapFinding["status"] };
    });
    if (changed) recordRepository.upsert({ ...r, data: { ...r.data, findings } });
  }
}

export function openCorrectiveActionsCount(isDemo: boolean): number {
  return allGapFindings(isDemo).filter(({ finding }) => finding.status === "Open" || finding.status === "Overdue").length;
}

export interface ModuleSummary {
  module: string;
  documentCount: number;
  configuredCount: number;
}

export function moduleSummaries(): ModuleSummary[] {
  const docs = documentRepository.getAll();
  const map = new Map<string, ModuleSummary>();
  for (const d of docs) {
    const m = map.get(d.module) ?? { module: d.module, documentCount: 0, configuredCount: 0 };
    m.documentCount += 1;
    if (d.status === "Configured") m.configuredCount += 1;
    map.set(d.module, m);
  }
  return Array.from(map.values());
}
