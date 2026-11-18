import { describe, expect, it } from "vitest";
import { board, companies, config } from "./data";
import { applyAction, buyableStock, createGame, type Action } from "./game";
import { rollDie } from "./rng";
import type { GameState } from "./state";

const P = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Chloé" },
];

function ok(state: GameState, action: Action): GameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function err(state: GameState, action: Action): string {
  const r = applyAction(state, action);
  if (r.ok) throw new Error("expected an error");
  return r.error;
}

// Finds a seed whose next two dice move the current player onto `cellId`
function landOn(state: GameState, cellId: string): GameState {
  const target = board.findIndex((c) => c.id === cellId);
  const pos = state.players[state.current]!.position;
  const need = (target - pos + board.length) % board.length;
  for (let seed = 1; seed < 100000; seed++) {
    const [d1, s1] = rollDie(seed);
    const [d2] = rollDie(s1);
    if (d1 + d2 === need) return ok({ ...state, seed }, { type: "ROLL", playerId: state.players[state.current]!.id });
  }
  throw new Error(`no seed lands on ${cellId}`);
}

function at(state: GameState, cellId: string): GameState {
  const s = structuredClone(state);
  // place the player 2 cells before so a roll of 2 reaches the target
  s.players[s.current]!.position = (board.findIndex((c) => c.id === cellId) - 2 + board.length) % board.length;
  return landOn(s, cellId);
}

const price = (id: string) => companies.find((c) => c.id === id)!.pricePerPercent;
const royalty = (id: string) => companies.find((c) => c.id === id)!.royaltyPerPercent;

describe("setup", () => {
  it("gives each city one royalty company, 2 per company", () => {
    const g = createGame(P, 7);
    const counts: Record<string, number> = {};
    for (const c of Object.values(g.royalties)) counts[c] = (counts[c] ?? 0) + 1;
    expect(Object.keys(g.royalties)).toHaveLength(24);
    for (const c of companies) expect(counts[c.id]).toBe(2);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    expect(createGame(P, 7).royalties).toEqual(createGame(P, 7).royalties);
    expect(createGame(P, 7).royalties).not.toEqual(createGame(P, 8).royalties);
  });

  it("rejects too few players", () => {
    expect(() => createGame([P[0]!], 1)).toThrow();
  });
});

describe("turn order", () => {
  it("only the current player can roll", () => {
    const g = createGame(P, 1);
    expect(err(g, { type: "ROLL", playerId: "b" })).toMatch(/dés/);
  });

  it("passes to the next player after END_TURN", () => {
    let g = createGame(P, 1);
    g = ok(g, { type: "ROLL", playerId: "a" });
    if (g.phase === "auction") return;
    g = ok(g, { type: "END_TURN", playerId: "a" });
    expect(g.players[g.current]!.id).toBe("b");
    expect(g.phase).toBe("roll");
  });
});

