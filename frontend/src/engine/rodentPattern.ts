import type { RodentCatch } from "../types";
import {
  RODENT_CAKE_BITING_ALONE_P,
  RODENT_CAKE_BITING_P,
  RODENT_COUNT_DIST,
  RODENT_DEAD_P,
  RODENT_LOCATIONS,
  RODENT_MONTHLY_RATE,
  RODENT_SECOND_LOCATION_P,
} from "../data/seed/rodentPattern";
import { makeRng, type Rng } from "../utils/random";
import { generateId } from "../utils/id";

// What the rodent side of a given day's Daily Pest Control Monitoring Record
// looks like, from the generated pattern (tools/rodent_pattern.py). Seeded
// by the calendar date, so the same day always gets the same answer — the
// assistant's pre-fill, Demo Mode and a re-run "Fill again" all agree, and
// an auditor reading a month sees one consistent story: mostly quiet days,
// the odd catch (location + how many), a bait-biting sign now and then.
export interface RodentDayEvent {
  catches: RodentCatch[]; // checkpoint 7 = Yes when non-empty
  deadRodentLocation: string | null; // checkpoint 8
  cakeBitingBoxNo: string | null; // checkpoint 9
}

function pickLocation(rng: Rng, exclude?: string) {
  const pool = RODENT_LOCATIONS.filter((l) => l.area !== exclude);
  const total = pool.reduce((s, l) => s + l.weight, 0);
  let x = rng.next() * total;
  for (const l of pool) {
    x -= l.weight;
    if (x <= 0) return l;
  }
  return pool[pool.length - 1];
}

function boxNo(n: number): string {
  return `RB-${String(n).padStart(2, "0")}`;
}

function pickCount(rng: Rng): number {
  let x = rng.next();
  for (const d of RODENT_COUNT_DIST) {
    x -= d.p;
    if (x <= 0) return d.count;
  }
  return 1;
}

export function rodentEventFor(dateISO: string): RodentDayEvent {
  const rng = makeRng(`rodent|${dateISO}`);
  const month = Number(dateISO.slice(5, 7)) - 1;
  const rate = RODENT_MONTHLY_RATE[month] ?? 0;
  const event: RodentDayEvent = { catches: [], deadRodentLocation: null, cakeBitingBoxNo: null };

  if (rng.next() < rate) {
    const first = pickLocation(rng);
    event.catches.push({ id: generateId("rc"), trapBoxNo: boxNo(rng.int(first.boxFrom, first.boxTo)), location: first.area, count: pickCount(rng) });
    if (rng.next() < RODENT_SECOND_LOCATION_P) {
      const second = pickLocation(rng, first.area);
      event.catches.push({ id: generateId("rc"), trapBoxNo: boxNo(rng.int(second.boxFrom, second.boxTo)), location: second.area, count: 1 });
    }
    if (rng.next() < RODENT_CAKE_BITING_P) event.cakeBitingBoxNo = event.catches[0].trapBoxNo;
    if (rng.next() < RODENT_DEAD_P) event.deadRodentLocation = event.catches[0].location;
  } else if (rng.next() < RODENT_CAKE_BITING_ALONE_P) {
    const loc = pickLocation(rng);
    event.cakeBitingBoxNo = boxNo(rng.int(loc.boxFrom, loc.boxTo));
  }
  return event;
}

export function totalRodents(catches: RodentCatch[] | undefined): number {
  return (catches ?? []).reduce((s, c) => s + (Number(c.count) || 0), 0);
}

// One-line description of a day's rodent situation, for the assistant's
// notes and the reports' "Rodents" column.
export function describeRodentEvent(ev: RodentDayEvent): string {
  if (ev.catches.length === 0) return ev.cakeBitingBoxNo ? `No rodent trapped; bait-cake biting seen in ${ev.cakeBitingBoxNo}.` : "";
  const parts = ev.catches.map((c) => `${c.count} at ${c.trapBoxNo} (${c.location})`);
  const n = totalRodents(ev.catches);
  return `${n} rodent${n === 1 ? "" : "s"} trapped — ${parts.join("; ")}${ev.deadRodentLocation ? `; dead rodent observed at ${ev.deadRodentLocation}` : ""}${ev.cakeBitingBoxNo ? `; cake biting in ${ev.cakeBitingBoxNo}` : ""}.`;
}
