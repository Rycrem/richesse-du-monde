import { config, currentPlayer, type GameState } from "@stonks/engine";
import { useEffect, useState } from "react";
import { money } from "./format";
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
  const short = me.cash < config.atoutPrice;
  return (
    <div className="atout-offer">
      <div className="event-card">
        <div className="head" style={{ background: "#e8b93a" }}>
          <span className="icon">⭐</span>
          ATOUT
        </div>
        <div className="body">
          <div className="text">Acheter un Atout pour {money(config.atoutPrice)} ?</div>
          <div className="sub">Il annule la prochaine enchère forcée sur tes actions.{me.atouts > 0 && ` Tu en as déjà ${me.atouts}.`}</div>
          {short && <div className="sub minus">Pas assez d'argent ({money(me.cash)})</div>}
          <div className="atout-actions">
            <button onClick={() => setClosed(turn)}>Non merci</button>
            <button className="primary" disabled={short} onClick={() => dispatch({ type: "BUY_ATOUT", playerId: me.id }) && setClosed(turn)}>
              Acheter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
