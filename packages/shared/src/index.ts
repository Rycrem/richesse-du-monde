import type { Action, GameMode, GameState } from "@stonks/engine";

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: LobbyPlayer[];
  game: GameState | null;
  // epoch ms when the running auction or offer times out
  deadline: number | null;
}

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;

export interface ClientToServer {
  "room:create": (name: string, ack: Ack<Session>) => void;
  "room:join": (code: string, name: string, ack: Ack<Session>) => void;
  "room:rejoin": (code: string, token: string, ack: Ack<Session>) => void;
  "room:start": (mode: GameMode, ack: Ack<null>) => void;
  "room:leave": () => void;
  "game:action": (action: Action, ack: Ack<null>) => void;
}

export interface ServerToClient {
  "room:state": (room: RoomView) => void;
}

// Actions only the server may trigger (timers, end of game)
export const SYSTEM_ACTIONS = ["OFFER_TIMEOUT", "AUCTION_CLOSE", "END_GAME"] as const;
