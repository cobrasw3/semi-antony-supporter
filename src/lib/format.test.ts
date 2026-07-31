import { describe, it, expect } from "vitest";
import { parsePace, parseDuration, formatPace, formatDuration } from "./format";

describe("parsePace", () => {
  it("accepte ':' comme séparateur", () => {
    expect(parsePace("5:30")).toBeCloseTo(5.5);
  });

  it("accepte '.' comme séparateur (clavier numérique mobile)", () => {
    expect(parsePace("5.30")).toBeCloseTo(5.5);
  });

  it("accepte ',' comme séparateur (clavier mobile en locale FR)", () => {
    expect(parsePace("5,30")).toBeCloseTo(5.5);
  });

  it("accepte des minutes seules, sans séparateur", () => {
    expect(parsePace("6")).toBeCloseTo(6);
  });

  it("rejette un format invalide", () => {
    expect(parsePace("abc")).toBeNull();
    expect(parsePace("5:99")).toBeNull();
    expect(parsePace("")).toBeNull();
  });
});

describe("parseDuration", () => {
  it("accepte ':', '.' et ',' comme séparateur", () => {
    expect(parseDuration("1:57")).toBe(117);
    expect(parseDuration("1.57")).toBe(117);
    expect(parseDuration("1,57")).toBe(117);
  });

  it("rejette un format invalide", () => {
    expect(parseDuration("1h57")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });
});

describe("formatPace / formatDuration", () => {
  it("formatPace produit toujours le format ':' (utilisé pour l'URL de partage)", () => {
    expect(formatPace(5.5)).toBe("5:30");
  });

  it("formatDuration produit toujours le format ':'", () => {
    expect(formatDuration(117)).toBe("1:57");
  });
});
