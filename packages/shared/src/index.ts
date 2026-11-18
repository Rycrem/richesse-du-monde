import type { Action, GameMode, GameState } from "@stonks/engine";
import type { Look, Slot } from "./cosmetics";

export * from "./cosmetics";

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
  look: Look;
}

export interface ProfileView {
  name: string;
  points: number;
  owned: string[];
  look: Look;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: LobbyPlayer[];
  game: GameState | null;
  // epoch ms when the running auction or offer times out
  deadline: number | null;
  // points earned by each player at the end of the game
  rewards: Record<string, number> | null;
}

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;

export interface ClientToServer {
  "room:create": (name: string, profileToken: string, ack: Ack<Session>) => void;
  "room:join": (code: string, name: string, profileToken: string, ack: Ack<Session>) => void;
  "room:rejoin": (code: string, token: string, ack: Ack<Session>) => void;
  "room:start": (mode: GameMode, ack: Ack<null>) => void;
  "room:leave": () => void;
  "game:action": (action: Action, ack: Ack<null>) => void;
  "profile:get": (token: string, ack: Ack<ProfileView & { token: string }>) => void;
  "profile:buy": (token: string, itemId: string, ack: Ack<ProfileView>) => void;
  "profile:equip": (token: string, slot: Slot, itemId: string, ack: Ack<ProfileView>) => void;
}

export interface ServerToClient {
  "room:state": (room: RoomView) => void;
}

// Actions only the server may trigger (timers, end of game)
export const SYSTEM_ACTIONS = ["OFFER_TIMEOUT", "AUCTION_CLOSE", "END_GAME"] as const;
