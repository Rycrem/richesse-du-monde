import { config, STARTING_CASH_OPTIONS, type GameMode } from "@stonks/engine";
import type { RoomView } from "@stonks/shared";
import { useState } from "react";
import { money, PLAYER_COLORS } from "./format";
import { Garage } from "./Garage";
import { pawnDataUrl } from "./pawn";
import { useStore } from "./store";

export function Lobby({ room }: { room: RoomView }) {
  const { you, startOnline, quit, kick, error } = useStore();
  const [mode, setMode] = useState<GameMode>("classique");
  const [cash, setCash] = useState(config.startingCash);
  const [garage, setGarage] = useState(false);
  const link = `${location.origin}/?code=${room.code}`;
  const isHost = you === room.hostId;
  const myIndex = room.players.findIndex((p) => p.id === you);
  if (garage) return <Garage color={PLAYER_COLORS[myIndex] ?? PLAYER_COLORS[0]!} onClose={() => setGarage(false)} />;

  return (
    <div className="setup lobby">
      <h1 className="logo">Stonks Valley</h1>
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
            <img className="lobby-pawn" src={pawnDataUrl(p.look, PLAYER_COLORS[i]!, 28)} alt="" />
            {p.name}
            {p.id === room.hostId && <small>(hôte)</small>}
            {p.id === you && <small>(toi)</small>}
            {isHost && p.id !== you && (
              <>
                <span className="spacer" />
                <button className="ghost kick-btn" onClick={() => confirm(`Exclure ${p.name} du salon ?`) && kick(p.id)}>
                  Exclure
                </button>
              </>
            )}
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
            <label className="row cash-pick">
              Argent de départ
              <select value={cash} onChange={(e) => setCash(Number(e.target.value))}>
                {STARTING_CASH_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {money(v)}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={room.players.length < config.minPlayers} onClick={() => startOnline(mode, cash)}>
              Lancer la partie
            </button>
          </>
        ) : (
          <p className="muted">En attente du lancement par l'hôte...</p>
        )}
        <button onClick={() => setGarage(true)}>Modifier mon pion</button>
        <button className="ghost" onClick={quit}>
          Quitter
        </button>
      </div>
    </div>
  );
}
