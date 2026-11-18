import { config, type GameMode } from "@stonks/engine";
import { useState } from "react";
import { PLAYER_COLORS } from "./format";
import { useStore } from "./store";

export function Setup({ solo = false }: { solo?: boolean }) {
  const startLocal = useStore((s) => s.startLocal);
  const me = useStore((s) => s.profile.account || s.profile.name || "Toi");
  const [names, setNames] = useState(solo ? [me, "Bot 1", "Bot 2"] : ["Joueur 1", "Joueur 2"]);
  const [mode, setMode] = useState<GameMode>("classique");

  return (
    <div className="card">
      <h2>Joueurs</h2>
      {names.map((n, i) => (
        <div className="row" key={i}>
          <span className="dot" style={{ background: PLAYER_COLORS[i] }} />
          <input value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
          {solo && i > 0 && <span className="chip bot">Bot</span>}
          {names.length > config.minPlayers && (!solo || i > 0) && (
            <button className="ghost" onClick={() => setNames(names.filter((_, j) => j !== i))}>
              Retirer
            </button>
          )}
        </div>
      ))}
      {names.length < config.maxPlayers && (
        <button className="ghost" onClick={() => setNames([...names, solo ? `Bot ${names.length}` : `Joueur ${names.length + 1}`])}>
          {solo ? "+ Ajouter un bot" : "+ Ajouter un joueur"}
        </button>
      )}
      <h2>Victoire</h2>
      <label className="row">
        <input type="radio" checked={mode === "classique"} onChange={() => setMode("classique")} />
        Classique : le dernier joueur non ruiné gagne
      </label>
      <label className="row">
        <input type="radio" checked={mode === "chrono"} onChange={() => setMode("chrono")} />
        Chrono : le plus riche gagne quand on arrête la partie
      </label>
      <button className="primary" disabled={names.some((n) => !n.trim())} onClick={() => startLocal(names.map((n) => n.trim()), mode, names.map((_, i) => solo && i > 0))}>
        Lancer la partie
      </button>
    </div>
  );
}
