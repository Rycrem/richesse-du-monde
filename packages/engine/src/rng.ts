// mulberry32: deterministic PRNG so a game can be replayed from its seed
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export function rollDie(seed: number): [value: number, nextSeed: number] {
  const [r, next] = nextRandom(seed);
  return [1 + Math.floor(r * 6), next];
}
