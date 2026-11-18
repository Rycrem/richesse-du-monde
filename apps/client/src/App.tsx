import { Board } from "./Board";
import { GamePanel } from "./GamePanel";
import { Home } from "./Home";
import { Lobby } from "./Lobby";
import { useStore } from "./store";

export function App() {
  const { game, room, online } = useStore();
  if (online && room && !game) return <Lobby room={room} />;
  if (!game) return <Home />;
  return (
    <div className="layout">
      <Board game={game} />
      <GamePanel game={game} />
    </div>
  );
}
