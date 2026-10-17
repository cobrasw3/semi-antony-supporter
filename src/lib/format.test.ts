import { describe, it, expect } from "vitest";
import {
  parsePace,
  parseDuration,
  formatPace,
  formatDuration,
  autoFormatTimeInput,
  resolveInitialPrefs,
  buildShareUrl,
  updateCurrentUrl,
  buildShareText,
  runnerLabel,
  RunnerLabel,
  resolvePace,
} from "./format";

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

describe("resolveInitialPrefs", () => {
  const defaults = { pace: "5:30", targetTime: "1:57" };

  it("lit name= et pace= depuis l'URL", () => {
    const prefs = resolveInitialPrefs("?name=L%C3%A9a&pace=5:10", null, defaults);
    expect(prefs).toMatchObject({ name: "Léa", paceText: "5:10", mode: "pace" });
  });

  it("accepte encore l'ancien paramètre runner=", () => {
    expect(resolveInitialPrefs("?runner=Tom&pace=6:00", null, defaults).name).toBe("Tom");
  });

  it("l'URL prime sur la mémoire locale", () => {
    const prefs = resolveInitialPrefs("?pace=4:45", { name: "Léa", paceText: "6:00" }, defaults);
    expect(prefs).toMatchObject({ name: "", paceText: "4:45" });
  });

  it("restaure la mémoire locale si l'URL est vide (app installée)", () => {
    const prefs = resolveInitialPrefs("", { name: "Léa", mode: "duration", paceText: "6:00", durationText: "2:05" }, defaults);
    expect(prefs).toEqual({ name: "Léa", mode: "duration", paceText: "6:00", durationText: "2:05" });
  });

  it("ignore une allure d'URL invalide", () => {
    expect(resolveInitialPrefs("?pace=abc", null, defaults).paceText).toBe("5:30");
  });
});

describe("partage", () => {
  it("construit un lien propre avec name et pace", () => {
    const url = buildShareUrl("https://exemple.fr/?demo=1&now=14:40", 5.5, " Léa ");
    expect(url).toBe("https://exemple.fr/?name=L%C3%A9a&pace=5%3A30");
  });

  it("met à jour l'URL courante en gardant les paramètres techniques", () => {
    const url = new URL(updateCurrentUrl("https://exemple.fr/?demo=1&runner=Tom", 5.5, "Léa"));
    expect(url.searchParams.get("demo")).toBe("1");
    expect(url.searchParams.get("name")).toBe("Léa");
    expect(url.searchParams.get("runner")).toBeNull();
  });

  it("personnalise le message", () => {
    expect(buildShareText("Léa", "Semi d’Antony")).toBe("Suis Léa au Semi d’Antony 👉");
    expect(runnerLabel("")).toBe("ton coureur");
    expect(RunnerLabel("")).toBe("Ton coureur");
  });
});

describe("resolvePace", () => {
  const bounds = { minMinPerKm: 3, maxMinPerKm: 9 };
  const base = { mode: "pace" as const, paceText: "5:30", durationText: "1:57" };

  it("résout une allure valide", () => {
    expect(resolvePace(base, 21.0975, bounds)).toEqual({ pace: 5.5, error: null });
  });

  it("refuse une allure hors 3:00–9:00", () => {
    expect(resolvePace({ ...base, paceText: "2:50" }, 21.0975, bounds).error).toMatch(/3:00 et 9:00/);
    expect(resolvePace({ ...base, paceText: "9:01" }, 21.0975, bounds).pace).toBeNull();
    expect(resolvePace({ ...base, paceText: "9:00" }, 21.0975, bounds).pace).toBe(9);
  });

  it("refuse une saisie vide ou illisible", () => {
    expect(resolvePace({ ...base, paceText: "" }, 21.0975, bounds).error).toMatch(/Indique/);
    expect(resolvePace({ ...base, paceText: "5:99" }, 21.0975, bounds).error).toMatch(/non reconnue/);
  });

  it("déduit l'allure d'un temps visé et vérifie les bornes", () => {
    const ok = resolvePace({ ...base, mode: "duration", durationText: "1:56" }, 21.0975, bounds);
    expect(ok.pace).toBeCloseTo(116 / 21.0975);
    const tooFast = resolvePace({ ...base, mode: "duration", durationText: "0:55" }, 21.0975, bounds);
    expect(tooFast.error).toMatch(/1:04 et 3:09/);
  });
});
