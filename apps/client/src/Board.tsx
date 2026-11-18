import { board, regions, type GameState } from "@stonks/engine";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useEffect, useRef } from "react";
import type { Look } from "@stonks/shared";
import { companyById, PLAYER_COLORS } from "./format";
import { pawnDataUrl } from "./pawn";
import { cellGrid, SIDE, TILE_H, TILE_W, toScreen } from "./iso";

const regionColor = new Map(regions.map((r) => [r.id, r.color]));
const logos = new Map<string, Texture>();
const pawns = new Map<string, Texture>();

async function loadPawns(looks: Look[]): Promise<boolean> {
  let added = false;
  await Promise.all(
    looks.map(async (look, i) => {
      const key = `${i}:${JSON.stringify(look)}`;
      if (pawns.has(key)) return;
      const img = new Image();
      img.src = pawnDataUrl(look, PLAYER_COLORS[i]!, 120);
      await img.decode();
      pawns.set(key, Texture.from(img));
      added = true;
    }),
  );
  return added;
}

function pawnTexture(look: Look, i: number): Texture | undefined {
  return pawns.get(`${i}:${JSON.stringify(look)}`);
}

async function loadLogos() {
  await Promise.all(
    [...companyById.keys()].map(async (id) => {
      if (!logos.has(id)) logos.set(id, await Assets.load<Texture>({ src: `/logos/${id}.svg`, data: { resolution: 4 } }));
    }),
  );
}
const SPECIAL: Record<string, { color: string; label: string }> = {
  depart: { color: "#f4f1de", label: "DÉPART" },
  "choix-regional": { color: "#b8c0ff", label: "CHOIX\nRÉGIONAL" },
  mondial: { color: "#7b2cbf", label: "CHOIX\nMONDIAL" },
  encheres: { color: "#ef476f", label: "ENCHÈRES" },
  atout: { color: "#ffd166", label: "ATOUT" },
  actu: { color: "#118ab2", label: "ACTU\nTECH" },
  levee: { color: "#06d6a0", label: "LEVÉE DE\nFONDS" },
};

function shade(hex: string, f: number): number {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255);
}

// Isometric box whose top face is centered on (x, y)
function box(g: Graphics, x: number, y: number, w: number, h: number, height: number, color: string) {
  const hw = w / 2;
  const hh = h / 2;
  g.poly([x - hw, y, x, y + hh, x, y + hh + height, x - hw, y + height]).fill(shade(color, 0.7));
  g.poly([x + hw, y, x, y + hh, x, y + hh + height, x + hw, y + height]).fill(shade(color, 0.5));
  g.poly([x, y - hh, x + hw, y, x, y + hh, x - hw, y]).fill(shade(color, 1)).stroke({ width: 1, color: 0x000000, alpha: 0.25 });
}

function label(text: string, size: number, color = "#1b1b1b", bold = true): Text {
  const t = new Text({
    text,
    style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: size, fill: color, fontWeight: bold ? "700" : "500", align: "center" },
    resolution: 2,
  });
  t.anchor.set(0.5);
  return t;
}

