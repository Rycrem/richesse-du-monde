import { describe, expect, it } from "vitest";
import { companies, config } from "./data";
import { activePlayers, applyAction, buyableStock, currentPlayer, type Action } from "./game";
import { createGame } from "./game";
import type { GameState } from "./state";

function step(state: GameState, action: Action): GameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.state;
}

// Simple bot: buys up to 30 % while keeping a cash reserve, auctions its smallest holding, others bid once
function botTurn(state: GameState): GameState {
  const me = currentPlayer(state);
  let g = step(state, { type: "ROLL", playerId: me.id });
  if (g.phase === "gameOver" || currentPlayer(g).id !== me.id) return g;
  if (g.phase === "auction") {
    const self = currentPlayer(g);
    if (self.atouts > 0) g = step(g, { type: "USE_ATOUT", playerId: self.id });
    else {
      const smallest = Object.entries(self.holdings).sort((x, y) => x[1] - y[1])[0]![0];
      g = step(g, { type: "AUCTION_CHOOSE", playerId: self.id, company: smallest });
      const bidder = activePlayers(g).find((p) => p.id !== self.id && p.cash > g.auction!.startPrice * 2);
      if (bidder) g = step(g, { type: "BID", playerId: bidder.id, amount: g.auction!.startPrice });
      g = step(g, { type: "AUCTION_CLOSE" });
    }
  }
  const self = currentPlayer(g);
  let budget = config.maxPurchasePercent;
  for (const [company, available] of Object.entries(buyableStock(g))) {
    const pricePer = companies.find((c) => c.id === company)!.pricePerPercent;
    const pct = Math.min(available, budget, Math.floor((currentPlayer(g).cash - 1500) / pricePer));
    if (pct <= 0) continue;
    g = step(g, { type: "BUY", playerId: self.id, purchases: { [company]: pct } });
    budget -= pct;
  }
  if (g.canBuyAtout && currentPlayer(g).cash > config.atoutPrice * 3) g = step(g, { type: "BUY_ATOUT", playerId: self.id });
  return step(g, { type: "END_TURN", playerId: self.id });
}

function checkInvariants(g: GameState): void {
  for (const c of companies) {
    const held = g.players.reduce((a, p) => a + (p.holdings[c.id] ?? 0), 0);
    const stock = Object.values(g.stocks).reduce((a, s) => a + (s[c.id] ?? 0), 0);
    expect(held + stock, c.id).toBe(100);
  }
  for (const p of g.players) expect(p.cash).toBeGreaterThanOrEqual(0);
}

describe("simulated games", () => {
  it("keeps every company at 100 % and cash >= 0 across 30 bot games", () => {
    let finished = 0;
    let totalTurns = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let g = createGame(
        [1, 2, 3, 4].map((i) => ({ id: `p${i}`, name: `Bot ${i}` })),
        seed,
      );
      let turns = 0;
      while (g.phase !== "gameOver" && turns < 3000) {
        g = botTurn(g);
        checkInvariants(g);
        turns++;
      }
      if (g.phase === "gameOver") {
        finished++;
        totalTurns += turns;
        expect(activePlayers(g)).toHaveLength(1);
        expect(g.winner).toBe(activePlayers(g)[0]!.id);
      }
    }
    console.log(`${finished}/30 parties terminées, ${finished ? Math.round(totalTurns / finished) : 0} tours en moyenne`);
  });
});
