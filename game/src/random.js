// Seeded randomness and the fixed simulation clock.
// Gameplay never reads Math.random, Date, or a wall clock: every random
// draw comes from mulberry32 seeded from the URL (?seed=), and game time
// advances only in fixed 1/60s steps driven by main.js. The same seed and
// the same inputs therefore always produce the same game state.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseSeedFromUrl(search) {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  if (raw === null || raw === '') return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

// A tiny deterministic clock: callers advance it by exactly one fixed
// step per simulation step, and read game time only from here.
export function createSimClock() {
  let steps = 0;
  return {
    advanceStep(dt) {
      steps += 1;
      return steps * dt;
    },
    get timeSeconds() {
      return steps / 60;
    },
    get stepCount() {
      return steps;
    },
    reset() {
      steps = 0;
    },
  };
}
