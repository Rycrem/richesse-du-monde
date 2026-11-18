import { describe, expect, it, vi } from "vitest";
import { Profiles } from "./profiles";

const setup = () => new Profiles(null, { name: "Rycrem", password: "admin-secret" });

describe("accounts", () => {
  it("first login creates the account and keeps the browser's points", () => {
    const profiles = setup();
    profiles.get("browser");
    profiles.award("browser", 80);
    const r = profiles.login("Alice", "1234", "browser");
    expect(r).toMatchObject({ ok: true, data: { token: "browser", account: "Alice", points: 80, admin: false } });
  });

  it("wrong password is refused, right password returns the same profile from another browser", () => {
    const profiles = setup();
    profiles.get("browser");
    profiles.login("Alice", "1234", "browser");
    expect(profiles.login("alice", "nope", "other")).toEqual({ ok: false, error: "Mauvais mot de passe" });
    expect(profiles.login("alice", "1234", "other")).toMatchObject({ ok: true, data: { token: "browser" } });
  });

  it("an account never takes over another account's profile", () => {
    const profiles = setup();
    profiles.get("browser");
    profiles.login("Alice", "1234", "browser");
    const bob = profiles.login("Bob", "abcd", "browser");
    expect(bob.ok && bob.data.token).not.toBe("browser");
  });

  it("the admin name is reserved to the configured password", () => {
    const profiles = setup();
    expect(profiles.login("rycrem", "1234", "")).toEqual({ ok: false, error: "Ce pseudo est réservé" });
    expect(new Profiles(null, { name: "Rycrem" }).login("Rycrem", "1234", "").ok).toBe(false);
    expect(profiles.login("Rycrem", "admin-secret", "")).toMatchObject({ ok: true, data: { admin: true } });
  });

  it("only the admin lists accounts, resets passwords and sets points", () => {
    const profiles = setup();
    const alice = profiles.login("Alice", "1234", "a");
    const admin = profiles.login("Rycrem", "admin-secret", "r");
    if (!alice.ok || !admin.ok) throw new Error();
    expect(profiles.accounts(alice.data.token).ok).toBe(false);
    expect(profiles.adminPoints(alice.data.token, "Alice", 999).ok).toBe(false);
    expect(profiles.adminPoints(admin.data.token, "alice", 999).ok).toBe(true);
    expect(profiles.adminPassword(admin.data.token, "Alice", "neuf").ok).toBe(true);
    expect(profiles.login("Alice", "1234", "").ok).toBe(false);
    expect(profiles.login("Alice", "neuf", "")).toMatchObject({ ok: true, data: { points: 999 } });
    const list = profiles.accounts(admin.data.token);
    expect(list.ok && list.data.map((a) => a.name)).toEqual(["Alice", "Rycrem"]);
  });

  it("resets the password with an e-mailed link valid one hour", () => {
    vi.useFakeTimers();
    const profiles = setup();
    const alice = profiles.login("Alice", "1234", "a");
    if (!alice.ok) throw new Error();
    expect(profiles.setEmail(alice.data.token, "pas-un-mail").ok).toBe(false);
    expect(profiles.setEmail(alice.data.token, "alice@example.com")).toMatchObject({ ok: true, data: { email: "alice@example.com" } });
    expect(profiles.forgot("Bob")).toBeNull();
    const link = profiles.forgot("alice")!;
    expect(link.email).toBe("alice@example.com");
    expect(profiles.reset(link.token, "neuf")).toMatchObject({ ok: true, data: { account: "Alice" } });
    expect(profiles.reset(link.token, "encore").ok).toBe(false);
    const late = profiles.forgot("alice")!;
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(profiles.reset(late.token, "trop-tard").ok).toBe(false);
    expect(profiles.login("Alice", "neuf", "").ok).toBe(true);
    vi.useRealTimers();
  });
});
