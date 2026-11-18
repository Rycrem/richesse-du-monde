import type { GameState } from "@stonks/engine";
import type { Look } from "@stonks/shared";
import { useEffect, useRef } from "react";
import { createBoardScene, type BoardScene } from "./board3d/scene";

export function Board({ game, looks }: { game: GameState; looks: Look[] }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const latest = useRef({ game, looks });
  latest.current = { game, looks };

  useEffect(() => {
    const s = createBoardScene(host.current!);
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
    <div
      className="board"
      ref={host}
      onDoubleClick={() => scene.current?.recenter()}
      title="Glisser pour tourner, clic droit pour déplacer, molette pour zoomer, double-clic pour recentrer"
    />
  );
}
