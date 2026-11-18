import { config, type GameMode } from "@stonks/engine";
import { useState } from "react";
import { PLAYER_COLORS } from "./format";
import { useStore } from "./store";

export function Setup() {
  const startLocal = useStore((s) => s.startLocal);
  const [names, setNames] = useState(["Joueur 1", "Joueur 2"]);
  const [mode, setMode] = useState<GameMode>("classique");

  return (
    <div className="card">
      <h2>Joueurs</h2>
      {names.map((n, i) => (
        <div className="row" key={i}>
          <span className="dot" style={{ background: PLAYER_COLORS[i] }} />
          <input value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
          {names.length > config.minPlayers && (
            <button className="ghost" onClick={() => setNames(names.filter((_, j) => j !== i))}>
              Retirer
            </button>
          )}
        </div>
      ))}
      {names.length < config.maxPlayers && (
        <button className="ghost" onClick={() => setNames([...names, `Joueur ${names.length + 1}`])}>
          + Ajouter un joueur
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
      <button className="primary" disabled={names.some((n) => !n.trim())} onClick={() => startLocal(names.map((n) => n.trim()), mode)}>
        Lancer la partie
      </button>
    </div>
  );
}
