import type { GameState } from "@stonks/engine";
import type { Look } from "@stonks/shared";
import { useEffect, useRef, useState } from "react";
import { HoverTip } from "./Inspect";
import { useStore } from "./store";
import { createBoardScene, type BoardScene } from "./board3d/scene";

export function Board({ game, looks }: { game: GameState; looks: Look[] }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const latest = useRef({ game, looks });
  latest.current = { game, looks };
  const [hover, setHover] = useState<{ cell: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const s = createBoardScene(host.current!, {
      onHover: (cell, x, y) => setHover(cell === null ? null : { cell, x, y }),
      onSelect: (cell) => useStore.getState().setInspect({ cell }),
    });
    scene.current = s;
    s.update(latest.current.game, latest.current.looks);
    return () => {
      scene.current = null;
      s.dispose();
    };
  }, []);

  useEffect(() => {
    scene.current?.update(game, looks);
  }, [game, looks]);

  return (
    <>
      <div
        className={`board ${hover ? "pointing" : ""}`}
        ref={host}
        onDoubleClick={() => scene.current?.recenter()}
        title="Clic sur une case pour les détails, glisser pour tourner, clic droit pour déplacer, molette pour zoomer, double-clic pour recentrer"
      />
      <HoverTip hover={hover} game={game} />
    </>
  );
}
