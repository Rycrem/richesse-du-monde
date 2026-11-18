import { Board } from "./Board";
import { GamePanel } from "./GamePanel";
import { Setup } from "./Setup";
import { useStore } from "./store";

export function App() {
  const game = useStore((s) => s.game);
  if (!game) return <Setup />;
  return (
    <div className="layout">
      <Board game={game} />
      <GamePanel game={game} />
    </div>
  );
}
