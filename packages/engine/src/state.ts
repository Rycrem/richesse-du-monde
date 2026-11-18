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
  eliminated: PlayerId[];
  winner: PlayerId | null;
  log: string[];
}
