export type CompanyId = string;
export type RegionId = string;

export interface Company {
  id: CompanyId;
  name: string;
  sector: string;
  color: string;
  pricePerPercent: number;
  royaltyPerPercent: number;
}

export interface Region {
  id: RegionId;
  name: string;
  color: string;
}

export type Cell =
  | { id: string; type: "depart"; name: string }
  | { id: string; type: "city"; name: string; region: RegionId; stock: Record<CompanyId, number> }
  | { id: string; type: "choix-regional"; name: string; region: RegionId }
  | { id: string; type: "mondial" | "encheres" | "atout" | "actu" | "levee"; name: string };

export interface ActuCard {
  id: string;
  text: string;
  amount: number;
}

export interface GameConfig {
  startingCash: number;
  maxPurchasePercent: number;
  leveeFundsPerPip: number;
  auctionPercentPerPip: number;
  minBidIncrement: number;
  auctionTimeoutSeconds: number;
  offerTimeoutSeconds: number;
  atoutPrice: number;
  monopolyMultiplier: number;
  bankBuybackRatio: number;
  royaltyTokensPerCompany: number;
  minPlayers: number;
  maxPlayers: number;
}
