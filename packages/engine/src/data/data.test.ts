import { describe, expect, it } from "vitest";
import { actuCards, board, companies, config, regions } from "./index";

const cities = board.flatMap((c) => (c.type === "city" ? [c] : []));
const companyIds = new Set(companies.map((c) => c.id));
const regionIds = new Set(regions.map((r) => r.id));

describe("game data", () => {
  it("has an 80-cell spiral board (48 outer, 32 inner) starting with Départ and unique ids", () => {
    expect(board).toHaveLength(80);
    expect(board[0]?.type).toBe("depart");
    expect(board[48]?.type).toBe("ipo");
    expect(new Set(board.map((c) => c.id)).size).toBe(80);
  });

  it("has 48 cities: 5 per world region on the outer ring, 18 tech hubs on the inner ring", () => {
    expect(cities).toHaveLength(48);
    for (const r of regionIds) {
      expect(cities.filter((c) => c.region === r)).toHaveLength(r === "hubs" ? 18 : 5);
    }
    expect(board.slice(48).filter((c) => c.type === "city").every((c) => c.type === "city" && c.region === "hubs")).toBe(true);
  });

  it("has a regional choice for every region", () => {
    const choix = new Set(board.flatMap((c) => (c.type === "choix-regional" ? [c.region] : [])));
    expect([...choix].sort()).toEqual([...regionIds].sort());
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
    expect(count("encheres")).toBe(3);
    expect(count("atout")).toBe(4);
    expect(count("actu")).toBe(7);
    expect(count("levee")).toBe(4);
    expect(count("ipo")).toBe(2);
    expect(count("krach")).toBe(2);
  });

  it("has unique actu cards", () => {
    expect(new Set(actuCards.map((c) => c.id)).size).toBe(actuCards.length);
  });
});
