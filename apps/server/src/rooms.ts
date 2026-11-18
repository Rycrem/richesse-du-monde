import { randomBytes, randomUUID } from "node:crypto";
import { applyAction, config, createGame, type Action, type GameMode, type GameState } from "@stonks/engine";
import { SYSTEM_ACTIONS, type LobbyPlayer, type RoomView, type Session } from "@stonks/shared";

interface Member extends LobbyPlayer {
  token: string;
}

export interface Room {
  code: string;
  hostId: string;
  members: Member[];
  game: GameState | null;
  timer: ReturnType<typeof setTimeout> | null;
  timerKey: string | null;
  deadline: number | null;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const AFK_SECONDS = 20;

// What the server plays for a disconnected player whose turn it is
function afkAction(room: Room): Action | null {
  const g = room.game!;
  const actorId = g.phase === "auction" && g.auction && !g.auction.company ? g.auction.sellerId : g.players[g.current]!.id;
  if (room.members.find((m) => m.id === actorId)?.connected !== false) return null;
  const actor = g.players.find((p) => p.id === actorId)!;
  if (g.phase === "roll") return { type: "ROLL", playerId: actorId };
  if (g.phase === "act") return { type: "END_TURN", playerId: actorId };
  if (g.phase === "auction" && g.auction && !g.auction.company) {
    if (actor.atouts > 0) return { type: "USE_ATOUT", playerId: actorId };
    const smallest = Object.entries(actor.holdings).sort((a, b) => a[1] - b[1])[0]![0];
    return { type: "AUCTION_CHOOSE", playerId: actorId, company: smallest };
  }
  return null;
}

export class Rooms {
  private rooms = new Map<string, Room>();

  constructor(private onChange: (room: Room) => void) {}

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  private newCode(): string {
    let code: string;
    do code = Array.from(randomBytes(4), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    while (this.rooms.has(code));
    return code;
  }

  private addMember(room: Room, name: string): Session {
    const member: Member = { id: `p${room.members.length + 1}`, name: name.trim().slice(0, 20), connected: true, token: randomUUID() };
    room.members.push(member);
    return { code: room.code, playerId: member.id, token: member.token };
  }

  create(name: string): Result<Session> {
    if (!name.trim()) return { ok: false, error: "Pseudo requis" };
    const room: Room = { code: this.newCode(), hostId: "p1", members: [], game: null, timer: null, timerKey: null, deadline: null };
    this.rooms.set(room.code, room);
    return { ok: true, data: this.addMember(room, name) };
  }

  join(code: string, name: string): Result<Session> {
    const room = this.get(code);
    if (!room) return { ok: false, error: "Partie introuvable" };
    if (room.game) return { ok: false, error: "La partie a déjà commencé" };
    if (!name.trim()) return { ok: false, error: "Pseudo requis" };
    if (room.members.length >= config.maxPlayers) return { ok: false, error: "Partie complète" };
    const session = this.addMember(room, name);
    this.onChange(room);
    return { ok: true, data: session };
  }

  rejoin(code: string, token: string): Result<Session> {
    const room = this.get(code);
    const member = room?.members.find((m) => m.token === token);
    if (!room || !member) return { ok: false, error: "Session expirée" };
    member.connected = true;
    if (room.game) this.schedule(room);
    this.onChange(room);
    return { ok: true, data: { code: room.code, playerId: member.id, token } };
  }

  setConnected(code: string, playerId: string, connected: boolean): void {
    const room = this.get(code);
    const member = room?.members.find((m) => m.id === playerId);
    if (!room || !member) return;
    member.connected = connected;
    if (!room.game && !connected) {
      room.members = room.members.filter((m) => m.id !== playerId);
      if (room.members.length === 0) return this.remove(room);
      if (room.hostId === playerId) room.hostId = room.members[0]!.id;
    }
    if (room.game && room.members.every((m) => !m.connected)) return this.remove(room);
    if (room.game) this.schedule(room);
    this.onChange(room);
  }

  private remove(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    this.rooms.delete(room.code);
  }

  start(code: string, playerId: string, mode: GameMode): Result<null> {
    const room = this.get(code);
    if (!room) return { ok: false, error: "Partie introuvable" };
    if (room.hostId !== playerId) return { ok: false, error: "Seul l'hôte peut lancer la partie" };
    if (room.game) return { ok: false, error: "Déjà lancée" };
    if (room.members.length < config.minPlayers) return { ok: false, error: `Il faut au moins ${config.minPlayers} joueurs` };
    room.game = createGame(
      room.members.map((m) => ({ id: m.id, name: m.name })),
      randomBytes(4).readUInt32LE(),
      mode,
    );
    this.onChange(room);
    return { ok: true, data: null };
  }

  act(code: string, playerId: string, action: Action): Result<null> {
    const room = this.get(code);
    if (!room?.game) return { ok: false, error: "Aucune partie en cours" };
    if ((SYSTEM_ACTIONS as readonly string[]).includes(action.type)) {
      if (action.type !== "END_GAME" || room.hostId !== playerId || room.game.mode !== "chrono") {
        return { ok: false, error: "Action réservée" };
      }
    } else if ("playerId" in action && action.playerId !== playerId) {
      return { ok: false, error: "Vous ne pouvez agir que pour vous-même" };
    }
    return this.apply(room, action);
  }

  private apply(room: Room, action: Action): Result<null> {
    const r = applyAction(room.game!, action);
    if (!r.ok) return { ok: false, error: r.error };
    room.game = r.state;
    this.schedule(room);
    this.onChange(room);
    return { ok: true, data: null };
  }

  // Server-side timers: auction closes after N s without a new bid, offers expire,
  // and a disconnected player's turn is played automatically
  private schedule(room: Room): void {
    if (!room.game) return;
    const g = room.game!;
    let key: string | null = null;
    let seconds = 0;
    let action: Action | null = null;
    if (g.phase === "auction" && g.auction?.company) {
      key = `auction:${g.auction.highestBid}:${g.auction.highestBidderId}`;
      seconds = config.auctionTimeoutSeconds;
      action = { type: "AUCTION_CLOSE" };
    } else if (g.offer) {
      key = `offer:${g.offer.price}:${g.offer.awaiting}`;
      seconds = config.offerTimeoutSeconds;
      action = { type: "OFFER_TIMEOUT" };
    } else if (g.phase !== "gameOver") {
      action = afkAction(room);
      if (action) {
        key = `afk:${JSON.stringify(action)}:${g.log.length}:${g.lastRoll}`;
        seconds = AFK_SECONDS;
      }
    }
    if (key === room.timerKey) return;
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.timerKey = key;
    room.deadline = null;
    if (!action) return;
    room.deadline = Date.now() + seconds * 1000;
    room.timer = setTimeout(() => {
      room.timer = null;
      room.timerKey = null;
      room.deadline = null;
      if (this.rooms.has(room.code)) this.apply(room, action);
    }, seconds * 1000);
  }

  view(room: Room): RoomView {
    return {
      code: room.code,
      hostId: room.hostId,
      players: room.members.map(({ id, name, connected }) => ({ id, name, connected })),
      game: room.game,
      deadline: room.deadline,
    };
  }
}
