import { describe, expect, it } from "vitest";
import { rollDie } from "./rng";

describe("rollDie", () => {
  it("is deterministic for a given seed", () => {
    expect(rollDie(42)).toEqual(rollDie(42));
  });

  it("stays between 1 and 6 and covers every face", () => {
    const seen = new Set<number>();
    let seed = 1;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = rollDie(seed);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
      seed = next;
    }
    expect(seen.size).toBe(6);
  });
});
