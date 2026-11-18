import type { CompanyId } from "./types";

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  cash: number;
  position: number;
  holdings: Record<CompanyId, number>;
  atouts: number;
  laps: number;
  bankrupt: boolean;
}

export type BuyScope =
  | { kind: "city"; cellId: string }
  | { kind: "region"; region: string }
  | { kind: "world" };

export interface Auction {
  sellerId: PlayerId;
  percentToSell: number;
  company: CompanyId | null;
  percent: number;
  startPrice: number;
  highestBid: number;
  highestBidderId: PlayerId | null;
}

export interface Offer {
  buyerId: PlayerId;
  ownerId: PlayerId;
  company: CompanyId;
  percent: number;
  price: number;
  awaiting: PlayerId;
}

export interface Alliance {
  id: string;
  members: PlayerId[];
}

export interface AllianceInvite {
  from: PlayerId;
  to: PlayerId;
}

// Everything worth showing as an animated card, in order; clients play the ones they have not seen yet
export type GameEvent =
  | { id: number; kind: "roll"; playerId: PlayerId; dice: [number, number]; from: number; to: number }
  | { id: number; kind: "actu" | "ipo" | "krach" | "lap" | "atout"; playerId: PlayerId; text: string; amount: number; before: number; after: number }
  | { id: number; kind: "levee"; playerId: PlayerId; text: string; amount: number; dice: [number, number]; before: number; after: number }
  | { id: number; kind: "royalty"; playerId: PlayerId; company: string; amount: number; to: PlayerId[] }
  | { id: number; kind: "buys"; playerId: PlayerId; items: { company: string; percent: number; total: number }[] }
  | { id: number; kind: "bankrupt"; playerId: PlayerId }
  | { id: number; kind: "win"; playerId: PlayerId };
export type NewGameEvent = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, "id"> : never) : never;

export type Phase = "roll" | "act" | "auction" | "gameOver";
export type GameMode = "classique" | "chrono";

export interface GameState {
  seed: number;
  mode: GameMode;
  players: Player[];
  current: number;
  phase: Phase;
  stocks: Record<string, Record<CompanyId, number>>;
  royalties: Record<string, CompanyId>;
  actuDeck: string[];
  lastRoll: [number, number] | null;
  buyScope: BuyScope | null;
  boughtThisTurn: number;
  canBuyAtout: boolean;
  auction: Auction | null;
  offer: Offer | null;
  // allied players add up their % to be the biggest holder and share the royalty
  alliances: Alliance[];
  allianceInvites: AllianceInvite[];
  nextAllianceId: number;
  events: GameEvent[];
  nextEventId: number;
  // % bought per company during the current turn, shown to everyone when the turn ends
  turnBuys: Record<CompanyId, number>;
  eliminated: PlayerId[];
  winner: PlayerId | null;
  log: string[];
}
