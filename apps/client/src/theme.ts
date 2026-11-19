export const THEMES = [
  { id: "cyberpunk", name: "Cyberpunk", colors: ["#07060d", "#ff2a6d", "#05d9e8", "#f9f002"] },
  { id: "terminal", name: "Terminal de bourse", colors: ["#070d14", "#00e5a0", "#ff4d6d", "#ffd166"] },
  { id: "pop", name: "Pop cartoon", colors: ["#fff6e6", "#1a1a2e", "#06d6a0", "#ef476f"] },
  { id: "journal", name: "Journal financier", colors: ["#f3ecdc", "#161310", "#b3261e", "#1f6b45"] },
  { id: "os", name: "Stonks OS", colors: ["#2a7d7b", "#c3c3c3", "#0a246a", "#ffffff"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const KEY = "stonks-theme";

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {}
  return "cyberpunk";
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES.find((t) => t.id === id)!.colors[0]);
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}
