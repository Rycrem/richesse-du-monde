import { applyAction, createGame, type Action, type GameMode, type GameState } from "@stonks/engine";
import { create } from "zustand";

interface Store {
  game: GameState | null;
  error: string | null;
  start: (names: string[], mode: GameMode) => void;
  dispatch: (action: Action) => boolean;
  clearError: () => void;
  quit: () => void;
}

export const useStore = create<Store>((set, get) => ({
  game: null,
  error: null,
  start: (names, mode) =>
    set({
      game: createGame(
        names.map((name, i) => ({ id: `p${i + 1}`, name })),
        Math.floor(Math.random() * 2 ** 31),
        mode,
      ),
      error: null,
    }),
  dispatch: (action) => {
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
  quit: () => set({ game: null, error: null }),
}));
