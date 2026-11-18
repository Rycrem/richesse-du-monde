import { companies } from "@stonks/engine";

export const companyById = new Map(companies.map((c) => [c.id, c]));

export function money(k: number): string {
  return `${k.toLocaleString("fr-FR")} k$`;
}

export const PLAYER_COLORS = ["#ff5d73", "#3dd6d0", "#ffd166", "#9b5de5", "#06d6a0", "#f78c6b"];
