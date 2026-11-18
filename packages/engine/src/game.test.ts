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
  it("gives each city one royalty company, 4 per company", () => {
    const g = createGame(P, 7);
    const counts: Record<string, number> = {};
    for (const c of Object.values(g.royalties)) counts[c] = (counts[c] ?? 0) + 1;
    expect(Object.keys(g.royalties)).toHaveLength(48);
    for (const c of companies) expect(counts[c.id]).toBe(4);
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
    let g = at(createGame(P, 1), "pekin-hub");
    expect(buyableStock(g)).toEqual({ samsong: 20, macrosoft: 20 });
    const cash = g.players[0]!.cash;
    g = ok(g, { type: "BUY", playerId: "a", purchases: { samsong: 10 } });
    expect(g.players[0]!.holdings.samsong).toBe(10);
    expect(g.players[0]!.cash).toBe(cash - 10 * price("samsong"));
    expect(g.stocks["pekin-hub"]!.samsong).toBe(10);
  });

  it("caps the cumulative purchase at 30 % per landing", () => {
    let g = at(createGame(P, 1), "pekin-hub");
    g.players[0]!.cash = 1_000_000;
    g = ok(g, { type: "BUY", playerId: "a", purchases: { samsong: 20 } });
    expect(err(g, { type: "BUY", playerId: "a", purchases: { macrosoft: 11 } })).toMatch(/30/);
    g = ok(g, { type: "BUY", playerId: "a", purchases: { macrosoft: 10 } });
    expect(g.boughtThisTurn).toBe(30);
  });

  it("refuses more than the city has, or more than the player can pay", () => {
    let g = at(createGame(P, 1), "paris");
    expect(err(g, { type: "BUY", playerId: "a", purchases: { nvidio: 11 } })).toMatch(/Stock/);
    g.players[0]!.cash = 0;
    expect(err(g, { type: "BUY", playerId: "a", purchases: { nvidio: 1 } })).toMatch(/argent/);
  });

  it("other players cannot buy during someone else's turn", () => {
    const g = at(createGame(P, 1), "paris");
    expect(err(g, { type: "BUY", playerId: "b", purchases: { nvidio: 1 } })).toMatch(/impossible/);
  });

  it("regional choice sells every company of the region, even on the first lap", () => {
    const g = at(createGame(P, 1), "choix-europe");
    expect(buyableStock(g)).toEqual({ sonyx: 10, gogol: 10, intol: 10, amazone: 10, nvidio: 10, tsmb: 10, appel: 10, meto: 10, macrosoft: 10, tesler: 10 });
  });

  it("an Atout can be bought even with two players left", () => {
    const g = at(createGame(P.slice(0, 2), 1), "atout-1");
    expect(g.canBuyAtout).toBe(true);
  });

  it("world choice requires a completed lap", () => {
    let g = createGame(P, 1);
    g.players[0]!.holdings = { amb: 5 };
    g = at(g, "mondial-1");
    expect(buyableStock(g)).toEqual({});
  });
});

