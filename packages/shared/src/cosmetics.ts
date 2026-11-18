export type Slot = "hat" | "head" | "body" | "legs";

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  color: string;
  // drawn like another item, in this item's color
  shape?: string;
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
  { id: "hat-casquette-bleue", slot: "hat", name: "Casquette bleue", price: 0, color: "#118ab2", shape: "hat-casquette" },
  { id: "hat-bonnet", slot: "hat", name: "Bonnet", price: 0, color: "#06d6a0" },
  { id: "hat-bandeau", slot: "hat", name: "Bandeau", price: 0, color: "#ffd166" },
  { id: "hat-antenne", slot: "hat", name: "Antenne wifi", price: 120, color: "#06d6a0" },
  { id: "hat-haut-de-forme", slot: "hat", name: "Haut-de-forme", price: 150, color: "#1b1b1b" },
  { id: "hat-casque-vr", slot: "hat", name: "Casque VR", price: 200, color: "#9b5de5" },
  { id: "hat-casque-audio", slot: "hat", name: "Casque audio", price: 220, color: "#ef476f" },
  { id: "hat-couronne", slot: "hat", name: "Couronne de PDG", price: 300, color: "#ffd166" },
  { id: "hat-aureole", slot: "hat", name: "Auréole licorne", price: 350, color: "#ffe66d" },

  { id: "head-rond", slot: "head", name: "Classique", price: 0, color: "#ffd6a5" },
  { id: "head-carre", slot: "head", name: "Carrée", price: 0, color: "#f4a261" },
  { id: "head-smiley", slot: "head", name: "Stonks", price: 0, color: "#ffe66d" },
  { id: "head-rond-fonce", slot: "head", name: "Classique foncée", price: 0, color: "#8d5524", shape: "head-rond" },
  { id: "head-lunettes", slot: "head", name: "Geek à lunettes", price: 0, color: "#e0ac69" },
  { id: "head-chat", slot: "head", name: "Chat", price: 120, color: "#adb5bd" },
  { id: "head-alien", slot: "head", name: "Alien", price: 150, color: "#80ed99" },
  { id: "head-robot", slot: "head", name: "Robot", price: 200, color: "#8d99ae" },
  { id: "head-pixel", slot: "head", name: "Pixel", price: 220, color: "#ff99c8" },
  { id: "head-diamant", slot: "head", name: "Diamant", price: 350, color: "#a0e7ff" },

  { id: "body-tshirt", slot: "body", name: "T-shirt", price: 0, color: "#118ab2" },
  { id: "body-hoodie", slot: "body", name: "Hoodie de dev", price: 0, color: "#6c757d" },
  { id: "body-tshirt-rouge", slot: "body", name: "T-shirt rouge", price: 0, color: "#ef476f", shape: "body-tshirt" },
  { id: "body-hoodie-violet", slot: "body", name: "Hoodie violet", price: 0, color: "#7b2cbf", shape: "body-hoodie" },
  { id: "body-chemise", slot: "body", name: "Chemise à carreaux", price: 0, color: "#d62828" },
  { id: "body-costume", slot: "body", name: "Costume", price: 150, color: "#22223b" },
  { id: "body-robot", slot: "body", name: "Châssis robot", price: 200, color: "#8d99ae" },
  { id: "body-blouse", slot: "body", name: "Blouse de labo", price: 220, color: "#f8f9fa" },
  { id: "body-or", slot: "body", name: "Costume en or", price: 300, color: "#ffd166" },
  { id: "body-neon", slot: "body", name: "Veste néon", price: 350, color: "#3dd6d0" },

  { id: "legs-droites", slot: "legs", name: "Jambes", price: 0, color: "#264653" },
  { id: "legs-baskets", slot: "legs", name: "Baskets", price: 0, color: "#e9ecef" },
  { id: "legs-jean", slot: "legs", name: "Jean", price: 0, color: "#3d5a80", shape: "legs-droites" },
  { id: "legs-baskets-rouges", slot: "legs", name: "Baskets rouges", price: 0, color: "#ef476f", shape: "legs-baskets" },
  { id: "legs-short", slot: "legs", name: "Short", price: 0, color: "#f4a261" },
  { id: "legs-roues", slot: "legs", name: "Roulettes", price: 120, color: "#343a40" },
  { id: "legs-ressort", slot: "legs", name: "Ressort", price: 150, color: "#adb5bd" },
  { id: "legs-skate", slot: "legs", name: "Skate", price: 200, color: "#9b5de5" },
  { id: "legs-fusee", slot: "legs", name: "Réacteur", price: 250, color: "#f77f00" },
  { id: "legs-hover", slot: "legs", name: "Hoverboard", price: 350, color: "#3dd6d0" },
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
