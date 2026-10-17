import { describe, it, expect } from "vitest";
import { pickInitial } from "./remoteData";

const parse = (raw: unknown) => {
  if (typeof raw !== "object" || raw === null || !("v" in raw)) throw new Error("invalide");
  return raw as { v: number };
};
const BUILD = "2026-10-17T10:00:00.000Z";

describe("pickInitial", () => {
  it("prend la copie téléchargée si elle est plus récente que l'app", () => {
    const state = pickInitial({ v: 1 }, { data: { v: 2 }, fetchedAt: "2026-10-18T08:00:00.000Z" }, BUILD, parse);
    expect(state).toEqual({ data: { v: 2 }, fetchedAt: "2026-10-18T08:00:00.000Z", stale: false });
  });

  it("garde la copie embarquée si l'app est plus récente que le téléchargement", () => {
    const state = pickInitial({ v: 3 }, { data: { v: 2 }, fetchedAt: "2026-10-16T08:00:00.000Z" }, BUILD, parse);
    expect(state.data).toEqual({ v: 3 });
    expect(state.fetchedAt).toBeNull();
  });

  it("ignore une copie locale corrompue", () => {
    const state = pickInitial({ v: 1 }, { data: { x: 1 } as never, fetchedAt: "2026-10-18T08:00:00.000Z" }, BUILD, parse);
    expect(state.data).toEqual({ v: 1 });
  });

  it("sans copie locale : copie embarquée", () => {
    expect(pickInitial({ v: 1 }, null, BUILD, parse).data).toEqual({ v: 1 });
  });
});
