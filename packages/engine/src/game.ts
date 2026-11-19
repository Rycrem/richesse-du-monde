import { actuCards, board, companies, config } from "./data";
import { nextRandom, rollDie } from "./rng";
import type { Deal, GameMode, GameState, NewGameEvent, Player, PlayerId } from "./state";
import type { CompanyId } from "./types";

export type Action =
  | { type: "ROLL"; playerId: PlayerId }
  | { type: "BUY"; playerId: PlayerId; purchases: Record<CompanyId, number> }
  | { type: "BUY_ATOUT"; playerId: PlayerId }
  | { type: "SELL_TO_BANK"; playerId: PlayerId; company: CompanyId; percent: number }
  | { type: "OFFER"; playerId: PlayerId; ownerId: PlayerId; company: CompanyId; percent: number; price: number }
  | { type: "RESPOND_OFFER"; playerId: PlayerId; accept: boolean; counterPrice?: number }
  | { type: "OFFER_TIMEOUT" }
  | { type: "AUCTION_CHOOSE"; playerId: PlayerId; ownerId: PlayerId; company: CompanyId; percent?: number }
  | { type: "SETTLE_DEBT"; playerId: PlayerId }
  | { type: "USE_ATOUT"; playerId: PlayerId }
  | { type: "BID"; playerId: PlayerId; amount: number }
  | { type: "AUCTION_CLOSE" }
  | { type: "END_TURN"; playerId: PlayerId }
  | { type: "ALLIANCE_INVITE"; playerId: PlayerId; targetId: PlayerId }
  | { type: "ALLIANCE_ANSWER"; playerId: PlayerId; fromId: PlayerId; accept: boolean }
  | { type: "ALLIANCE_LEAVE"; playerId: PlayerId }
  | { type: "END_GAME" }
  | { type: "KICK"; targetId: PlayerId };

export type Result = { ok: true; state: GameState } | { ok: false; error: string };

const companyById = new Map(companies.map((c) => [c.id, c]));
const cityStockOrigin = board.flatMap((c) => (c.type === "city" ? [c] : []));

// Starting cash the host can pick before the game
export const STARTING_CASH_OPTIONS = [5000, 8000, 10000, 12000, 15000, 20000, 30000];

export function createGame(players: { id: PlayerId; name: string }[], seed: number, mode: GameMode = "classique", startingCash = config.startingCash): GameState {
  if (players.length < config.minPlayers || players.length > config.maxPlayers) {
    throw new Error(`Il faut entre ${config.minPlayers} et ${config.maxPlayers} joueurs`);
  }
  if (!STARTING_CASH_OPTIONS.includes(startingCash)) throw new Error("Argent de départ invalide");
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
    players: players.map((p) => ({ ...p, cash: startingCash, position: 0, holdings: {}, atouts: 0, laps: 0, bankrupt: false })),
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
    events: [],
    nextEventId: 1,
    turnBuys: {},
    turnDeals: [],
    eliminated: [],
    winner: null,
    log: [],
  };
}

// Everyone rolls two dice; the highest total plays first, ties are broken at random
export function rollTurnOrder(state: GameState): GameState {
  let s = state.seed;
  const roll = (): [number, number] => {
    const [a, s1] = rollDie(s);
    const [b, s2] = rollDie(s1);
    s = s2;
    return [a, b];
  };
  const shown = new Map(state.players.map((p) => [p.id, roll()]));
  const tiebreak = new Map(state.players.map((p) => [p.id, 0]));
  const sum = (id: PlayerId) => shown.get(id)![0] + shown.get(id)![1];
  for (const p of state.players) {
    while (state.players.some((o) => o.id !== p.id && sum(o.id) === sum(p.id) && tiebreak.get(o.id) === tiebreak.get(p.id))) {
      const [r, next] = nextRandom(s);
      s = next;
      tiebreak.set(p.id, r);
    }
  }
  const players = [...state.players].sort((a, b) => sum(b.id) - sum(a.id) || tiebreak.get(b.id)! - tiebreak.get(a.id)!);
  const next = { ...state, seed: s, players, events: [...state.events] };
  emit(next, { kind: "order", rolls: players.map((p) => ({ playerId: p.id, dice: shown.get(p.id)! })) });
  return next;
}

const MAX_EVENTS = 40;

