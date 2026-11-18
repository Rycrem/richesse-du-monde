import { cosmeticById, type Look } from "@stonks/shared";

// SVG pawn, 100 x 160, feet at the bottom center. One source for the garage, lobby and board.
const LEGS: Record<string, (c: string) => string> = {
  "legs-droites": (c) =>
    `<rect x="37" y="118" width="10" height="32" rx="4" fill="${c}"/><rect x="53" y="118" width="10" height="32" rx="4" fill="${c}"/>` +
    `<ellipse cx="41" cy="151" rx="9" ry="5" fill="#222"/><ellipse cx="59" cy="151" rx="9" ry="5" fill="#222"/>`,
  "legs-baskets": (c) =>
    `<rect x="37" y="118" width="10" height="30" rx="4" fill="#3d5a80"/><rect x="53" y="118" width="10" height="30" rx="4" fill="#3d5a80"/>` +
    `<rect x="30" y="145" width="20" height="10" rx="5" fill="${c}"/><rect x="50" y="145" width="20" height="10" rx="5" fill="${c}"/>` +
    `<path d="M34 150h12M54 150h12" stroke="#ef476f" stroke-width="3"/>`,
  "legs-roues": (c) =>
    `<rect x="46" y="118" width="8" height="22" fill="#6c757d"/><rect x="30" y="136" width="40" height="6" rx="3" fill="#6c757d"/>` +
    `<circle cx="34" cy="148" r="9" fill="${c}"/><circle cx="66" cy="148" r="9" fill="${c}"/><circle cx="34" cy="148" r="3" fill="#ddd"/><circle cx="66" cy="148" r="3" fill="#ddd"/>`,
  "legs-ressort": (c) =>
    `<polyline points="50,118 38,124 62,130 38,136 62,142 38,148 50,152" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>` +
    `<rect x="34" y="150" width="32" height="6" rx="3" fill="#495057"/>`,
  "legs-fusee": (c) =>
    `<path d="M40 136 L50 160 L60 136 Z" fill="#ffd166"/><path d="M44 136 L50 152 L56 136 Z" fill="#ef476f"/>` +
    `<rect x="38" y="116" width="24" height="22" rx="4" fill="${c}"/><rect x="38" y="132" width="24" height="5" fill="#495057"/>`,
};

const BODY: Record<string, (c: string) => string> = {
  "body-tshirt": (c) =>
    `<rect x="22" y="86" width="12" height="22" rx="6" fill="${c}"/><rect x="66" y="86" width="12" height="22" rx="6" fill="${c}"/>` +
    `<rect x="30" y="82" width="40" height="40" rx="10" fill="${c}"/>`,
  "body-hoodie": (c) =>
    `<rect x="22" y="86" width="12" height="24" rx="6" fill="${c}"/><rect x="66" y="86" width="12" height="24" rx="6" fill="${c}"/>` +
    `<rect x="30" y="82" width="40" height="42" rx="10" fill="${c}"/><rect x="38" y="104" width="24" height="12" rx="4" fill="#00000033"/>` +
    `<path d="M45 84v12M55 84v12" stroke="#fff" stroke-width="2"/>`,
  "body-costume": (c) =>
    `<rect x="22" y="86" width="12" height="24" rx="6" fill="${c}"/><rect x="66" y="86" width="12" height="24" rx="6" fill="${c}"/>` +
    `<rect x="30" y="82" width="40" height="42" rx="8" fill="${c}"/><path d="M42 82 L50 100 L58 82 Z" fill="#fff"/>` +
    `<path d="M50 88 L46 96 L50 112 L54 96 Z" fill="#d62828"/>`,
  "body-robot": (c) =>
    `<rect x="20" y="88" width="12" height="8" fill="${c}"/><rect x="68" y="88" width="12" height="8" fill="${c}"/>` +
    `<rect x="28" y="82" width="44" height="40" rx="3" fill="${c}" stroke="#495057" stroke-width="2"/>` +
    `<circle cx="40" cy="96" r="4" fill="#06d6a0"/><circle cx="52" cy="96" r="4" fill="#ef476f"/><rect x="36" y="106" width="28" height="6" fill="#495057"/>`,
  "body-or": (c) =>
    `<rect x="22" y="86" width="12" height="24" rx="6" fill="${c}"/><rect x="66" y="86" width="12" height="24" rx="6" fill="${c}"/>` +
    `<rect x="30" y="82" width="40" height="42" rx="8" fill="${c}" stroke="#b08900" stroke-width="2"/>` +
    `<text x="50" y="112" font-family="Arial" font-weight="900" font-size="22" fill="#b08900" text-anchor="middle">$</text>` +
    `<path d="M34 88 l6 0 l-4 10z" fill="#fff8"/>`,
};

