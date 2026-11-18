import { useEffect, useState } from "react";
import { loadSettings, play, setSettings, unlock } from "./audio";

// Gear button with sound settings, available on every screen
export function Options() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(loadSettings);
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
          <h3>Options</h3>
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
        </div>
      )}
      <button className="options-btn" aria-label="Options" onClick={() => setOpen(!open)}>
        {s.muted ? "🔇" : "⚙"}
      </button>
    </div>
  );
}