describe("buying", () => {
  it("shows the city's stock and buys any split up to 30 %", () => {
    let g = at(createGame(P, 1), "paris");
    expect(buyableStock(g)).toEqual({ amb: 10, amazone: 15, macrosoft: 15 });
    const cash = g.players[0]!.cash;
    g = ok(g, { type: "BUY", playerId: "a", purchases: { amb: 10 } });
    expect(g.players[0]!.holdings.amb).toBe(10);
    expect(g.players[0]!.cash).toBe(cash - 10 * price("amb"));
    expect(g.stocks.paris!.amb).toBe(0);
  });

  it("caps the cumulative purchase at 30 % per landing", () => {
    let g = at(createGame(P, 1), "seattle");
    g.players[0]!.cash = 1_000_000;
    g = ok(g, { type: "BUY", playerId: "a", purchases: { amazone: 20 } });
    expect(err(g, { type: "BUY", playerId: "a", purchases: { macrosoft: 11 } })).toMatch(/30/);
    g = ok(g, { type: "BUY", playerId: "a", purchases: { macrosoft: 10 } });
    expect(g.boughtThisTurn).toBe(30);
  });

  it("refuses more than the city has, or more than the player can pay", () => {
    let g = at(createGame(P, 1), "paris");
    expect(err(g, { type: "BUY", playerId: "a", purchases: { amb: 11 } })).toMatch(/Stock/);
    g.players[0]!.cash = 0;
    expect(err(g, { type: "BUY", playerId: "a", purchases: { amb: 1 } })).toMatch(/argent/);
  });

  it("other players cannot buy during someone else's turn", () => {
    const g = at(createGame(P, 1), "paris");
    expect(err(g, { type: "BUY", playerId: "b", purchases: { amb: 1 } })).toMatch(/impossible/);
  });

  it("regional choice only sells companies the player already holds", () => {
    let g = createGame(P, 1);
    g.players[0]!.holdings = { amb: 5 };
    g = at(g, "choix-europe");
    expect(buyableStock(g)).toEqual({ amb: 10 });
  });

  it("world choice requires a completed lap", () => {
    let g = createGame(P, 1);
    g.players[0]!.holdings = { amb: 5 };
    g = at(g, "mondial-1");
    expect(buyableStock(g)).toEqual({});
  });
});

describe("royalties", () => {
  function withRoyalty(company: string): GameState {
    const g = createGame(P, 1);
    g.royalties.berlin = company;
    return g;
  }

  it("pays only the biggest holder, proportionally to their percent", () => {
    let g = withRoyalty("nvidio");
    g.players[1]!.holdings = { nvidio: 40 };
    g.players[2]!.holdings = { nvidio: 20 };
    const [a, b, c] = g.players.map((p) => p.cash);
    g = at(g, "berlin");
    expect(g.players[0]!.cash).toBe(a! - 40 * royalty("nvidio"));
    expect(g.players[1]!.cash).toBe(b! + 40 * royalty("nvidio"));
    expect(g.players[2]!.cash).toBe(c);
  });

  it("splits a tie equally", () => {
    let g = withRoyalty("nvidio");
    g.players[1]!.holdings = { nvidio: 30 };
    g.players[2]!.holdings = { nvidio: 30 };
    const a = g.players[0]!.cash;
    g = at(g, "berlin");
    const share = Math.floor((30 * royalty("nvidio")) / 2);
    expect(g.players[0]!.cash).toBe(a - 2 * share);
    expect(g.players[1]!.cash).toBe(config.startingCash + share);
  });

  it("doubles at 100 %", () => {
    let g = withRoyalty("intol");
    g.players[1]!.holdings = { intol: 100 };
    g = at(g, "berlin");
    expect(g.players[1]!.cash).toBe(config.startingCash + 100 * royalty("intol") * config.monopolyMultiplier);
  });

  it("the biggest holder landing on their own company pays nothing", () => {
    let g = withRoyalty("nvidio");
    g.players[0]!.holdings = { nvidio: 40 };
    g = at(g, "berlin");
    expect(g.players[0]!.cash).toBe(config.startingCash);
  });

  it("sells holdings to the bank, then goes bankrupt, when cash is short", () => {
    let g = withRoyalty("intol");
    g.players[1]!.holdings = { intol: 100 };
    g.players[0]!.cash = 0;
    g.players[0]!.holdings = { sonyx: 10 };
    g = at(g, "berlin");
    const alice = g.players[0]!;
    expect(alice.bankrupt).toBe(true);
    expect(g.eliminated).toEqual(["a"]);
    expect(g.players[g.current]!.id).toBe("b");
    expect(g.stocks.tokyo!.sonyx).toBe(40);
  });
});

