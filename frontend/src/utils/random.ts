// Small deterministic PRNG (mulberry32) seeded from a string. The assistant's
// auto-fill uses it so that "prepare record X for date D" always produces the
// same realistic-looking values — reloading the page, or two devices
// preparing the same date, can't disagree with each other.
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  pick: <T>(arr: T[]) => T;
  chance: (p: number) => boolean;
  int: (min: number, max: number) => number; // inclusive
  around: (nominal: number, spread: number, decimals?: number) => number;
}

export function makeRng(seed: string): Rng {
  const next = seededRandom(seed);
  return {
    next,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    // Triangular-ish distribution around the nominal value: most readings
    // sit close to nominal, a few drift toward the edges — like real logs.
    around: (nominal, spread, decimals = 2) => {
      const u = (next() + next()) / 2; // 0..1, peaked at 0.5
      const v = nominal + (u - 0.5) * 2 * spread;
      const f = Math.pow(10, decimals);
      return Math.round(v * f) / f;
    },
  };
}
