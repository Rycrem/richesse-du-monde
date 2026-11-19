import { useEffect, useState } from "react";
import { Account, ResetPassword } from "./Account";
import { Admin } from "./Admin";
import { PLAYER_COLORS } from "./format";
import { Garage } from "./Garage";
import { Install } from "./Install";
import { pawnDataUrl } from "./pawn";
import { Setup } from "./Setup";
import { hasSavedSession, useStore } from "./store";

const MODES = [
  { id: "online", icon: "🌐", title: "En ligne", text: "Avec tes amis, chacun sur son appareil" },
  { id: "local", icon: "📱", title: "Sur cet écran", text: "À plusieurs sur le même appareil" },
  { id: "solo", icon: "🤖", title: "Solo", text: "Seul contre des bots" },
] as const;

export function Home() {
  const { createRoom, joinRoom, resume, error, notice, profile, loadProfile } = useStore();
  const [garage, setGarage] = useState(false);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState<"online" | "local" | "solo">("online");
  const [name, setName] = useState("");
  const [code, setCode] = useState(params.get("code") ?? "");
  const [resetToken, setResetToken] = useState(params.get("reset"));
  const [showLogin, setShowLogin] = useState(false);
  useEffect(() => {
    if (profile.account) setName(profile.account);
    else if (profile.name && !name) setName(profile.name);
  }, [profile.name, profile.account]);

  if (garage) return <Garage color={PLAYER_COLORS[0]!} onClose={() => setGarage(false)} />;
  if (admin && profile.admin) return <Admin onClose={() => setAdmin(false)} />;

  return (
    <div className="setup home">
      <header className="hero">
        <h1 className="logo">Stonks Valley</h1>
        <p className="tagline">Achète des parts, encaisse les redevances, ruine tes amis.</p>
      </header>
      <Install />
      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <section className="home-section">
        <div className="profile-strip">
          <button className="my-pawn" onClick={() => setGarage(true)}>
            <img src={pawnDataUrl(profile.look, PLAYER_COLORS[0]!, 40)} alt="" />
            <span>
              <strong>Mon pion</strong>
              <small>{profile.points} pts</small>
            </span>
          </button>
          {!profile.account && !resetToken && (
            <button className={showLogin ? "primary" : ""} onClick={() => setShowLogin(!showLogin)}>
              {showLogin ? "Fermer" : "Se connecter"}
            </button>
          )}
        </div>
        {!profile.account && !resetToken && !showLogin && <p className="hint">Connecte-toi pour garder tes points et tes objets d'une partie à l'autre.</p>}
        {resetToken ? (
          <ResetPassword
            resetToken={resetToken}
            onDone={() => {
              setResetToken(null);
              history.replaceState(null, "", "/");
            }}
          />
        ) : (
          (profile.account || showLogin) && <Account onAdmin={() => setAdmin(true)} />
        )}
      </section>

      <section className="home-section">
        <h2>Comment veux-tu jouer ?</h2>
        <div className="modes">
          {MODES.map((m) => (
            <button key={m.id} className={`mode ${tab === m.id ? "primary" : ""}`} onClick={() => setTab(m.id)}>
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-text">
                <strong>{m.title}</strong>
                <small>{m.text}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      {tab !== "online" ? (
        <Setup key={tab} solo={tab === "solo"} />
      ) : (
        <div className="card">
          {hasSavedSession() && (
            <button className="primary" onClick={resume}>
              Reprendre ma partie
            </button>
          )}
          <label>
            Ton pseudo
            <input value={name} maxLength={20} disabled={!!profile.account} onChange={(e) => setName(e.target.value)} />
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
