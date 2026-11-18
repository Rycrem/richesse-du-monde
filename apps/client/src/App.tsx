import { Board } from "./Board";
import { GamePanel } from "./GamePanel";
import { Home } from "./Home";
import { Lobby } from "./Lobby";
import { STARTER_LOOKS } from "./format";
import { useStore } from "./store";

export function App() {
  const { game, room, online } = useStore();
  if (online && room && !game) return <Lobby room={room} />;
  if (!game) return <Home />;
  return (
    <div className="layout">
      <Board game={game} looks={game.players.map((p, i) => room?.players.find((m) => m.id === p.id)?.look ?? STARTER_LOOKS[i % STARTER_LOOKS.length]!)} />
      <GamePanel game={game} />
    </div>
  );
}
