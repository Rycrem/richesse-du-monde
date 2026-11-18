import { describe, expect, it } from "vitest";
import { COSMETICS, DEFAULT_LOOK, isValidLook, pointsForRank, RANK_POINTS, SLOTS } from "./cosmetics";

describe("cosmetics", () => {
  const cheapest = Math.min(...COSMETICS.filter((c) => c.price > 0).map((c) => c.price));

  it("only the winner earns enough for a cosmetic in one game, everyone earns something", () => {
    expect(pointsForRank(0)).toBeGreaterThanOrEqual(cheapest);
    for (let r = 1; r < 6; r++) {
      expect(pointsForRank(r)).toBeLessThan(cheapest);
      expect(pointsForRank(r)).toBeGreaterThan(0);
    }
    expect(RANK_POINTS).toHaveLength(6);
  });

  it("has at least 5 free items in every slot and a valid default look", () => {
    for (const { slot } of SLOTS) expect(COSMETICS.filter((c) => c.slot === slot && c.price === 0 && c.id !== "hat-none").length).toBeGreaterThanOrEqual(5);
    expect(isValidLook(DEFAULT_LOOK)).toBe(true);
    expect(isValidLook({ ...DEFAULT_LOOK, hat: "head-rond" })).toBe(false);
  });

  it("has unique ids, and shapes point to an item of the same slot", () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const c of COSMETICS) if (c.shape) expect(COSMETICS.find((o) => o.id === c.shape)?.slot).toBe(c.slot);
  });
});
