import { applyAction, createGame, type Action, type GameMode, type GameState } from "@stonks/engine";
import { DEFAULT_LOOK, STARTER_ITEMS, type ClientToServer, type Look, type ProfileView, type RoomView, type ServerToClient, type Session, type Slot } from "@stonks/shared";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";

const SESSION_KEY = "stonks-session";
const PROFILE_KEY = "stonks-profile";

function profileToken(): string {
  try {
    return localStorage.getItem(PROFILE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveProfileToken(token: string) {
  try {
    localStorage.setItem(PROFILE_KEY, token);
  } catch {
    // storage unavailable: the profile only lives for this visit
  }
}

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
  profile: ProfileView;
  loadProfile: () => void;
  buy: (itemId: string) => void;
  equip: (slot: Slot, itemId: string) => void;
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
    socket.on("room:state", (room) => {
      // ignore late updates from a room we just left
      if (get().online) set({ room, game: room.game });
    });
    socket.on("connect", () => {
      // after a network drop, take our seat back automatically
      const s = loadSession();
      if (s && get().online) socket!.emit("room:rejoin", s.code, s.token, () => {});
    });
    return socket;
  }

  const onProfile = (res: { ok: true; data: ProfileView } | { ok: false; error: string }) => {
    if (res.ok) set({ profile: { name: res.data.name, points: res.data.points, owned: res.data.owned, look: res.data.look }, error: null });
    else set({ error: res.error });
  };

  const onSession = (res: { ok: true; data: Session } | { ok: false; error: string }) => {
    if (!res.ok) {
      if (res.error === "Session expirée") saveSession(null);
      return set({ online: false, error: res.error });
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
    profile: { name: "", points: 0, owned: STARTER_ITEMS, look: DEFAULT_LOOK as Look },
    loadProfile: () =>
      connect().emit("profile:get", profileToken(), (res) => {
        if (res.ok) saveProfileToken(res.data.token);
        onProfile(res);
      }),
    buy: (itemId) => connect().emit("profile:buy", profileToken(), itemId, onProfile),
    equip: (slot, itemId) => connect().emit("profile:equip", profileToken(), slot, itemId, onProfile),
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
    createRoom: (name) => {
      set({ online: true });
      connect().emit("room:create", name, profileToken(), onSession);
    },
    joinRoom: (code, name) => {
      set({ online: true });
      connect().emit("room:join", code.trim().toUpperCase(), name, profileToken(), onSession);
    },
    resume: () => {
      const s = loadSession();
      if (!s) return;
      set({ online: true });
      connect().emit("room:rejoin", s.code, s.token, onSession);
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
