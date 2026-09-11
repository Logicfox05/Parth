import React from "react";
import type { FlyCatcherData, FlyCatcherEntry, PCLocation, RecordInstance } from "../../types";
import { DocumentHeader } from "../documents/DocumentHeader";
import { documentRepository } from "../../data/repositories/documentRepository";
import { masterRepository } from "../../data/repositories/masterRepository";
import { recordRepository } from "../../data/repositories/recordRepository";
import { MONTH_NAMES, daysInMonth, formatDisplayDate, pad2, todayISO } from "../../utils/date";

// THE FLY CATCHER REGISTER IN ITS OWN FORMAT — F/HR/18 Rev 02, exactly as the
// company prints it ("Fly catcher reports .pdf", and pages 5-6 of "Kapila mam
// department reports .pdf"): a two-page MONTHLY register.
//   Both pages — header (company / title / Format No. / Rev No. / Date /
//                Page No.), the Month & Year box, and the PC location legend.
//   Page 1 of 2 — PC-01 to PC-08.   Page 2 of 2 — PC-09 to PC-13.
//   Each unit gets one row per fortnightly visit (the 3rd and the 17th):
//   PC ID NO. | DATE OF SERVICE | FLIES CATCH COUNT APPROX. | DATE OF TUBE
//   LIGHT INSTALLATION | DUE DATE FOR TUBE LIGHT REPLACEMENT | CLEANING DONE
//   BY | VERIFIED BY.
// In the app each visit is its own record (the 13 units' counts for that
// date), so this is a view over the same records the visit page edits —
// nothing is stored twice. Cells are written the way the specimen writes
// them: dates as d/mm/yy, counts as two digits, and the tube-light dates
// once per unit with a ditto mark on the rows below when they haven't changed.

export const FLY_DOC_ID = "fly-catcher";

// Printed wording, verbatim. This form spells the company "PRINT PACK" (two
// words); the pest-control trend report spells it "PRINTPACK" — each keeps
// its own, because the digital record must read as the paper one does.
export const FHR18_COMPANY = "GUJARAT PRINT PACK PUBLICATION PRIVATE LIMITED";
export const FHR18_TITLE = "FORTNIGHTLY – FLY CATCHER INSPECTION & CLEANING RECORD";
export const FHR18_DATE = "15.12.2024";

// The location legend, in the order the form prints it: two columns, the
// first four rows pairing PC-01..04 with PC-05..08, then PC-09/10, 11/12, 13.
const FHR18_LEGEND_ROWS: [string, string | null][] = [
  ["PC-01", "PC-05"],
  ["PC-02", "PC-06"],
  ["PC-03", "PC-07"],
  ["PC-04", "PC-08"],
  ["PC-09", "PC-10"],
  ["PC-11", "PC-12"],
  ["PC-13", null],
];

// Units on page 1; the rest go on page 2 (PC-09..PC-13 on the specimen).
const PAGE_ONE_UNITS = 8;
// The paper has two lines per unit — the two fortnightly visits.
const MIN_ROWS_PER_UNIT = 2;

export function locationLabel(pc: PCLocation): string {
  // PC-10 is printed as plain "Warehouse office wall", with no floor.
  const floor = pc.floor && pc.floor !== "TO BE CONFIRMED" ? ` (${pc.floor})` : "";
  return `${pc.location}${floor}`;
}