describe("trading with other players", () => {
  it("only the current player makes offers; owner can counter, buyer accepts", () => {
    let g = at(createGame(P, 1), "depart");
    g.players[1]!.holdings = { tesler: 20 };
    expect(err(g, { type: "OFFER", playerId: "b", ownerId: "a", company: "tesler", percent: 5, price: 100 })).toMatch(/impossible/);
    g = ok(g, { type: "OFFER", playerId: "a", ownerId: "b", company: "tesler", percent: 10, price: 500 });
    g = ok(g, { type: "RESPOND_OFFER", playerId: "b", accept: false, counterPrice: 900 });
    expect(g.offer?.awaiting).toBe("a");
    g = ok(g, { type: "RESPOND_OFFER", playerId: "a", accept: true });
    expect(g.players[0]!.holdings.tesler).toBe(10);
    expect(g.players[1]!.holdings.tesler).toBe(10);
    expect(g.players[1]!.cash).toBe(config.startingCash + 900);
  });

  it("a refused offer changes nothing", () => {
    let g = at(createGame(P, 1), "depart");
    g.players[1]!.holdings = { tesler: 20 };
    g = ok(g, { type: "OFFER", playerId: "a", ownerId: "b", company: "tesler", percent: 10, price: 500 });
    g = ok(g, { type: "RESPOND_OFFER", playerId: "b", accept: false });
    expect(g.offer).toBeNull();
    expect(g.players[1]!.holdings.tesler).toBe(20);
  });
});

describe("auctions", () => {
  function auction(): GameState {
    const g = createGame(P, 1);
    g.players[0]!.laps = 1;
    g.players[0]!.holdings = { appel: 50 };
    return at(g, "encheres-1");
  }

  it("forces a sale of dice x 5 % at half price, highest bid wins", () => {
    let g = auction();
    expect(g.phase).toBe("auction");
    const toSell = g.auction!.percentToSell;
    g = ok(g, { type: "AUCTION_CHOOSE", playerId: "a", company: "appel" });
    expect(g.auction!.startPrice).toBe(Math.floor(toSell * price("appel") * config.bankBuybackRatio));
    expect(err(g, { type: "BID", playerId: "a", amount: 99999 })).toMatch(/interdite/);
    g = ok(g, { type: "BID", playerId: "b", amount: g.auction!.startPrice });
    expect(err(g, { type: "BID", playerId: "c", amount: g.auction!.highestBid + 1 })).toMatch(/minimum/);
    const bid = g.auction!.highestBid + config.minBidIncrement;
    g = ok(g, { type: "BID", playerId: "c", amount: bid });
    g = ok(g, { type: "AUCTION_CLOSE" });
    expect(g.players[2]!.holdings.appel).toBe(toSell);
    expect(g.players[0]!.holdings.appel).toBe(50 - toSell);
    expect(g.players[0]!.cash).toBe(config.startingCash + bid);
    expect(g.phase).toBe("act");
  });

  it("without bids the bank buys at half price and refills city stock", () => {
    let g = auction();
    g = ok(g, { type: "AUCTION_CHOOSE", playerId: "a", company: "appel" });
    const start = g.auction!.startPrice;
    g = ok(g, { type: "AUCTION_CLOSE" });
    expect(g.players[0]!.cash).toBe(config.startingCash + start);
  });

  it("an Atout skips the auction", () => {
    let g = createGame(P, 1);
    g.players[0]!.laps = 1;
    g.players[0]!.atouts = 1;
    g.players[0]!.holdings = { appel: 50 };
    g = at(g, "encheres-1");
    g = ok(g, { type: "USE_ATOUT", playerId: "a" });
    expect(g.phase).toBe("act");
    expect(g.players[0]!.holdings.appel).toBe(50);
    expect(g.players[0]!.atouts).toBe(0);
  });

  it("does nothing before the first lap", () => {
    let g = createGame(P, 1);
    g.players[0]!.holdings = { appel: 50 };
    g = at(g, "encheres-1");
    expect(g.phase).toBe("act");
  });
});

describe("game end", () => {
  it("END_GAME (chrono) picks the richest player", () => {
    const g = createGame(P, 1, "chrono");
    g.players[2]!.holdings = { nvidio: 10 };
    const r = applyAction(g, { type: "END_GAME" });
    expect(r.ok && r.state.winner).toBe("c");
  });
});