function drawBoard(world: Container, game: GameState, looks: Look[]) {
  world.removeChildren().forEach((c) => c.destroy({ children: true }));
  const current = game.players[game.current]!;

  board.forEach((cell, i) => {
    const [gx, gy] = cellGrid(i);
    const [x, y] = toScreen(gx, gy);
    const layer = new Container();
    layer.zIndex = gx + gy;
    const g = new Graphics();
    const color = cell.type === "city" ? regionColor.get(cell.region)! : SPECIAL[cell.type]!.color;
    box(g, x, y, TILE_W - 6, TILE_H - 3, 12, color);
    if (current.position === i) {
      g.poly([x, y - TILE_H / 2 + 1, x + TILE_W / 2 - 3, y, x, y + TILE_H / 2 - 2, x - TILE_W / 2 + 3, y]).stroke({ width: 4, color: 0xffffff });
    }
    layer.addChild(g);

    if (cell.type === "city") {
      const company = companyById.get(game.royalties[cell.id]!)!;
      const b = new Graphics();
      box(b, x, y - 22, 46, 23, 22, company.color);
      layer.addChild(b);
      const tex = logos.get(company.id);
      if (tex) {
        const logo = new Sprite(tex);
        logo.anchor.set(0.5, 1);
        logo.width = logo.height = 30;
        logo.position.set(x, y - 30);
        layer.addChild(logo);
      }
      const name = label(cell.name, 12);
      name.position.set(x, y + 14);
      layer.addChild(name);
    } else {
      const t = label(SPECIAL[cell.type]!.label, 12, cell.type === "mondial" ? "#ffffff" : "#1b1b1b");
      t.position.set(x, y);
      layer.addChild(t);
    }
    world.addChild(layer);
  });

  game.players.forEach((p, idx) => {
    if (p.bankrupt) return;
    const [gx, gy] = cellGrid(p.position);
    const [x, y] = toScreen(gx, gy);
    const tex = pawnTexture(looks[idx]!, idx);
    if (!tex) return;
    const pawn = new Sprite(tex);
    pawn.anchor.set(0.5, 1);
    pawn.height = 80;
    pawn.width = 50;
    pawn.position.set(x + ((idx % 3) - 1) * 22, y + (idx < 3 ? 2 : 16));
    pawn.zIndex = gx + gy + 0.5 + idx * 0.01;
    world.addChild(pawn);
  });

  const [cx, cy] = toScreen(SIDE / 2, SIDE / 2);
  const title = label("STONKS VALLEY", 44, "#f4f1de");
  title.position.set(cx, cy - 30);
  title.zIndex = -1;
  world.addChild(title);
  if (game.lastRoll) {
    const dice = label(`Dés : ${game.lastRoll[0]} + ${game.lastRoll[1]}`, 24, "#f4f1de", false);
    dice.position.set(cx, cy + 25);
    dice.zIndex = -1;
    world.addChild(dice);
  }
}

export function Board({ game, looks }: { game: GameState; looks: Look[] }) {
  const host = useRef<HTMLDivElement>(null);
  const worldRef = useRef<Container | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const looksRef = useRef(looks);
  looksRef.current = looks;

  useEffect(() => {
    const el = host.current!;
    const app = new Application();
    let ready = false;
    let destroyed = false;
    const world = new Container();
    world.sortableChildren = true;

    const fit = () => {
      const [, bottom] = toScreen(SIDE, SIDE);
      const width = (SIDE + 1) * TILE_W;
      const height = bottom + TILE_H * 2;
      const scale = Math.min(el.clientWidth / width, el.clientHeight / height) * 0.95;
      world.scale.set(scale);
      world.position.set(el.clientWidth / 2, (el.clientHeight - height * scale) / 2 + TILE_H * scale);
    };

    app
      .init({ resizeTo: el, background: "#1d2d44", antialias: true, autoDensity: true, resolution: window.devicePixelRatio })
      .then(loadLogos)
      .then(() => loadPawns(looksRef.current))
      .then(() => {
        if (destroyed) {
          app.destroy(true);
          return;
        }
        ready = true;
        el.appendChild(app.canvas);
        app.stage.addChild(world);
        worldRef.current = world;
        fit();
        drawBoard(world, gameRef.current, looksRef.current);
      });

    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (drag = { x: e.clientX - world.x, y: e.clientY - world.y });
    const move = (e: PointerEvent) => drag && world.position.set(e.clientX - drag.x, e.clientY - drag.y);
    const up = () => (drag = null);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const s = Math.min(3, Math.max(0.2, world.scale.x * f));
      const k = s / world.scale.x;
      world.position.set(mx - (mx - world.x) * k, my - (my - world.y) * k);
      world.scale.set(s);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("dblclick", fit);

    return () => {
      destroyed = true;
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("dblclick", fit);
      worldRef.current = null;
      if (ready) app.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    if (worldRef.current) drawBoard(worldRef.current, game, looks);
    loadPawns(looks).then((added) => added && worldRef.current && drawBoard(worldRef.current, gameRef.current, looksRef.current));
  }, [game, looks]);

  return <div className="board" ref={host} title="Glisser pour déplacer, molette pour zoomer, double-clic pour recentrer" />;
}
