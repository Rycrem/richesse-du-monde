import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cosmeticById, DEFAULT_LOOK, STARTER_ITEMS, type Look, type ProfileView, type Slot } from "@stonks/shared";

interface Profile extends ProfileView {
  token: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export class Profiles {
  private profiles = new Map<string, Profile>();
  private file: string | null;

  // dir = null keeps profiles in memory only (tests)
  constructor(dir: string | null) {
    this.file = dir ? join(dir, "profiles.json") : null;
    if (!dir || !this.file) return;
    mkdirSync(dir, { recursive: true });
    try {
      for (const p of JSON.parse(readFileSync(this.file, "utf8")) as Profile[]) this.profiles.set(p.token, p);
    } catch {
      // first start: no file yet
    }
  }

  private save(): void {
    if (!this.file) return;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify([...this.profiles.values()]));
    renameSync(tmp, this.file);
  }

  private view({ name, points, owned, look }: Profile): ProfileView {
    return { name, points, owned, look };
  }

  // Unknown or empty token creates a new profile; the client keeps the returned token
  get(token: string): Profile {
    let p = this.profiles.get(token);
    if (!p) {
      p = { token: token || randomUUID(), name: "", points: 0, owned: [...STARTER_ITEMS], look: { ...DEFAULT_LOOK } };
      this.profiles.set(p.token, p);
      this.save();
    }
    return p;
  }

  fetch(token: string): Result<ProfileView & { token: string }> {
    const p = this.get(token);
    return { ok: true, data: { ...this.view(p), token: p.token } };
  }

  look(token: string): Look {
    return this.profiles.get(token)?.look ?? { ...DEFAULT_LOOK };
  }

  setName(token: string, name: string): void {
    const p = this.profiles.get(token);
    if (!p || p.name === name) return;
    p.name = name;
    this.save();
  }

  buy(token: string, itemId: string): Result<ProfileView> {
    const p = this.profiles.get(token);
    const item = cosmeticById.get(itemId);
    if (!p || !item) return { ok: false, error: "Objet inconnu" };
    if (p.owned.includes(itemId)) return { ok: false, error: "Déjà possédé" };
    if (p.points < item.price) return { ok: false, error: `Il faut ${item.price} points` };
    p.points -= item.price;
    p.owned.push(itemId);
    p.look[item.slot] = itemId;
    this.save();
    return { ok: true, data: this.view(p) };
  }

  equip(token: string, slot: Slot, itemId: string): Result<ProfileView> {
    const p = this.profiles.get(token);
    const item = cosmeticById.get(itemId);
    if (!p || !item || item.slot !== slot) return { ok: false, error: "Objet inconnu" };
    if (!p.owned.includes(itemId)) return { ok: false, error: "Objet non possédé" };
    p.look[slot] = itemId;
    this.save();
    return { ok: true, data: this.view(p) };
  }

  award(token: string, points: number): void {
    const p = this.profiles.get(token);
    if (!p) return;
    p.points += points;
    this.save();
  }
}
