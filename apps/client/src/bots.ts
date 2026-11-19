import { board, botAction, type GameState } from "@stonks/engine";
import { useEffect } from "react";
import { useStore } from "./store";

// Solo games: plays the bots' moves one at a time, slow enough to follow the dice, the pawn and the cards
export function useBots(game: GameState | null) {
  const bots = useStore((s) => s.bots);
  const dispatch = useStore((s) => s.dispatch);
  useEffect(() => {
    if (!game || !bots.length) return;
    for (const id of bots) {
      const action = botAction(game, id);
      if (!action) continue;
      const last = game.events.at(-1);
      let delay = 1400;
      // a bankruptcy just ended a turn: leave time to read it before the next player moves
      if (last?.kind === "bankrupt") delay = 5000;
      else if (action.type === "BID") delay = 1500 + Math.random() * 3500;
      else if (last?.kind === "roll" && game.phase === "act" && last.playerId === id && game.boughtThisTurn === 0) {
        delay = 2500 + ((last.to - last.from + board.length) % board.length) * 240;
      }
      const t = setTimeout(() => dispatch(action), delay);
      return () => clearTimeout(t);
    }
  }, [game, bots, dispatch]);
}
