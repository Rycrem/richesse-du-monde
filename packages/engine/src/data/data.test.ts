import { describe, expect, it } from "vitest";
import { actuCards, board, companies, config, regions } from "./index";

const cities = board.flatMap((c) => (c.type === "city" ? [c] : []));
const companyIds = new Set(companies.map((c) => c.id));
const regionIds = new Set(regions.map((r) => r.id));

describe("game data", () => {
  it("has a 40-cell board starting with Départ and unique ids", () => {
    expect(board).toHaveLength(40);
    expect(board[0]?.type).toBe("depart");
    expect(new Set(board.map((c) => c.id)).size).toBe(40);
  });

  it("has 24 cities, 4 per region, each with a valid region", () => {
    expect(cities).toHaveLength(24);
    for (const r of regionIds) {
      expect(cities.filter((c) => c.region === r)).toHaveLength(4);
    }
  });

  it("has one regional choice per region", () => {
    const choix = board.flatMap((c) => (c.type === "choix-regional" ? [c.region] : []));
    expect(choix.sort()).toEqual([...regionIds].sort());
  });

  it("splits exactly 100 % of every company across cities", () => {
    const totals: Record<string, number> = {};
    for (const city of cities) {
      for (const [id, pct] of Object.entries(city.stock)) {
        expect(companyIds.has(id), `${city.id} -> ${id}`).toBe(true);
        expect(pct).toBeGreaterThan(0);
        totals[id] = (totals[id] ?? 0) + pct;
      }
    }
    for (const id of companyIds) expect(totals[id], id).toBe(100);
  });

  it("has enough cities for the royalty tokens", () => {
    expect(companies.length * config.royaltyTokensPerCompany).toBe(cities.length);
  });

  it("counts special cells as designed", () => {
    const count = (t: string) => board.filter((c) => c.type === t).length;
    expect(count("mondial")).toBe(1);
    expect(count("encheres")).toBe(2);
    expect(count("atout")).toBe(2);
    expect(count("actu")).toBe(2);
    expect(count("levee")).toBe(2);
  });

  it("has unique actu cards", () => {
    expect(new Set(actuCards.map((c) => c.id)).size).toBe(actuCards.length);
  });
});
