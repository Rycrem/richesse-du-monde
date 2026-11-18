import { COSMETICS, cosmeticById, SLOTS, type Look, type Slot } from "@stonks/shared";
import { useEffect, useState } from "react";
import { pawnDataUrl } from "./pawn";
import { useStore } from "./store";

export function Garage({ onClose, color }: { onClose: () => void; color: string }) {
  const { profile, loadProfile, buy, equip, error } = useStore();
  const [slot, setSlot] = useState<Slot>("hat");
  const items = COSMETICS.filter((c) => c.slot === slot);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  useEffect(() => setIndex(Math.max(0, items.findIndex((c) => c.id === profile.look[slot]))), [slot]);

  const item = items[index]!;
  const preview: Look = { ...profile.look, [slot]: item.id };
  const owned = profile.owned.includes(item.id);
  const equipped = profile.look[slot] === item.id;
  const move = (d: number) => setIndex((index + d + items.length) % items.length);

  return (
    <div className="garage">
      <header className="row">
        <h1>Mon pion</h1>
        <span className="spacer" />
        <span className="points">{profile.points} pts</span>
      </header>
      <div className="garage-main">
        <nav className="slots">
          {SLOTS.map((s) => (
            <button key={s.slot} className={s.slot === slot ? "primary" : ""} onClick={() => setSlot(s.slot)}>
              <img src={pawnDataUrl({ ...profile.look, [s.slot]: profile.look[s.slot] }, color, 24)} alt="" className="slot-icon" />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="stage">
          <button className="arrow" onClick={() => move(-1)} aria-label="Précédent">
            {"<"}
          </button>
          <div className="podium">
            <img key={item.id} className="pop" src={pawnDataUrl(preview, color, 180)} alt={item.name} />
          </div>
          <button className="arrow" onClick={() => move(1)} aria-label="Suivant">
            {">"}
          </button>
        </div>
        <div className="item-info">
          <h2>{item.name}</h2>
          {equipped ? (
            <p className="muted">Équipé</p>
          ) : owned ? (
            <button className="primary" onClick={() => equip(slot, item.id)}>
              Équiper
            </button>
          ) : (
            <button className="primary" disabled={profile.points < item.price} onClick={() => buy(item.id)}>
              Acheter {item.price} pts
            </button>
          )}
          {!owned && profile.points < item.price && <p className="muted">Il te manque {item.price - profile.points} pts</p>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
      <div className="thumbs">
        {items.map((c, i) => (
          <button key={c.id} className={`thumb ${i === index ? "selected" : ""} ${profile.owned.includes(c.id) ? "" : "locked"}`} onClick={() => setIndex(i)}>
            <img src={pawnDataUrl({ ...profile.look, [slot]: c.id }, color, 48)} alt="" />
            <small>{profile.owned.includes(c.id) ? cosmeticById.get(c.id)!.name : `${c.price} pts`}</small>
          </button>
        ))}
      </div>
      <p className="muted">
        Gagne des points en jouant en ligne : tout le monde en reçoit selon son classement, et le vainqueur en gagne assez pour s'offrir un objet.
      </p>
      <button className="ghost" onClick={onClose}>
        Retour
      </button>
    </div>
  );
}
