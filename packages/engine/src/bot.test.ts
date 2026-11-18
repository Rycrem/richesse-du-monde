import { describe, expect, it } from "vitest";
import { botAction } from "./bot";
import { applyAction, createGame, rollTurnOrder, type Action } from "./game";
import type { GameState } from "./state";

// Plays a whole game with bots only; the auction timer is simulated when no bot wants to bid
function play(seed: number): { g: GameState; moves: number } {
  const ids = ["p1", "p2", "p3"];
  let g = rollTurnOrder(createGame(ids.map((id) => ({ id, name: id })), seed));
  let moves = 0;
  while (g.phase !== "gameOver" && moves < 20000) {
    const action: Action = ids.map((id) => botAction(g, id)).find((a) => a !== null) ?? { type: "AUCTION_CLOSE" };
    const r = applyAction(g, action);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    g = r.state;
    moves++;
  }
  return { g, moves };
}

describe("bots", () => {
  it("play valid moves only and finish games", () => {
    let finished = 0;
    for (let seed = 1; seed <= 10; seed++) if (play(seed).g.phase === "gameOver") finished++;
    expect(finished).toBeGreaterThan(5);
  });
});
