import { describe, it, expect } from "vitest";
import { decideUpdateAction, MIN_RELOAD_INTERVAL_MS } from "./updatePolicy";

const NOW = 1_000_000_000;
const idle = { now: NOW, editing: false, lastInputAt: 0, lastAutoReloadAt: null };

describe("decideUpdateAction", () => {
  it("recharge automatiquement si l'utilisateur ne fait rien", () => {
    expect(decideUpdateAction(idle)).toBe("reload");
  });

  it("propose un toast si un champ a le focus", () => {
    expect(decideUpdateAction({ ...idle, editing: true })).toBe("toast");
  });

  it("propose un toast si l'utilisateur vient de taper", () => {
    expect(decideUpdateAction({ ...idle, lastInputAt: NOW - 2_000 })).toBe("toast");
    expect(decideUpdateAction({ ...idle, lastInputAt: NOW - 30_000 })).toBe("reload");
  });

  it("garde-fou : pas de rechargement en boucle", () => {
    expect(decideUpdateAction({ ...idle, lastAutoReloadAt: NOW - 10_000 })).toBe("toast");
    expect(decideUpdateAction({ ...idle, lastAutoReloadAt: NOW - MIN_RELOAD_INTERVAL_MS - 1 })).toBe("reload");
  });
});
