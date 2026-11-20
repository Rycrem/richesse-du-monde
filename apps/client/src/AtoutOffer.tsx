import { atoutById, currentPlayer, type GameState } from "@stonks/engine";
import { useEffect, useState } from "react";
import { useStore } from "./store";

// Landing on an Atout cell: once the pawn has arrived, offer the card in a popup
export function AtoutOffer({ game }: { game: GameState }) {
  const { dispatch, you, bots } = useStore();
  const me = currentPlayer(game);
  const turn = Math.max(0, ...game.events.filter((e) => e.kind === "roll").map((e) => e.id));
  const open = game.canBuyAtout && game.phase === "act" && !game.offer && (you === null || you === me.id) && !bots.includes(me.id);
  const [shown, setShown] = useState<number | null>(null);
  const [closed, setClosed] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return setShown(null);
    const t = setTimeout(() => setShown(turn), 2200);
    return () => clearTimeout(t);
  }, [open, turn]);
  if (!open || shown !== turn || closed === turn) return null;
  const card = atoutById.get(game.atoutCard ?? "bouclier")!;
  return (
    <div className="atout-offer">
      <div className="event-card">
        <div className="head" style={{ background: "#e8b93a" }}>
          <span className="icon">⭐</span>
          ATOUT
        </div>
        <div className="body">
          <div className="text">
            {card.name} : le prendre gratuitement ?
          </div>
          <div className="sub">
            {card.text}
            {me.atouts.length > 0 && ` Tu as déjà ${me.atouts.map((a) => atoutById.get(a)!.name).join(", ")}.`}
          </div>
          <div className="atout-actions">
            <button onClick={() => setClosed(turn)}>Non merci</button>
            <button className="primary" onClick={() => dispatch({ type: "BUY_ATOUT", playerId: me.id }) && setClosed(turn)}>
              Prendre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