/** 2026-08-03 -> "3/08/26", the way the specimen writes a date. */
export function paperDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${Number(d)}/${m}/${y.slice(2)}`;
}

/** 1 -> "01", as the specimen writes a count. */
function paperCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return String(n).padStart(2, "0");
}

const DITTO = '"';

function visitHasData(r: RecordInstance<FlyCatcherData>): boolean {
  return r.data.entries.some((e) => e.catchCountApprox !== null && e.catchCountApprox !== undefined);
}

interface VisitRow {
  record?: RecordInstance<FlyCatcherData>;
  entry?: FlyCatcherEntry;
}

export function FlyCatcherRegisterSheet({
  year,
  month,
  isDemo,
  onOpenVisit,
}: {
  year: number;
  month: number;
  isDemo: boolean;
  onOpenVisit?: (record: RecordInstance<FlyCatcherData>) => void;
}) {
  const doc = documentRepository.getById(FLY_DOC_ID);
  const pcLocations = masterRepository.get().pcLocations;
  const today = todayISO();
  const visits = (
    recordRepository.query({
      documentId: FLY_DOC_ID,
      isDemo,
      fromDate: `${year}-${pad2(month + 1)}-01`,
      toDate: `${year}-${pad2(month + 1)}-${pad2(daysInMonth(year, month))}`,
    }) as RecordInstance<FlyCatcherData>[]
  )
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!doc) return null;

  const monthYear = `${MONTH_NAMES[month].toUpperCase()}-${String(year).slice(2)}`;
  const rowsPerUnit = Math.max(MIN_ROWS_PER_UNIT, visits.length);
  const byId = new Map(pcLocations.map((pc) => [pc.id, pc]));

  // Any unit an admin has added beyond the printed thirteen goes on the end
  // of the legend, paired up the same way.
  const printed = new Set(FHR18_LEGEND_ROWS.flat().filter(Boolean) as string[]);
  const extra = pcLocations.filter((pc) => !printed.has(pc.id)).map((pc) => pc.id);
  const legendRows: [string | null, string | null][] = [...FHR18_LEGEND_ROWS];
  if (extra.length) {
    const last = legendRows[legendRows.length - 1];
    if (last[1] === null) legendRows[legendRows.length - 1] = [last[0], extra.shift() ?? null];
    for (let i = 0; i < extra.length; i += 2) legendRows.push([extra[i], extra[i + 1] ?? null]);
  }

  const unitRows = (pcId: string): VisitRow[] => {
    const rows: VisitRow[] = visits.map((record) => (visitHasData(record) ? { record, entry: record.data.entries.find((e) => e.pcId === pcId) } : { record }));
    while (rows.length < rowsPerUnit) rows.push({});
    return rows;
  };

  const header = (page: string) => (
    <>
      <DocumentHeader doc={doc} companyName={FHR18_COMPANY} title={FHR18_TITLE} dateLabel={FHR18_DATE} pageLabel={page} />
      <div className="fhr18-month">
        <span className="k">Month &amp; Year</span>
        <span className="v">{monthYear}</span>
      </div>
      <table className="register-grid fhr18-legend">
        <tbody>
          {legendRows.map(([left, right], i) => (
            <tr key={i}>
              <td className="pc-id">{left ?? ""}</td>
              <td className="pc-loc">{left && byId.get(left) ? locationLabel(byId.get(left)!) : ""}</td>
              <td className="pc-id">{right ?? ""}</td>
              <td className="pc-loc">{right && byId.get(right) ? locationLabel(byId.get(right)!) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const grid = (units: PCLocation[]) => (
    <div className="doc-table register-grid-wrap">
      <table className="register-grid fhr18-grid">
        <thead>
          <tr>
            <th className="pc-head">PC ID NO.</th>
            <th>DATE OF SERVICE</th>
            <th>FLIES CATCH COUNT APPROX.</th>
            <th>DATE OF TUBE LIGHT INSTALLATION</th>
            <th>DUE DATE FOR TUBE LIGHT REPLACEMENT</th>
            <th>CLEANING DONE BY</th>
            <th>VERIFIED BY</th>
          </tr>
        </thead>
        {units.map((pc) => {
          const rows = unitRows(pc.id);
          return (
            <tbody key={pc.id} className="fhr18-unit" data-pc={pc.id}>
              {rows.map((row, i) => {
                const e = row.entry;
                const above = i > 0 ? rows[i - 1].entry : undefined;
                const tube = (value: string | null | undefined, previous: string | null | undefined) =>
                  !value ? "" : i > 0 && above && previous === value ? DITTO : paperDate(value);
                const clickable = !!row.record && !!onOpenVisit;
                const status = row.record ? row.record.status.replace(/\s+/g, "-").toLowerCase() : "none";
                const isToday = row.record?.dueDate === today;
                return (
                  <tr
                    key={row.record?.id ?? `blank-${i}`}
                    className={`register-row${clickable ? " clickable" : ""}${isToday ? " is-today" : ""}`}
                    onClick={clickable ? () => onOpenVisit!(row.record!) : undefined}
                    title={row.record ? `${pc.id} — visit of ${formatDisplayDate(row.record.dueDate)} (${row.record.status})${clickable ? " · click to open" : ""}` : undefined}
                  >
                    {i === 0 && (
                      <td rowSpan={rows.length} className="pc-cell">
                        {pc.id}
                      </td>
                    )}
                    <td className={`date-cell st-${status}`}>{e ? paperDate(row.record!.dueDate) : ""}</td>
                    <td className="count-cell">{paperCount(e?.catchCountApprox)}</td>
                    <td>{tube(e?.tubeLightInstallDate, above?.tubeLightInstallDate)}</td>
                    <td>{tube(e?.tubeLightDueDate, above?.tubeLightDueDate)}</td>
                    <td className="name-cell">{e?.cleaningDoneBy ?? ""}</td>
                    <td className="name-cell">{e?.verifiedBy ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );

  const pageOne = pcLocations.slice(0, PAGE_ONE_UNITS);
  const pageTwo = pcLocations.slice(PAGE_ONE_UNITS);

  return (
    <div className="register-sheet fhr18-sheet notranslate" translate="no">
      <section className="register-page">
        {header("1 of 2")}
        {grid(pageOne)}
      </section>
      <section className="register-page">
        {header("2 of 2")}
        {grid(pageTwo)}
      </section>
      {onOpenVisit && (
        <div className="text-xs text-faint mt-2 no-print">
          One line per unit per fortnightly visit (scheduled on the 3rd and the 17th; a visit falling on the weekly off is carried out the next working day). Click a
          line to open that visit's record. Date colour: green = Verified, blue = Submitted /
          Pending Verification, red = Rejected. A visit not yet carried out is left blank, as on paper. None of that colouring prints.
        </div>
      )}
    </div>
  );
}
