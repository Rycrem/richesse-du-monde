import { actuCards, board, companies, config } from "./data";
import { nextRandom, rollDie } from "./rng";
import type { GameMode, GameState, Player, PlayerId } from "./state";
import type { CompanyId } from "./types";

export type Action =
  | { type: "ROLL"; playerId: PlayerId }
  | { type: "BUY"; playerId: PlayerId; purchases: Record<CompanyId, number> }
  | { type: "BUY_ATOUT"; playerId: PlayerId }
  | { type: "SELL_TO_BANK"; playerId: PlayerId; company: CompanyId; percent: number }
  | { type: "OFFER"; playerId: PlayerId; ownerId: PlayerId; company: CompanyId; percent: number; price: number }
  | { type: "RESPOND_OFFER"; playerId: PlayerId; accept: boolean; counterPrice?: number }
  | { type: "OFFER_TIMEOUT" }
  | { type: "AUCTION_CHOOSE"; playerId: PlayerId; company: CompanyId }
  | { type: "USE_ATOUT"; playerId: PlayerId }
  | { type: "BID"; playerId: PlayerId; amount: number }
  | { type: "AUCTION_CLOSE" }
  | { type: "END_TURN"; playerId: PlayerId }
  | { type: "ALLIANCE_INVITE"; playerId: PlayerId; targetId: PlayerId }
  | { type: "ALLIANCE_ANSWER"; playerId: PlayerId; fromId: PlayerId; accept: boolean }
  | { type: "ALLIANCE_LEAVE"; playerId: PlayerId }
  | { type: "END_GAME" };

export type Result = { ok: true; state: GameState } | { ok: false; error: string };

const companyById = new Map(companies.map((c) => [c.id, c]));
const cityStockOrigin = board.flatMap((c) => (c.type === "city" ? [c] : []));

export function createGame(players: { id: PlayerId; name: string }[], seed: number, mode: GameMode = "classique"): GameState {
  if (players.length < config.minPlayers || players.length > config.maxPlayers) {
    throw new Error(`Il faut entre ${config.minPlayers} et ${config.maxPlayers} joueurs`);
  }
  let s = seed >>> 0;
  const tokens = companies.flatMap((c) => Array<CompanyId>(config.royaltyTokensPerCompany).fill(c.id));
  [s] = shuffle(tokens, s);
  const deck = actuCards.map((c) => c.id);
  [s] = shuffle(deck, s);
  const royalties: Record<string, CompanyId> = {};
  cityStockOrigin.forEach((city, i) => (royalties[city.id] = tokens[i]!));
  return {
    seed: s,
    mode,
    players: players.map((p) => ({ ...p, cash: config.startingCash, position: 0, holdings: {}, atouts: 0, laps: 0, bankrupt: false })),
    current: 0,
    phase: "roll",
    stocks: Object.fromEntries(cityStockOrigin.map((c) => [c.id, { ...c.stock }])),
    royalties,
    actuDeck: deck,
    lastRoll: null,
    buyScope: null,
    boughtThisTurn: 0,
    canBuyAtout: false,
    auction: null,
    offer: null,
    alliances: [],
    allianceInvites: [],
    nextAllianceId: 1,
    eliminated: [],
    winner: null,
    log: [],
  };
}

function shuffle<T>(arr: T[], seed: number): [number] {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(s);
    s = next;
    const j = Math.floor(r * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return [s];
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.current]!;
}

function player(state: GameState, id: PlayerId): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function percentPrice(company: CompanyId, percent: number): number {
  return companyById.get(company)!.pricePerPercent * percent;
}

function bankPrice(company: CompanyId, percent: number): number {
  return Math.floor(percentPrice(company, percent) * config.bankBuybackRatio);
}

// Percent returned to the bank goes back to the cities that originally held it, in board order
function returnToStock(state: GameState, company: CompanyId, percent: number): void {
  let left = percent;
  for (const city of cityStockOrigin) {
    const max = city.stock[company] ?? 0;
    const stock = state.stocks[city.id]!;
    const room = max - (stock[company] ?? 0);
    if (room <= 0) continue;
    const put = Math.min(room, left);
    stock[company] = (stock[company] ?? 0) + put;
    left -= put;
    if (left === 0) return;
  }
}

function removeHolding(p: Player, company: CompanyId, percent: number): void {
  const left = (p.holdings[company] ?? 0) - percent;
  if (left > 0) p.holdings[company] = left;
  else delete p.holdings[company];
}

