import { useState } from "react";
import { Setup } from "./Setup";
import { hasSavedSession, useStore } from "./store";

export function Home() {
  const { createRoom, joinRoom, resume, error } = useStore();
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState<"online" | "local">("online");
  const [name, setName] = useState("");
  const [code, setCode] = useState(params.get("code") ?? "");

  return (
    <div className="setup">
      <h1>Stonks Valley</h1>
      <p className="tagline">Achète des parts, encaisse les redevances, ruine tes amis.</p>
      <div className="tabs">
        <button className={tab === "online" ? "primary" : ""} onClick={() => setTab("online")}>
          En ligne
        </button>
        <button className={tab === "local" ? "primary" : ""} onClick={() => setTab("local")}>
          Sur cet écran
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {tab === "local" ? (
        <Setup />
      ) : (
        <div className="card">
          {hasSavedSession() && (
            <button className="primary" onClick={resume}>
              Reprendre ma partie
            </button>
          )}
          <label>
            Ton pseudo
            <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="primary" disabled={!name.trim()} onClick={() => createRoom(name)}>
            Créer une partie
          </button>
          <h3>ou rejoindre avec un code</h3>
          <div className="row">
            <input value={code} maxLength={4} placeholder="CODE" onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button disabled={!name.trim() || code.length !== 4} onClick={() => joinRoom(code, name)}>
              Rejoindre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
