import { describe, it, expect } from "vitest";
import { parsePace, parseDuration, formatPace, formatDuration, autoFormatTimeInput } from "./format";

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

describe("autoFormatTimeInput", () => {
  it("laisse passer 1 ou 2 chiffres tels quels (encore ambigu)", () => {
    expect(autoFormatTimeInput("5")).toBe("5");
    expect(autoFormatTimeInput("53")).toBe("53");
  });

  it("insère ':' avant les 2 derniers chiffres à partir de 3 chiffres", () => {
    expect(autoFormatTimeInput("530")).toBe("5:30");
    expect(autoFormatTimeInput("157")).toBe("1:57");
  });

  it("gère les minutes/heures à 2 chiffres une fois le 4e chiffre tapé", () => {
    expect(autoFormatTimeInput("1230")).toBe("12:30");
  });

  it("ignore les séparateurs déjà présents et ne garde que les chiffres", () => {
    expect(autoFormatTimeInput("5:3")).toBe("53");
    expect(autoFormatTimeInput("5,30")).toBe("5:30");
  });

  it("plafonne à 4 chiffres", () => {
    expect(autoFormatTimeInput("123456")).toBe("12:34");
  });

  it("le résultat reste toujours parsable par parsePace", () => {
    expect(parsePace(autoFormatTimeInput("530"))).toBeCloseTo(5.5);
  });
});