// Pays `amount`; sells holdings to the bank (cheapest first) if cash is short, else goes bankrupt.
function charge(state: GameState, p: Player, amount: number): void {
  if (p.cash < amount) {
    const sellable = Object.keys(p.holdings).sort((a, b) => percentPrice(a, 1) - percentPrice(b, 1));
    for (const company of sellable) {
      while (p.cash < amount && (p.holdings[company] ?? 0) > 0) {
        removeHolding(p, company, 1);
        returnToStock(state, company, 1);
        p.cash += bankPrice(company, 1);
      }
    }
  }
  if (p.cash < amount) {
    bankrupt(state, p);
    return;
  }
  p.cash -= amount;
}

function bankrupt(state: GameState, p: Player): void {
  for (const [company, pct] of Object.entries(p.holdings)) returnToStock(state, company, pct);
  p.holdings = {};
  p.cash = 0;
  p.bankrupt = true;
  leaveAlliance(state, p.id);
  state.allianceInvites = state.allianceInvites.filter((i) => i.from !== p.id && i.to !== p.id);
  state.eliminated.push(p.id);
  state.log.push(`${p.name} fait faillite`);
  const alive = activePlayers(state);
  if (alive.length === 1) {
    state.phase = "gameOver";
    state.winner = alive[0]!.id;
  }
}

export function allianceOf(state: GameState, playerId: PlayerId) {
  return state.alliances.find((a) => a.members.includes(playerId)) ?? null;
}

function leaveAlliance(state: GameState, playerId: PlayerId): void {
  for (const a of state.alliances) a.members = a.members.filter((m) => m !== playerId);
  // an alliance that includes every player left has no one to play against
  const alive = activePlayers(state).length;
  state.alliances = state.alliances.filter((a) => a.members.length >= 2 && a.members.length < alive);
}

