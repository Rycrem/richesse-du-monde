import { companies, config } from "./data";
import { activePlayers, buyableStock, currentPlayer, type Action } from "./game";
import type { GameState, PlayerId } from "./state";

const RESERVE = 1500;
const pricePer = (company: string) => companies.find((c) => c.id === company)!.pricePerPercent;

// The next move of one bot, or null when it has nothing to do. Called again after each move.
export function botAction(g: GameState, id: PlayerId): Action | null {
  const me = g.players.find((p) => p.id === id);
  if (!me || me.bankrupt || g.phase === "gameOver") return null;

  const invite = g.allianceInvites.find((i) => i.to === id);
  if (invite) return { type: "ALLIANCE_ANSWER", playerId: id, fromId: invite.from, accept: true };

  const o = g.offer;
  if (o && o.awaiting === id) {
    const value = o.percent * pricePer(o.company);
    const fair = o.awaiting === o.ownerId ? o.price >= value : o.price <= value * 1.2 && me.cash - o.price > RESERVE;
    return { type: "RESPOND_OFFER", playerId: id, accept: fair };
  }

  const a = g.auction;
  if (g.phase === "auction" && a) {
    if (!a.company) {
      if (a.chooserId !== id) return null;
      const target = activePlayers(g)
        .filter((p) => p.id !== id && Object.keys(p.holdings).length > 0)
        .sort((x, y) => y.cash - x.cash)[0]!;
      const biggest = Object.entries(target.holdings).sort((x, y) => y[1] - x[1])[0]![0];
      return { type: "AUCTION_CHOOSE", playerId: id, ownerId: target.id, company: biggest };
    }
    if (a.sellerId === id) return me.atouts > 0 ? { type: "USE_ATOUT", playerId: id } : null;
    if (a.highestBidderId === id) return null;
    const next = a.highestBidderId ? a.highestBid + config.minBidIncrement : a.startPrice;
    const max = a.percent * pricePer(a.company);
    return next <= max && me.cash - next > RESERVE ? { type: "BID", playerId: id, amount: next } : null;
  }

  if (currentPlayer(g).id !== id) return null;
  if (g.phase === "roll") return { type: "ROLL", playerId: id };
  if (me.cash < 0) return { type: "SETTLE_DEBT", playerId: id };

  let left = config.maxPurchasePercent - g.boughtThisTurn;
  let cash = me.cash - RESERVE;
  const purchases: Record<string, number> = {};
  const stock = Object.entries(buyableStock(g)).sort((x, y) => pricePer(y[0]) - pricePer(x[0]));
  for (const [company, available] of stock) {
    const pct = Math.min(available, left, Math.floor(cash / pricePer(company)));
    if (pct <= 0) continue;
    purchases[company] = pct;
    left -= pct;
    cash -= pct * pricePer(company);
  }
  if (Object.keys(purchases).length) return { type: "BUY", playerId: id, purchases };
  if (g.canBuyAtout && me.atouts === 0 && me.cash > config.atoutPrice * 3) return { type: "BUY_ATOUT", playerId: id };
  return { type: "END_TURN", playerId: id };
}
