import { config, type GameMode } from "@stonks/engine";
import type { RoomView } from "@stonks/shared";
import { useState } from "react";
import { PLAYER_COLORS } from "./format";
import { useStore } from "./store";

export function Lobby({ room }: { room: RoomView }) {
  const { you, startOnline, quit, error } = useStore();
  const [mode, setMode] = useState<GameMode>("classique");
  const link = `${location.origin}/?code=${room.code}`;
  const isHost = you === room.hostId;

  return (
    <div className="setup">
      <h1>Stonks Valley</h1>
      <div className="card">
        <h2>
          Code de la partie : <span className="code">{room.code}</span>
        </h2>
        <div className="row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button onClick={() => navigator.clipboard?.writeText(link)}>Copier le lien</button>
        </div>
        <h3>
          Joueurs ({room.players.length}/{config.maxPlayers})
        </h3>
        {room.players.map((p, i) => (
          <div className="row" key={p.id}>
            <span className="dot" style={{ background: PLAYER_COLORS[i] }} />
            {p.name}
            {p.id === room.hostId && <small>(hôte)</small>}
            {p.id === you && <small>(toi)</small>}
          </div>
        ))}
        {error && <div className="error">{error}</div>}
        {isHost ? (
          <>
            <label className="row">
              <input type="radio" checked={mode === "classique"} onChange={() => setMode("classique")} />
              Classique : le dernier joueur non ruiné gagne
            </label>
            <label className="row">
              <input type="radio" checked={mode === "chrono"} onChange={() => setMode("chrono")} />
              Chrono : le plus riche gagne quand l'hôte arrête la partie
            </label>
            <button className="primary" disabled={room.players.length < config.minPlayers} onClick={() => startOnline(mode)}>
              Lancer la partie
            </button>
          </>
        ) : (
          <p className="muted">En attente du lancement par l'hôte...</p>
        )}
        <button className="ghost" onClick={quit}>
          Quitter
        </button>
      </div>
    </div>
  );
}
