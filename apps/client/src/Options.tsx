import { useEffect, useState } from "react";
import { loadSettings, play, setSettings, unlock } from "./audio";
import { useStore } from "./store";
import { applyTheme, loadTheme, THEMES } from "./theme";

// Gear button with sound and theme settings, available on every screen
export function Options() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(loadSettings);
  const [theme, setTheme] = useState(loadTheme);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const { game, room, online, quit } = useStore();
  const inGame = !!game || (online && !!room);
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => setSettings(s), [s]);
  useEffect(() => {
    const onDown = () => unlock();
    const onClick = (e: MouseEvent) => (e.target as HTMLElement).closest("button") && play("click");
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("click", onClick);
    };
  }, []);
  return (
    <div className="options">
      {open && (
        <div className="options-panel">
          <h3>Réglages</h3>
          {inGame &&
            (confirmQuit ? (
              <div className="quit-confirm">
                <small>{online ? "Tu quittes la partie en ligne." : "La partie en cours sera perdue."}</small>
                <div className="row">
                  <button
                    className="ghost"
                    onClick={() => {
                      quit();
                      setConfirmQuit(false);
                      setOpen(false);
                    }}
                  >
                    Quitter
                  </button>
                  <button onClick={() => setConfirmQuit(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmQuit(true)}>Retour au menu</button>
            ))}
          <h4>Son</h4>
          <label>
            Musique lofi
            <input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => setS({ ...s, music: Number(e.target.value) })} />
          </label>
          <label>
            Effets sonores
            <input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => setS({ ...s, sfx: Number(e.target.value) })} />
          </label>
          <label className="row">
            <input type="checkbox" checked={s.muted} onChange={(e) => setS({ ...s, muted: e.target.checked })} />
            Couper le son
          </label>
          <h4>Thème</h4>
          <div className="theme-list">
            {THEMES.map((t) => (
              <button key={t.id} className={`theme-choice ${t.id === theme ? "selected" : ""}`} onClick={() => setTheme(t.id)}>
                <span className="swatch">
                  {t.colors.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="options-btn" aria-label="Réglages" onClick={() => setOpen(!open)}>
        {s.muted ? "🔇" : "⚙"}
      </button>
    </div>
  );
}
