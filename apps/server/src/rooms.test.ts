import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "@stonks/engine";
import { cosmeticById, pointsForRank } from "@stonks/shared";
import { Profiles } from "./profiles";
import { AFK_SECONDS, Rooms, type Room } from "./rooms";

function setup() {
  const changes: Room[] = [];
  const profiles = new Profiles(null);
  const rooms = new Rooms(profiles, (r) => changes.push(r));
  const host = rooms.create("Alice", "tok-a");
  if (!host.ok) throw new Error();
  const guest = rooms.join(host.data.code, "Bob", "tok-b");
  if (!guest.ok) throw new Error();
  return { rooms, profiles, host: host.data, guest: guest.data, changes };
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
    expect(rooms.join(host.code, "Chloé", "tok-c").ok).toBe(false);
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

  it("plays automatically for a disconnected player after a delay", () => {
    vi.useFakeTimers();
    const { rooms, host, guest } = setup();
    rooms.start(host.code, host.playerId, "classique");
    const room = rooms.get(host.code)!;
    rooms.setConnected(host.code, host.playerId, false);
    vi.advanceTimersByTime(AFK_SECONDS * 1000);
    expect(room.game!.lastRoll).not.toBeNull();
    vi.advanceTimersByTime(AFK_SECONDS * 1000 * 3);
    expect(room.game!.players[room.game!.current]!.id).toBe(guest.playerId);
  });

  it("credits points by rank once at the end of the game", () => {
    const { rooms, profiles, host } = setup();
    rooms.start(host.code, host.playerId, "chrono");
    const room = rooms.get(host.code)!;
    room.game!.players[1]!.cash = 99999;
    expect(rooms.act(host.code, host.playerId, { type: "END_GAME" }).ok).toBe(true);
    expect(room.rewards).toEqual({ p2: pointsForRank(0), p1: pointsForRank(1) });
    expect(profiles.fetch("tok-b")).toMatchObject({ data: { points: pointsForRank(0) } });
    expect(profiles.fetch("tok-a")).toMatchObject({ data: { points: pointsForRank(1) } });
  });

  it("shows a bought cosmetic on the player's pawn in the lobby", () => {
    const { rooms, profiles, host } = setup();
    profiles.award("tok-a", 500);
    expect(profiles.buy("tok-a", "hat-couronne").ok).toBe(true);
    rooms.refreshLook("tok-a");
    expect(rooms.view(rooms.get(host.code)!).players[0]!.look.hat).toBe("hat-couronne");
  });
});

describe("profiles", () => {
  it("cannot buy without enough points, nor equip what is not owned", () => {
    const profiles = new Profiles(null);
    profiles.get("t");
    const crown = cosmeticById.get("hat-couronne")!;
    expect(profiles.buy("t", crown.id)).toMatchObject({ ok: false });
    expect(profiles.equip("t", "hat", crown.id)).toMatchObject({ ok: false });
    profiles.award("t", crown.price);
    expect(profiles.buy("t", crown.id)).toMatchObject({ ok: true, data: { points: 0 } });
    expect(profiles.equip("t", "hat", "hat-casquette")).toMatchObject({ ok: true, data: { look: { hat: "hat-casquette" } } });
  });
});
