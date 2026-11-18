import { applyAction, createGame, type Action, type GameMode, type GameState } from "@stonks/engine";
import type { ClientToServer, RoomView, ServerToClient, Session } from "@stonks/shared";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";

const SESSION_KEY = "stonks-session";

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (private mode): reconnection after reload just won't work
  }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let socket: Socket<ServerToClient, ClientToServer> | null = null;

interface Store {
  online: boolean;
  you: string | null;
  room: RoomView | null;
  game: GameState | null;
  error: string | null;
  startLocal: (names: string[], mode: GameMode) => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  resume: () => void;
  startOnline: (mode: GameMode) => void;
  dispatch: (action: Action) => boolean;
  clearError: () => void;
  quit: () => void;
}

export const useStore = create<Store>((set, get) => {
  function connect(): Socket<ServerToClient, ClientToServer> {
    if (socket) return socket;
    socket = io({ autoConnect: true });
    socket.on("room:state", (room) => set({ room, game: room.game }));
    socket.on("connect", () => {
      // after a network drop, take our seat back automatically
      const s = loadSession();
      if (s && get().online) socket!.emit("room:rejoin", s.code, s.token, () => {});
    });
    return socket;
  }

  const onSession = (res: { ok: true; data: Session } | { ok: false; error: string }) => {
    if (!res.ok) {
      if (res.error === "Session expirée") saveSession(null);
      return set({ error: res.error });
    }
    saveSession(res.data);
    set({ online: true, you: res.data.playerId, error: null });
  };

  return {
    online: false,
    you: null,
    room: null,
    game: null,
    error: null,
    startLocal: (names, mode) =>
      set({
        online: false,
        you: null,
        room: null,
        game: createGame(
          names.map((name, i) => ({ id: `p${i + 1}`, name })),
          Math.floor(Math.random() * 2 ** 31),
          mode,
        ),
        error: null,
      }),
    createRoom: (name) => connect().emit("room:create", name, onSession),
    joinRoom: (code, name) => connect().emit("room:join", code.trim().toUpperCase(), name, onSession),
    resume: () => {
      const s = loadSession();
      if (s) connect().emit("room:rejoin", s.code, s.token, onSession);
    },
    startOnline: (mode) =>
      socket?.emit("room:start", mode, (res) => {
        if (!res.ok) set({ error: res.error });
      }),
    dispatch: (action) => {
      if (get().online) {
        socket?.emit("game:action", action, (res) => set({ error: res.ok ? null : res.error }));
        return true;
      }
      const game = get().game;
      if (!game) return false;
      const r = applyAction(game, action);
      if (!r.ok) {
        set({ error: r.error });
        return false;
      }
      set({ game: r.state, error: null });
      return true;
    },
    clearError: () => set({ error: null }),
    quit: () => {
      if (get().online) {
        socket?.emit("room:leave");
        saveSession(null);
      }
      set({ online: false, you: null, room: null, game: null, error: null });
    },
  };
});

export function hasSavedSession(): boolean {
  return loadSession() !== null;
}
