import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClientToServer, ServerToClient } from "@stonks/shared";
import { Server } from "socket.io";
import { Rooms } from "./rooms";

const PORT = Number(process.env.PORT ?? 3000);
const STATIC_DIR = fileURLToPath(new URL("../../client/dist", import.meta.url));
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

const http = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, "");
  const file = join(STATIC_DIR, path === "/" ? "index.html" : path);
  try {
    const body = await readFile(file.startsWith(STATIC_DIR) ? file : join(STATIC_DIR, "index.html"));
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    try {
      res.writeHead(200, { "content-type": TYPES[".html"] });
      res.end(await readFile(join(STATIC_DIR, "index.html")));
    } catch {
      res.writeHead(404).end("Client non construit : lancer pnpm build");
    }
  }
});

const io = new Server<ClientToServer, ServerToClient>(http, { cors: { origin: true } });
const rooms = new Rooms((room) => io.to(room.code).emit("room:state", rooms.view(room)));

io.on("connection", (socket) => {
  let session: { code: string; playerId: string } | null = null;

  const enter = (code: string, playerId: string) => {
    if (session) socket.leave(session.code);
    session = { code, playerId };
    socket.join(code);
    const room = rooms.get(code);
    if (room) socket.emit("room:state", rooms.view(room));
  };

  socket.on("room:create", (name, ack) => {
    const r = rooms.create(String(name ?? ""));
    if (r.ok) enter(r.data.code, r.data.playerId);
    ack(r);
  });

  socket.on("room:join", (code, name, ack) => {
    const r = rooms.join(String(code ?? ""), String(name ?? ""));
    if (r.ok) enter(r.data.code, r.data.playerId);
    ack(r);
  });

  socket.on("room:rejoin", (code, token, ack) => {
    const r = rooms.rejoin(String(code ?? ""), String(token ?? ""));
    if (r.ok) enter(r.data.code, r.data.playerId);
    ack(r);
  });

  socket.on("room:start", (mode, ack) => {
    if (!session) return ack({ ok: false, error: "Pas dans une partie" });
    ack(rooms.start(session.code, session.playerId, mode === "chrono" ? "chrono" : "classique"));
  });

  socket.on("game:action", (action, ack) => {
    if (!session) return ack({ ok: false, error: "Pas dans une partie" });
    ack(rooms.act(session.code, session.playerId, action));
  });

  const leave = () => {
    if (!session) return;
    rooms.setConnected(session.code, session.playerId, false);
    socket.leave(session.code);
    session = null;
  };
  socket.on("room:leave", leave);
  socket.on("disconnect", leave);
});

http.listen(PORT, () => console.log(`Stonks Valley sur http://localhost:${PORT}`));
