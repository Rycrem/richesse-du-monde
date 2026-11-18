export type Slot = "hat" | "head" | "body" | "legs";

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  color: string;
}

export type Look = Record<Slot, string>;

export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "hat", label: "Chapeau" },
  { slot: "head", label: "Tête" },
  { slot: "body", label: "Corps" },
  { slot: "legs", label: "Jambes" },
];

export const COSMETICS: Cosmetic[] = [
  { id: "hat-none", slot: "hat", name: "Rien", price: 0, color: "#000000" },
  { id: "hat-casquette", slot: "hat", name: "Casquette", price: 0, color: "#ef476f" },
  { id: "hat-beret", slot: "hat", name: "Béret", price: 0, color: "#3a3a3a" },
  { id: "hat-antenne", slot: "hat", name: "Antenne wifi", price: 120, color: "#06d6a0" },
  { id: "hat-haut-de-forme", slot: "hat", name: "Haut-de-forme", price: 150, color: "#1b1b1b" },
  { id: "hat-casque-vr", slot: "hat", name: "Casque VR", price: 200, color: "#9b5de5" },
  { id: "hat-couronne", slot: "hat", name: "Couronne de PDG", price: 300, color: "#ffd166" },

  { id: "head-rond", slot: "head", name: "Classique", price: 0, color: "#ffd6a5" },
  { id: "head-carre", slot: "head", name: "Carrée", price: 0, color: "#f4a261" },
  { id: "head-smiley", slot: "head", name: "Stonks", price: 0, color: "#ffe66d" },
  { id: "head-chat", slot: "head", name: "Chat", price: 120, color: "#adb5bd" },
  { id: "head-alien", slot: "head", name: "Alien", price: 150, color: "#80ed99" },
  { id: "head-robot", slot: "head", name: "Robot", price: 200, color: "#8d99ae" },

  { id: "body-tshirt", slot: "body", name: "T-shirt", price: 0, color: "#118ab2" },
  { id: "body-hoodie", slot: "body", name: "Hoodie de dev", price: 0, color: "#6c757d" },
  { id: "body-costume", slot: "body", name: "Costume", price: 150, color: "#22223b" },
  { id: "body-robot", slot: "body", name: "Châssis robot", price: 200, color: "#8d99ae" },
  { id: "body-or", slot: "body", name: "Costume en or", price: 300, color: "#ffd166" },

  { id: "legs-droites", slot: "legs", name: "Jambes", price: 0, color: "#264653" },
  { id: "legs-baskets", slot: "legs", name: "Baskets", price: 0, color: "#e9ecef" },
  { id: "legs-roues", slot: "legs", name: "Roulettes", price: 120, color: "#343a40" },
  { id: "legs-ressort", slot: "legs", name: "Ressort", price: 150, color: "#adb5bd" },
  { id: "legs-fusee", slot: "legs", name: "Réacteur", price: 250, color: "#f77f00" },
];

export const cosmeticById = new Map(COSMETICS.map((c) => [c.id, c]));

export const DEFAULT_LOOK: Look = { hat: "hat-none", head: "head-rond", body: "body-tshirt", legs: "legs-droites" };

export const STARTER_ITEMS = COSMETICS.filter((c) => c.price === 0).map((c) => c.id);

// Points by final rank (index 0 = winner). Only the winner earns enough for the cheapest paid item.
export const RANK_POINTS = [120, 60, 40, 30, 20, 15];

export function pointsForRank(rank: number): number {
  return RANK_POINTS[rank] ?? RANK_POINTS[RANK_POINTS.length - 1]!;
}

export function isValidLook(look: unknown): look is Look {
  if (!look || typeof look !== "object") return false;
  return SLOTS.every(({ slot }) => cosmeticById.get((look as Record<string, string>)[slot]!)?.slot === slot);
}
