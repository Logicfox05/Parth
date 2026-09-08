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

export function flySeasonLabel(month: number): string {
  const f = FLY_MONTHLY_FACTOR[month] ?? 1;
  return f >= 0.85 ? "peak fly season" : f >= 0.55 ? "moderate fly season" : "low fly season";
}