describe("spiral board", () => {
  it("goes from the outer ring straight into the hubs, then back to Départ with a new lap", () => {
    let g = createGame(P, 3);
    g.players[0]!.position = 46;
    g = landOn(g, "ipo-1");
    expect(g.players[0]!.laps).toBe(0);
    g = ok(g, { type: "END_TURN", playerId: "a" });
    g = { ...g, current: 0, phase: "roll" };
    g.players[0]!.position = 78;
    g = landOn(g, "seattle");
    expect(g.players[0]!.position).toBe(1);
    expect(g.players[0]!.laps).toBe(1);
  });

  it("Introduction en Bourse pays a bonus, Krach takes a share of the cash", () => {
    const ipo = at(createGame(P, 1), "ipo-1");
    expect(ipo.players[0]!.cash).toBe(config.startingCash + config.ipoBonus);
    const krach = at(createGame(P, 1), "krach-1");
    expect(krach.players[0]!.cash).toBe(config.startingCash - (config.startingCash * config.krachPercent) / 100);
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
    expect(g.stocks.mexico!.sonyx).toBe(10);
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

describe("ranking", () => {
  it("orders winner, survivors by net worth, then last eliminated first", async () => {
    const { ranking } = await import("./game");
    const g = createGame([...P, { id: "d", name: "Dan" }], 1);
    g.players[1]!.bankrupt = true;
    g.players[3]!.bankrupt = true;
    g.eliminated = ["d", "b"];
    g.players[2]!.cash = 99999;
    g.winner = "a";
    expect(ranking(g)).toEqual(["a", "c", "b", "d"]);
  });
});

describe("alliances", () => {
  const P4 = [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }, { id: "c", name: "Chloé" }, { id: "d", name: "Dan" }];
  const allied = (players = P4) => {
    let g = createGame(players, 1);
    g = ok(g, { type: "ALLIANCE_INVITE", playerId: "b", targetId: "c" });
    return ok(g, { type: "ALLIANCE_ANSWER", playerId: "c", fromId: "b", accept: true });
  };

  it("invite, accept, then leave dissolves a two-player alliance", () => {
    let g = allied();
    expect(g.alliances).toEqual([{ id: "a1", members: ["b", "c"] }]);
    expect(g.allianceInvites).toEqual([]);
    g = ok(g, { type: "ALLIANCE_LEAVE", playerId: "c" });
    expect(g.alliances).toEqual([]);
  });

  it("refusing removes the invite, and someone must stay outside the alliance", () => {
    let g = createGame(P, 1);
    g = ok(g, { type: "ALLIANCE_INVITE", playerId: "a", targetId: "b" });
    g = ok(g, { type: "ALLIANCE_ANSWER", playerId: "b", fromId: "a", accept: false });
    expect(g.allianceInvites).toEqual([]);
    expect(g.alliances).toEqual([]);
    g = ok(g, { type: "ALLIANCE_INVITE", playerId: "a", targetId: "b" });
    g = ok(g, { type: "ALLIANCE_ANSWER", playerId: "b", fromId: "a", accept: true });
    expect(err(g, { type: "ALLIANCE_INVITE", playerId: "a", targetId: "c" })).toMatch(/adversaire/);
    expect(err(g, { type: "ALLIANCE_INVITE", playerId: "c", targetId: "a" })).toMatch(/déjà dans une alliance/);
  });

  it("allies add up their % to beat a bigger solo holder and split the royalty by %", () => {
    let g = allied();
    g.royalties.berlin = "nvidio";
    g.players[1]!.holdings = { nvidio: 20 };
    g.players[2]!.holdings = { nvidio: 10 };
    g.players[3]!.holdings = { nvidio: 25 };
    g = at(g, "berlin");
    const share = 30 * royalty("nvidio");
    expect(g.players[0]!.cash).toBe(config.startingCash - share);
    expect(g.players[1]!.cash).toBe(config.startingCash + Math.floor((share * 20) / 30));
    expect(g.players[2]!.cash).toBe(config.startingCash + Math.floor((share * 10) / 30));
    expect(g.players[3]!.cash).toBe(config.startingCash);
  });

  it("allies do not pay each other", () => {
    let g = allied();
    g = ok(g, { type: "ALLIANCE_INVITE", playerId: "a", targetId: "d" });
    g.royalties.berlin = "nvidio";
    g.alliances[0]!.members = ["a", "b"];
    g.players[1]!.holdings = { nvidio: 30 };
    g = at(g, "berlin");
    expect(g.players[0]!.cash).toBe(config.startingCash);
    expect(g.players[1]!.cash).toBe(config.startingCash);
  });

  it("the alliance ends when a bankruptcy leaves it covering every player", () => {
    let g = allied(P);
    expect(g.alliances).toHaveLength(1);
    g.royalties.berlin = "intol";
    g.players[1]!.holdings = { intol: 100 };
    g.players[0]!.cash = 0;
    g = at(g, "berlin");
    expect(g.players[0]!.bankrupt).toBe(true);
    expect(g.alliances).toEqual([]);
  });
});