// The biggest holder is a solo player or a whole alliance (members' % added up).
// Allies never pay each other; inside an alliance the royalty is split by each member's %.
function payRoyalty(state: GameState, payer: Player, cellId: string): void {
  const company = state.royalties[cellId]!;
  const groups = new Map<string, Player[]>();
  for (const p of activePlayers(state)) {
    if (!(p.holdings[company] ?? 0)) continue;
    const key = allianceOf(state, p.id)?.id ?? p.id;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const total = (members: Player[]) => members.reduce((a, p) => a + (p.holdings[company] ?? 0), 0);
  const max = Math.max(0, ...[...groups.values()].map(total));
  if (max === 0) return;
  const winners = [...groups.values()].filter((g) => total(g) === max);
  const multiplier = max === 100 ? config.monopolyMultiplier : 1;
  const amount = companyById.get(company)!.royaltyPerPercent * max * multiplier;
  const share = Math.floor(amount / winners.length);
  const name = companyById.get(company)!.name;
  const payerGroup = allianceOf(state, payer.id)?.id ?? payer.id;
  for (const members of winners) {
    if ((allianceOf(state, members[0]!.id)?.id ?? members[0]!.id) === payerGroup) continue;
    charge(state, payer, share);
    // the bank covers a bankrupt player's debt, so holders are always paid in full
    for (const m of members) m.cash += Math.floor((share * (m.holdings[company] ?? 0)) / max);
    const to = members.length === 1 ? members[0]!.name : `l'alliance ${members.map((m) => m.name).join(" + ")}`;
    state.log.push(`${payer.name} paie ${share} k$ à ${to} (${name})`);
    if (payer.bankrupt) return;
  }
}

function landOn(state: GameState, p: Player, pips: number): void {
  const cell = board[p.position]!;
  state.buyScope = null;
  state.canBuyAtout = false;
  state.phase = "act";
  const twoLeft = activePlayers(state).length <= 2;
  switch (cell.type) {
    case "city":
      payRoyalty(state, p, cell.id);
      state.buyScope = { kind: "city", cellId: cell.id };
      break;
    case "choix-regional":
      state.buyScope = { kind: "region", region: cell.region };
      break;
    case "mondial":
      if (p.laps >= 1) state.buyScope = { kind: "world" };
      break;
    case "levee":
      p.cash += pips * config.leveeFundsPerPip;
      break;
    case "atout":
      state.canBuyAtout = !twoLeft;
      break;
    case "actu": {
      const id = state.actuDeck.shift()!;
      state.actuDeck.push(id);
      const card = actuCards.find((c) => c.id === id)!;
      state.log.push(`${p.name} : ${card.text}`);
      if (card.amount >= 0) p.cash += card.amount;
      else charge(state, p, -card.amount);
      break;
    }
    case "encheres": {
      if (p.laps < 1 || twoLeft || Object.keys(p.holdings).length === 0) break;
      const [die, next] = rollDie(state.seed);
      state.seed = next;
      state.phase = "auction";
      state.auction = {
        sellerId: p.id,
        percentToSell: die * config.auctionPercentPerPip,
        company: null,
        percent: 0,
        startPrice: 0,
        highestBid: 0,
        highestBidderId: null,
      };
      break;
    }
    case "depart":
      break;
  }
}

function availableStock(state: GameState, p: Player): Record<CompanyId, { cellId: string; percent: number }[]> {
  const scope = state.buyScope;
  const out: Record<CompanyId, { cellId: string; percent: number }[]> = {};
  if (!scope) return out;
  for (const cell of board) {
    if (cell.type !== "city") continue;
    if (scope.kind === "city" && cell.id !== scope.cellId) continue;
    if (scope.kind === "region" && cell.region !== scope.region) continue;
    for (const [company, pct] of Object.entries(state.stocks[cell.id]!)) {
      if (pct <= 0) continue;
      if (scope.kind !== "city" && !(p.holdings[company] ?? 0)) continue;
      (out[company] ??= []).push({ cellId: cell.id, percent: pct });
    }
  }
  return out;
}

export function buyableStock(state: GameState): Record<CompanyId, number> {
  const stock = availableStock(state, currentPlayer(state));
  return Object.fromEntries(Object.entries(stock).map(([c, list]) => [c, list.reduce((a, x) => a + x.percent, 0)]));
}

function nextTurn(state: GameState): void {
  const n = state.players.length;
  let i = state.current;
  do i = (i + 1) % n;
  while (state.players[i]!.bankrupt);
  state.current = i;
  state.phase = "roll";
  state.buyScope = null;
  state.boughtThisTurn = 0;
  state.canBuyAtout = false;
  state.offer = null;
}

export function netWorth(p: Player): number {
  return p.cash + Object.entries(p.holdings).reduce((a, [c, pct]) => a + percentPrice(c, pct), 0);
}

export function applyAction(prev: GameState, action: Action): Result {
  if (prev.phase === "gameOver") return { ok: false, error: "Partie terminée" };
  const state = structuredClone(prev);
  const cur = currentPlayer(state);
  const isCurrent = "playerId" in action && action.playerId === cur.id;

  switch (action.type) {
    case "ROLL": {
      if (!isCurrent || state.phase !== "roll") return { ok: false, error: "Ce n'est pas le moment de lancer les dés" };
      const [d1, s1] = rollDie(state.seed);
      const [d2, s2] = rollDie(s1);
      state.seed = s2;
      state.lastRoll = [d1, d2];
      const to = cur.position + d1 + d2;
      if (to >= board.length) cur.laps += 1;
      cur.position = to % board.length;
      landOn(state, cur, d1 + d2);
      if (cur.bankrupt && (state.phase as string) !== "gameOver") nextTurn(state);
      return { ok: true, state };
    }

    case "BUY": {
      if (!isCurrent || state.phase !== "act" || state.offer) return { ok: false, error: "Achat impossible maintenant" };
      const wanted = Object.entries(action.purchases).filter(([, pct]) => pct !== 0);
      const total = wanted.reduce((a, [, pct]) => a + pct, 0);
      if (wanted.some(([, pct]) => !Number.isInteger(pct) || pct < 0)) return { ok: false, error: "Pourcentage invalide" };
      if (state.boughtThisTurn + total > config.maxPurchasePercent) {
        return { ok: false, error: `Maximum ${config.maxPurchasePercent} % par achat` };
      }
      const stock = availableStock(state, cur);
      let cost = 0;
      for (const [company, pct] of wanted) {
        const have = (stock[company] ?? []).reduce((a, x) => a + x.percent, 0);
        if (pct > have) return { ok: false, error: `Stock insuffisant pour ${company}` };
        cost += percentPrice(company, pct);
      }
      if (cost > cur.cash) return { ok: false, error: "Pas assez d'argent" };
      for (const [company, pct] of wanted) {
        let left = pct;
        for (const src of stock[company]!) {
          const take = Math.min(left, src.percent);
          state.stocks[src.cellId]![company]! -= take;
          left -= take;
          if (left === 0) break;
        }
        cur.holdings[company] = (cur.holdings[company] ?? 0) + pct;
      }
      cur.cash -= cost;
      state.boughtThisTurn += total;
      return { ok: true, state };
    }

    case "BUY_ATOUT": {
      if (!isCurrent || state.phase !== "act" || !state.canBuyAtout) return { ok: false, error: "Achat d'Atout impossible" };
      if (cur.cash < config.atoutPrice) return { ok: false, error: "Pas assez d'argent" };
      cur.cash -= config.atoutPrice;
      cur.atouts += 1;
      state.canBuyAtout = false;
      return { ok: true, state };
    }

    case "SELL_TO_BANK": {
      const p = player(state, action.playerId);
      if (!p || p.bankrupt || state.phase === "auction") return { ok: false, error: "Vente impossible maintenant" };
      if (!Number.isInteger(action.percent) || action.percent <= 0 || (p.holdings[action.company] ?? 0) < action.percent) {
        return { ok: false, error: "Pourcentage invalide" };
      }
      removeHolding(p, action.company, action.percent);
      returnToStock(state, action.company, action.percent);
      p.cash += bankPrice(action.company, action.percent);
      return { ok: true, state };
    }

    case "OFFER": {
      if (!isCurrent || state.phase !== "act" || state.offer) return { ok: false, error: "Offre impossible maintenant" };
      const owner = player(state, action.ownerId);
      if (!owner || owner.bankrupt || owner.id === cur.id) return { ok: false, error: "Joueur invalide" };
      if (!Number.isInteger(action.percent) || action.percent <= 0 || (owner.holdings[action.company] ?? 0) < action.percent) {
        return { ok: false, error: "Le joueur ne détient pas ce pourcentage" };
      }
      if (!Number.isInteger(action.price) || action.price < 0 || action.price > cur.cash) return { ok: false, error: "Prix invalide" };
      state.offer = { buyerId: cur.id, ownerId: owner.id, company: action.company, percent: action.percent, price: action.price, awaiting: owner.id };
      return { ok: true, state };
    }

    case "RESPOND_OFFER": {
      const offer = state.offer;
      if (!offer || offer.awaiting !== action.playerId) return { ok: false, error: "Aucune offre en attente pour ce joueur" };
      if (action.counterPrice !== undefined) {
        if (!Number.isInteger(action.counterPrice) || action.counterPrice < 0) return { ok: false, error: "Prix invalide" };
        offer.price = action.counterPrice;
        offer.awaiting = offer.awaiting === offer.ownerId ? offer.buyerId : offer.ownerId;
        return { ok: true, state };
      }
      if (action.accept) {
        const buyer = player(state, offer.buyerId)!;
        const owner = player(state, offer.ownerId)!;
        if (buyer.cash < offer.price) return { ok: false, error: "L'acheteur n'a pas assez d'argent" };
        if ((owner.holdings[offer.company] ?? 0) < offer.percent) return { ok: false, error: "Le vendeur ne détient plus ce pourcentage" };
        buyer.cash -= offer.price;
        owner.cash += offer.price;
        removeHolding(owner, offer.company, offer.percent);
        buyer.holdings[offer.company] = (buyer.holdings[offer.company] ?? 0) + offer.percent;
      }
      state.offer = null;
      return { ok: true, state };
    }

    case "OFFER_TIMEOUT": {
      if (!state.offer) return { ok: false, error: "Aucune offre" };
      state.offer = null;
      return { ok: true, state };
    }

    case "USE_ATOUT": {
      const a = state.auction;
      if (state.phase !== "auction" || !a || a.company || a.sellerId !== action.playerId) return { ok: false, error: "Atout inutilisable maintenant" };
      if (cur.atouts < 1) return { ok: false, error: "Aucun Atout" };
      cur.atouts -= 1;
      state.auction = null;
      state.phase = "act";
      return { ok: true, state };
    }

    case "AUCTION_CHOOSE": {
      const a = state.auction;
      if (state.phase !== "auction" || !a || a.company || a.sellerId !== action.playerId) return { ok: false, error: "Choix impossible" };
      const held = cur.holdings[action.company] ?? 0;
      if (held <= 0) return { ok: false, error: "Vous ne détenez pas cette entreprise" };
      a.company = action.company;
      a.percent = Math.min(held, a.percentToSell);
      a.startPrice = bankPrice(action.company, a.percent);
      return { ok: true, state };
    }

    case "BID": {
      const a = state.auction;
      const bidder = player(state, action.playerId);
      if (state.phase !== "auction" || !a || !a.company) return { ok: false, error: "Aucune enchère en cours" };
      if (!bidder || bidder.bankrupt || bidder.id === a.sellerId) return { ok: false, error: "Enchère interdite" };
      const min = a.highestBidderId ? a.highestBid + config.minBidIncrement : a.startPrice;
      if (!Number.isInteger(action.amount) || action.amount < min) return { ok: false, error: `Enchère minimum : ${min}` };
      if (action.amount > bidder.cash) return { ok: false, error: "Pas assez d'argent" };
      a.highestBid = action.amount;
      a.highestBidderId = bidder.id;
      return { ok: true, state };
    }

    case "AUCTION_CLOSE": {
      const a = state.auction;
      if (state.phase !== "auction" || !a || !a.company) return { ok: false, error: "Aucune enchère à clore" };
      const seller = player(state, a.sellerId)!;
      removeHolding(seller, a.company, a.percent);
      if (a.highestBidderId) {
        const winner = player(state, a.highestBidderId)!;
        winner.cash -= a.highestBid;
        seller.cash += a.highestBid;
        winner.holdings[a.company] = (winner.holdings[a.company] ?? 0) + a.percent;
      } else {
        seller.cash += a.startPrice;
        returnToStock(state, a.company, a.percent);
      }
      state.auction = null;
      state.phase = "act";
      return { ok: true, state };
    }

    case "END_TURN": {
      if (!isCurrent || state.phase !== "act" || state.offer) return { ok: false, error: "Impossible de finir le tour maintenant" };
      nextTurn(state);
      return { ok: true, state };
    }

    case "ALLIANCE_INVITE": {
      const from = state.players.find((p) => p.id === action.playerId);
      const to = state.players.find((p) => p.id === action.targetId);
      if (!from || !to || from.bankrupt || to.bankrupt || from === to) return { ok: false, error: "Joueur introuvable" };
      if (allianceOf(state, to.id)) return { ok: false, error: `${to.name} est déjà dans une alliance` };
      const size = allianceOf(state, from.id)?.members.length ?? 1;
      if (size + 1 >= activePlayers(state).length) return { ok: false, error: "Il doit rester au moins un adversaire hors de l'alliance" };
      if (state.allianceInvites.some((i) => i.from === from.id && i.to === to.id)) return { ok: false, error: "Invitation déjà envoyée" };
      state.allianceInvites.push({ from: from.id, to: to.id });
      state.log.push(`${from.name} propose une alliance à ${to.name}`);
      return { ok: true, state };
    }

    case "ALLIANCE_ANSWER": {
      const invite = state.allianceInvites.find((i) => i.from === action.fromId && i.to === action.playerId);
      if (!invite) return { ok: false, error: "Aucune invitation" };
      state.allianceInvites = state.allianceInvites.filter((i) => i !== invite);
      const from = state.players.find((p) => p.id === invite.from)!;
      const to = state.players.find((p) => p.id === invite.to)!;
      if (!action.accept) {
        state.log.push(`${to.name} refuse l'alliance de ${from.name}`);
        return { ok: true, state };
      }
      const existing = allianceOf(state, from.id);
      if (allianceOf(state, to.id) || (existing?.members.length ?? 1) + 1 >= activePlayers(state).length) {
        return { ok: false, error: "Cette alliance n'est plus possible" };
      }
      if (existing) existing.members.push(to.id);
      else state.alliances.push({ id: `a${state.nextAllianceId++}`, members: [from.id, to.id] });
      state.allianceInvites = state.allianceInvites.filter((i) => i.to !== to.id);
      state.log.push(`${to.name} rejoint l'alliance de ${from.name}`);
      return { ok: true, state };
    }

    case "ALLIANCE_LEAVE": {
      const p = state.players.find((x) => x.id === action.playerId);
      if (!p || !allianceOf(state, p.id)) return { ok: false, error: "Pas dans une alliance" };
      leaveAlliance(state, p.id);
      state.log.push(`${p.name} quitte son alliance`);
      return { ok: true, state };
    }

    case "END_GAME": {
      const ranked = [...activePlayers(state)].sort((x, y) => netWorth(y) - netWorth(x));
      state.phase = "gameOver";
      state.winner = ranked[0]!.id;
      return { ok: true, state };
    }
  }
}

// Final order: winner, then remaining players by net worth, then eliminated players (last eliminated first)
export function ranking(state: GameState): PlayerId[] {
  const alive = activePlayers(state)
    .filter((p) => p.id !== state.winner)
    .sort((a, b) => netWorth(b) - netWorth(a))
    .map((p) => p.id);
  return [...(state.winner ? [state.winner] : []), ...alive, ...[...state.eliminated].reverse()];
}