const eyes = `<circle cx="42" cy="58" r="3.5" fill="#222"/><circle cx="58" cy="58" r="3.5" fill="#222"/>`;
const HEAD: Record<string, (c: string) => string> = {
  "head-rond": (c) => `<circle cx="50" cy="60" r="22" fill="${c}"/>${eyes}<path d="M42 68 q8 7 16 0" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  "head-carre": (c) => `<rect x="28" y="38" width="44" height="44" rx="8" fill="${c}"/>${eyes}<rect x="42" y="68" width="16" height="4" rx="2" fill="#222"/>`,
  "head-smiley": (c) =>
    `<circle cx="50" cy="60" r="22" fill="${c}"/>${eyes}<path d="M38 64 q12 16 24 0z" fill="#222"/>` +
    `<path d="M30 46 l8 -6" stroke="#06d6a0" stroke-width="3"/>`,
  "head-chat": (c) =>
    `<path d="M30 48 L34 30 L46 42 Z M70 48 L66 30 L54 42 Z" fill="${c}"/><circle cx="50" cy="60" r="22" fill="${c}"/>` +
    `${eyes}<path d="M47 66 l3 3 l3 -3z" fill="#ef476f"/><path d="M30 66h12M30 70h12M58 66h12M58 70h12" stroke="#555" stroke-width="1.5"/>`,
  "head-alien": (c) =>
    `<ellipse cx="50" cy="58" rx="20" ry="26" fill="${c}"/><ellipse cx="41" cy="58" rx="7" ry="10" fill="#111" transform="rotate(-20 41 58)"/>` +
    `<ellipse cx="59" cy="58" rx="7" ry="10" fill="#111" transform="rotate(20 59 58)"/>`,
  "head-robot": (c) =>
    `<rect x="28" y="38" width="44" height="44" rx="4" fill="${c}" stroke="#495057" stroke-width="2"/>` +
    `<rect x="33" y="52" width="34" height="12" rx="6" fill="#3dd6d0"/><rect x="40" y="70" width="20" height="4" fill="#495057"/>`,
};

const HAT: Record<string, (c: string) => string> = {
  "hat-none": () => "",
  "hat-casquette": (c) => `<path d="M28 44 a22 18 0 0 1 44 0 z" fill="${c}"/><rect x="60" y="40" width="22" height="6" rx="3" fill="${c}"/>`,
  "hat-beret": (c) => `<ellipse cx="46" cy="40" rx="26" ry="9" fill="${c}" transform="rotate(-10 46 40)"/><rect x="46" y="27" width="3" height="6" fill="${c}"/>`,
  "hat-antenne": (c) =>
    `<path d="M42 40 L36 20 M58 40 L64 20" stroke="#495057" stroke-width="3"/><circle cx="36" cy="18" r="4" fill="${c}"/><circle cx="64" cy="18" r="4" fill="${c}"/>` +
    `<path d="M42 12 q8 -8 16 0 M45 16 q5 -5 10 0" stroke="${c}" stroke-width="3" fill="none"/>`,
  "hat-haut-de-forme": (c) =>
    `<rect x="34" y="6" width="32" height="32" rx="2" fill="${c}"/><rect x="34" y="28" width="32" height="5" fill="#d62828"/><rect x="24" y="36" width="52" height="6" rx="3" fill="${c}"/>`,
  "hat-casque-vr": (c) =>
    `<rect x="26" y="50" width="48" height="16" rx="6" fill="${c}"/><rect x="30" y="54" width="40" height="8" rx="4" fill="#3dd6d0" opacity=".7"/>` +
    `<path d="M28 50 q22 -22 44 0" stroke="${c}" stroke-width="5" fill="none"/>`,
  "hat-couronne": (c) =>
    `<path d="M30 42 L30 20 L40 32 L50 14 L60 32 L70 20 L70 42 Z" fill="${c}" stroke="#b08900" stroke-width="2"/>` +
    `<circle cx="50" cy="34" r="3" fill="#ef476f"/><circle cx="38" cy="37" r="2.5" fill="#118ab2"/><circle cx="62" cy="37" r="2.5" fill="#118ab2"/>`,
};

function part(table: Record<string, (c: string) => string>, id: string): string {
  return table[id]?.(cosmeticById.get(id)?.color ?? "#999") ?? "";
}

export function pawnSvg(look: Look, playerColor: string, size = 100): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="${size}" height="${size * 1.6}">` +
    `<ellipse cx="50" cy="154" rx="34" ry="6" fill="${playerColor}" stroke="#1b1b1b" stroke-width="2"/>` +
    part(LEGS, look.legs) +
    part(BODY, look.body) +
    part(HEAD, look.head) +
    part(HAT, look.hat) +
    `</svg>`
  );
}

export function pawnDataUrl(look: Look, playerColor: string, size = 100): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pawnSvg(look, playerColor, size))}`;
}
