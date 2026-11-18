import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "@stonks/engine";
import { Rooms, type Room } from "./rooms";

function setup() {
  const changes: Room[] = [];
  const rooms = new Rooms((r) => changes.push(r));
  const host = rooms.create("Alice");
  if (!host.ok) throw new Error();
  const guest = rooms.join(host.data.code, "Bob");
  if (!guest.ok) throw new Error();
  return { rooms, host: host.data, guest: guest.data, changes };
}

afterEach(() => vi.useRealTimers());

describe("rooms", () => {
  it("creates a room with a 4-char code and lets others join", () => {
    const { rooms, host } = setup();
    expect(host.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(rooms.view(rooms.get(host.code)!).players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("only the host starts, and nobody joins after the start", () => {
    const { rooms, host, guest } = setup();
    expect(rooms.start(host.code, guest.playerId, "classique").ok).toBe(false);
    expect(rooms.start(host.code, host.playerId, "classique").ok).toBe(true);
    expect(rooms.join(host.code, "Chloé").ok).toBe(false);
  });

  it("players can only act for themselves", () => {
    const { rooms, host, guest } = setup();
    rooms.start(host.code, host.playerId, "classique");
    expect(rooms.act(host.code, guest.playerId, { type: "ROLL", playerId: "p1" })).toMatchObject({ ok: false });
    expect(rooms.act(host.code, host.playerId, { type: "AUCTION_CLOSE" })).toMatchObject({ ok: false });
    expect(rooms.act(host.code, host.playerId, { type: "ROLL", playerId: "p1" })).toMatchObject({ ok: true });
  });

  it("reconnects a player with their token", () => {
    const { rooms, host, guest } = setup();
    rooms.start(host.code, host.playerId, "classique");
    rooms.setConnected(host.code, guest.playerId, false);
    expect(rooms.view(rooms.get(host.code)!).players[1]!.connected).toBe(false);
    expect(rooms.rejoin(host.code, guest.token)).toMatchObject({ ok: true, data: { playerId: "p2" } });
    expect(rooms.rejoin(host.code, "bad").ok).toBe(false);
  });

  it("removes a lobby player who disconnects before the start", () => {
    const { rooms, host, guest } = setup();
    rooms.setConnected(host.code, guest.playerId, false);
    expect(rooms.get(host.code)!.members).toHaveLength(1);
  });

  it("expires an offer after the timeout", () => {
    vi.useFakeTimers();
    const { rooms, host } = setup();
    rooms.start(host.code, host.playerId, "classique");
    const room = rooms.get(host.code)!;
    room.game!.phase = "act";
    room.game!.players[1]!.holdings = { nvidio: 10 };
    expect(rooms.act(host.code, "p1", { type: "OFFER", playerId: "p1", ownerId: "p2", company: "nvidio", percent: 5, price: 100 }).ok).toBe(true);
    expect(room.deadline).not.toBeNull();
    vi.advanceTimersByTime(config.offerTimeoutSeconds * 1000);
    expect(room.game!.offer).toBeNull();
    expect(room.deadline).toBeNull();
  });
});
