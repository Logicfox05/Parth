import { FLY_MONTHLY_FACTOR, FLY_UNIT_BASE } from "../data/seed/pestPattern";
import { makeRng } from "../utils/random";

// "Flies Catch Count Approx." for one fly catcher unit on one inspection
// date, from the generated seasonal pattern (tools/pest_pattern.py). Seeded
// by unit + date, so the assistant's pre-fill, Demo Mode and a re-run "Fill
// again" all agree, and Pest Control > Trend Analysis > Fly Catcher
// Infestation reads as one consistent story: busy entrances in the monsoon,
// near-empty boards in winter.
export function flyCatchFor(pcId: string, dateISO: string): number {
  const rng = makeRng(`fly|${pcId}|${dateISO}`);
  const month = Number(dateISO.slice(5, 7)) - 1;
  const lambda = (FLY_UNIT_BASE[pcId] ?? 1) * (FLY_MONTHLY_FACTOR[month] ?? 1);
  // Knuth's Poisson sampler — small integer counts with the right spread
  // (a unit that averages one fly a visit still shows 0 and 3 sometimes).
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng.next();
  } while (p > limit && k < 12);
  return Math.min(k - 1, 9);
}

// Tube-light validity, as the F/HR/18 specimen records it: all thirteen units
// installed on 24/12/25, all due for replacement on 23/12/26 — the tubes are
// changed together once a year, at the December service. So for any service
// date the current tubes went in on the most recent 24 December and are due on
// the 23 December a year after. (An earlier version staggered the dates across
// the year on the assumption that thirteen identical dates was a data-entry
// artefact; the company's own register shows it is simply how they do it.)
export function tubeLightCycleFor(serviceDateISO: string): { installed: string; due: string } {
  const year = Number(serviceDateISO.slice(0, 4));
  const installYear = serviceDateISO >= `${year}-12-24` ? year : year - 1;
  return { installed: `${installYear}-12-24`, due: `${installYear + 1}-12-23` };
}

export function flySeasonLabel(month: number): string {
  const f = FLY_MONTHLY_FACTOR[month] ?? 1;
  return f >= 0.85 ? "peak fly season" : f >= 0.55 ? "moderate fly season" : "low fly season";
}