function emit(state: GameState, e: NewGameEvent): void {
  state.events.push({ ...e, id: state.nextEventId++ } as GameState["events"][number]);
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

// Cash change shown on a card: who, why, how much, before and after
function money(state: GameState, p: Player, kind: "actu" | "ipo" | "krach" | "lap" | "atout", text: string, amount: number): void {
  const before = p.cash;
  if (amount >= 0) p.cash += amount;
  else charge(state, p, -amount);
  emit(state, { kind, playerId: p.id, text, amount, before, after: p.cash });
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

function liquidation(p: Player): number {
  return p.cash + Object.entries(p.holdings).reduce((a, [c, pct]) => a + bankPrice(c, pct), 0);
}

// Sells holdings to the bank, cheapest first, until cash is back to `target`
// Repeated sales of the same company by the same player add up into one line of the recap
function recordDeal(state: GameState, deal: Deal): void {
  const same = state.turnDeals.find((d) => d.sellerId === deal.sellerId && d.buyerId === deal.buyerId && d.company === deal.company);
  if (!same) return void state.turnDeals.push(deal);
  same.percent += deal.percent;
  same.price += deal.price;
}

function autoSell(state: GameState, p: Player, target: number): void {
  const sellable = Object.keys(p.holdings).sort((a, b) => percentPrice(a, 1) - percentPrice(b, 1));
  for (const company of sellable) {
    while (p.cash < target && (p.holdings[company] ?? 0) > 0) {
      removeHolding(p, company, 1);
      returnToStock(state, company, 1);
      p.cash += bankPrice(company, 1);
      recordDeal(state, { sellerId: p.id, buyerId: null, company, percent: 1, price: bankPrice(company, 1) });
    }
  }
}

// Pays `amount`. Short of cash but able to cover it by selling: cash goes negative and the player
// chooses what to sell before ending the turn. Unable to cover it at all: bankruptcy.
function charge(state: GameState, p: Player, amount: number): void {
  if (p.cash < amount && liquidation(p) < amount) {
    autoSell(state, p, amount);
    bankrupt(state, p);
    return;
  }
  p.cash -= amount;
}

function bankrupt(state: GameState, p: Player, message = `${p.name} fait faillite`): void {
  for (const [company, pct] of Object.entries(p.holdings)) returnToStock(state, company, pct);
  p.holdings = {};
  p.cash = 0;
  p.bankrupt = true;
  leaveAlliance(state, p.id);
  state.allianceInvites = state.allianceInvites.filter((i) => i.from !== p.id && i.to !== p.id);
  state.eliminated.push(p.id);
  state.log.push(message);
  emit(state, { kind: "bankrupt", playerId: p.id });
  const alive = activePlayers(state);
  if (alive.length === 1) {
    state.phase = "gameOver";
    state.winner = alive[0]!.id;
    emit(state, { kind: "win", playerId: alive[0]!.id });
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
export function royaltyQuote(state: GameState, company: CompanyId): { winners: Player[][]; max: number; share: number } {
  const groups = new Map<string, Player[]>();
  for (const p of activePlayers(state)) {
    if (!(p.holdings[company] ?? 0)) continue;
    const key = allianceOf(state, p.id)?.id ?? p.id;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const total = (members: Player[]) => members.reduce((a, p) => a + (p.holdings[company] ?? 0), 0);
  const max = Math.max(0, ...[...groups.values()].map(total));
  if (max === 0) return { winners: [], max: 0, share: 0 };
  const winners = [...groups.values()].filter((g) => total(g) === max);
  const multiplier = max === 100 ? config.monopolyMultiplier : 1;
  const amount = companyById.get(company)!.royaltyPerPercent * max * multiplier;
  return { winners, max, share: Math.floor(amount / winners.length) };
}

function payRoyalty(state: GameState, payer: Player, cellId: string): void {
  const company = state.royalties[cellId]!;
  const { winners, max, share } = royaltyQuote(state, company);
  if (max === 0) return;
  const name = companyById.get(company)!.name;
  const payerGroup = allianceOf(state, payer.id)?.id ?? payer.id;
  // a payer who holds as much as the biggest holder (alone or with allies) owes nothing
  const payerMembers = activePlayers(state).filter((p) => (allianceOf(state, p.id)?.id ?? p.id) === payerGroup);
  if (payerMembers.reduce((a, p) => a + (p.holdings[company] ?? 0), 0) === max) return;
  for (const members of winners) {
    if ((allianceOf(state, members[0]!.id)?.id ?? members[0]!.id) === payerGroup) continue;
    charge(state, payer, share);
    // the bank covers a bankrupt player's debt, so holders are always paid in full
    for (const m of members) m.cash += Math.floor((share * (m.holdings[company] ?? 0)) / max);
    const to = members.length === 1 ? members[0]!.name : `l'alliance ${members.map((m) => m.name).join(" + ")}`;
    state.log.push(`${payer.name} paie ${share} k$ à ${to} (${name})`);
    emit(state, { kind: "royalty", playerId: payer.id, company, amount: share, to: members.map((m) => m.id) });
    if (payer.bankrupt) return;
  }
}

function landOn(state: GameState, p: Player, pips: number): void {
  const cell = board[p.position]!;
  state.buyScope = null;
  state.canBuyAtout = false;
  state.phase = "act";
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
    case "levee": {
      const before = p.cash;
      p.cash += pips * config.leveeFundsPerPip;
      emit(state, { kind: "levee", playerId: p.id, text: `Vos investisseurs suivent : ${pips} aux dés × ${config.leveeFundsPerPip} k$`, amount: pips * config.leveeFundsPerPip, dice: state.lastRoll!, before, after: p.cash });
      break;
    }
    case "atout":
      state.canBuyAtout = true;
      break;
    case "actu": {
      const id = state.actuDeck.shift()!;
      state.actuDeck.push(id);
      const card = actuCards.find((c) => c.id === id)!;
      state.log.push(`${p.name} : ${card.text}`);
      money(state, p, "actu", card.text, card.amount);
      break;
    }
    case "encheres": {
      if (!activePlayers(state).some((o) => o.id !== p.id && Object.keys(o.holdings).length > 0)) {
        state.log.push("Enchères : aucun adversaire n'a d'actions à mettre en vente");
        break;
      }
      const [die, next] = rollDie(state.seed);
      state.seed = next;
      state.phase = "auction";
      state.auction = {
        chooserId: p.id,
        sellerId: null,
        percentToSell: die * config.auctionPercentPerPip,
        company: null,
        percent: 0,
        startPrice: 0,
        highestBid: 0,
        highestBidderId: null,
        bids: [],
      };
      break;
    }
    case "ipo":
      state.log.push(`${p.name} réussit son introduction en Bourse : +${config.ipoBonus} k$`);
      money(state, p, "ipo", "Votre entreprise entre en Bourse !", config.ipoBonus);
      break;
    case "krach": {
      const loss = Math.floor((p.cash * config.krachPercent) / 100);
      state.log.push(`Krach boursier : ${p.name} perd ${loss} k$`);
      money(state, p, "krach", `Les marchés plongent : vous perdez ${config.krachPercent} % de votre trésorerie.`, -loss);
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
      // world choice only tops up companies already held; a regional choice sells anything in the region
      if (scope.kind === "world" && !(p.holdings[company] ?? 0)) continue;
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
  state.turnBuys = {};
  state.turnDeals = [];
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
      emit(state, { kind: "roll", playerId: cur.id, dice: [d1, d2], from: cur.position, to: to % board.length });
      cur.position = to % board.length;
      if (to >= board.length) {
        cur.laps += 1;
        money(state, cur, "lap", "Vous repassez par le Départ.", config.lapBonus);
      }
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
        state.turnBuys[company] = (state.turnBuys[company] ?? 0) + pct;
      }
      cur.cash -= cost;
      state.boughtThisTurn += total;
      return { ok: true, state };
    }

    case "BUY_ATOUT": {
      if (!isCurrent || state.phase !== "act" || !state.canBuyAtout) return { ok: false, error: "Achat d'Atout impossible" };
      if (cur.cash < config.atoutPrice) return { ok: false, error: "Pas assez d'argent" };
      money(state, cur, "atout", "Atout acheté : il annule la prochaine enchère forcée sur vos actions.", -config.atoutPrice);
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
      recordDeal(state, { sellerId: p.id, buyerId: null, company: action.company, percent: action.percent, price: bankPrice(action.company, action.percent) });
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
        recordDeal(state, { sellerId: owner.id, buyerId: buyer.id, company: offer.company, percent: offer.percent, price: offer.price });
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
      const seller = a?.sellerId ? player(state, a.sellerId) : undefined;
      if (state.phase !== "auction" || !a || !seller || seller.id !== action.playerId) return { ok: false, error: "Atout inutilisable maintenant" };
      if (seller.atouts < 1) return { ok: false, error: "Aucun Atout" };
      seller.atouts -= 1;
      emit(state, { kind: "auction", playerId: a.chooserId, sellerId: seller.id, company: a.company!, percent: a.percent, price: 0, winnerId: null, cancelled: true });
      state.auction = null;
      state.phase = "act";
      return { ok: true, state };
    }

    case "AUCTION_CHOOSE": {
      const a = state.auction;
      if (state.phase !== "auction" || !a || a.company || a.chooserId !== action.playerId) return { ok: false, error: "Choix impossible" };
      const owner = player(state, action.ownerId);
      if (!owner || owner.bankrupt || owner.id === a.chooserId) return { ok: false, error: "Joueur invalide" };
      const held = owner.holdings[action.company] ?? 0;
      if (held <= 0) return { ok: false, error: "Ce joueur ne détient pas cette entreprise" };
      a.sellerId = owner.id;
      a.company = action.company;
      const most = Math.min(held, a.percentToSell);
      const pct = action.percent ?? most;
      if (!Number.isInteger(pct) || pct < 1 || pct > most) return { ok: false, error: `Entre 1 et ${most} %` };
      a.percent = pct;
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
      a.bids.push({ playerId: bidder.id, amount: action.amount });
      return { ok: true, state };
    }

    case "AUCTION_CLOSE": {
      const a = state.auction;
      if (state.phase !== "auction" || !a || !a.company || !a.sellerId) return { ok: false, error: "Aucune enchère à clore" };
      const seller = player(state, a.sellerId)!;
      // the seller may have sold to the bank meanwhile
      const percent = Math.min(a.percent, seller.holdings[a.company] ?? 0);
      const winner = a.highestBidderId ? player(state, a.highestBidderId)! : null;
      removeHolding(seller, a.company, percent);
      if (winner && winner.cash >= a.highestBid) {
        winner.cash -= a.highestBid;
        seller.cash += a.highestBid;
        winner.holdings[a.company] = (winner.holdings[a.company] ?? 0) + percent;
        emit(state, { kind: "auction", playerId: a.chooserId, sellerId: seller.id, company: a.company, percent, price: a.highestBid, winnerId: winner.id, cancelled: false });
      } else {
        const price = bankPrice(a.company, percent);
        seller.cash += price;
        returnToStock(state, a.company, percent);
        emit(state, { kind: "auction", playerId: a.chooserId, sellerId: seller.id, company: a.company, percent, price, winnerId: null, cancelled: false });
      }
      state.auction = null;
      state.phase = "act";
      return { ok: true, state };
    }

    case "SETTLE_DEBT": {
      const p = player(state, action.playerId);
      if (!p || p.cash >= 0) return { ok: false, error: "Aucune dette" };
      autoSell(state, p, 0);
      return { ok: true, state };
    }

    case "END_TURN": {
      if (!isCurrent || state.phase !== "act" || state.offer) return { ok: false, error: "Impossible de finir le tour maintenant" };
      if (cur.cash < 0) return { ok: false, error: "Vendez des actions pour rembourser votre dette avant de finir le tour" };
      const items = Object.entries(state.turnBuys).map(([company, percent]) => ({ company, percent, total: cur.holdings[company] ?? 0 }));
      if (items.length || state.turnDeals.length) emit(state, { kind: "buys", playerId: cur.id, items, deals: state.turnDeals });
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

    // The host removes a player: their shares go back to the bank, anything waiting on them is cancelled
    case "KICK": {
      const p = player(state, action.targetId);
      if (!p || p.bankrupt) return { ok: false, error: "Joueur introuvable" };
      const a = state.auction;
      if (a && [a.chooserId, a.sellerId, a.highestBidderId].includes(p.id)) {
        state.auction = null;
        state.phase = "act";
      }
      if (state.offer && [state.offer.buyerId, state.offer.ownerId].includes(p.id)) state.offer = null;
      bankrupt(state, p, `${p.name} est exclu de la partie`);
      if (state.phase !== "gameOver" && cur.id === p.id) nextTurn(state);
      return { ok: true, state };
    }

    case "END_GAME": {
      const ranked = [...activePlayers(state)].sort((x, y) => netWorth(y) - netWorth(x));
      state.phase = "gameOver";
      state.winner = ranked[0]!.id;
      emit(state, { kind: "win", playerId: ranked[0]!.id });
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
