import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { checkinDelay, delaySentence, estimatedKmAfterCheckin, formatDelayFr, observedPace, recalibratePassages } from "./checkin";
import { parseEventConfig } from "./event";
import { computeAllPassages, timeStringToMinutes } from "./timing";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const bounds = config.settings.pace;
const start = timeStringToMinutes(semi.startTime);
const passages = computeAllPassages(semi, 5.5, config.settings.margin);
const heller1 = passages.find((p) => p.spotId === "parc-heller")!; // km 2,7 prévu ≈ 14:44:51

describe("observedPace / checkinDelay", () => {
  it("tient compte de l'allure réelle, d'autant plus que le pointage est loin", () => {
    // 2,7 km en 16,2 min = 6:00/km observé ; confiance 2,7 / 7,7 ≈ 35 %.
    const c = { spotId: "parc-heller", km: 2.7, minutes: start + 16.2 };
    expect(observedPace(c, start, 5.5, bounds)).toBeCloseTo(5.5 + (2.7 / 7.7) * 0.5);
    // Même écart d'allure au km 14 : confiance ≈ 74 %.
    const late = { spotId: "stade-suant", km: 14, minutes: start + 14 * 6 };
    expect(observedPace(late, start, 5.5, bounds)).toBeCloseTo(5.5 + (14 / 19) * 0.5);
    expect(checkinDelay(c, start, 5.5)).toBeCloseTo(16.2 - 2.7 * 5.5);
  });

  it("garde l'allure prévue trop près du départ, et borne les valeurs absurdes", () => {
    expect(observedPace({ spotId: "stade-suant", km: 0, minutes: start + 2 }, start, 5.5, bounds)).toBe(5.5);
    expect(observedPace({ spotId: "x", km: 20, minutes: start + 20 }, start, 5.5, bounds)).toBe(3);
  });
});

describe("recalibratePassages", () => {
  // Léa pointée au parc Heller à 14:48 (3 min de retard environ).
  const checkin = { spotId: "parc-heller", km: 2.7, minutes: timeStringToMinutes("14:48") };
  const recal = recalibratePassages(passages, checkin, semi, 5.5, config.settings.margin, bounds);

  it("ne touche pas aux passages d'avant le pointage", () => {
    for (const p of recal.filter((x) => x.km < 2.7)) {
      expect(p).toEqual(passages.find((q) => q.spotId === p.spotId && q.km === p.km));
    }
  });

  it("le passage pointé prend l'heure réelle", () => {
    const h = recal.find((p) => p.spotId === "parc-heller" && p.km === 2.7)!;
    expect(h.estimatedTime).toBe("14:48");
  });

  it("décale les passages suivants avec l'allure observée", () => {
    const pace = observedPace(checkin, start, 5.5, bounds); // ≈ 6,67 min/km
    const finish = recal.find((p) => p.kind === "finish")!;
    expect(finish.estimatedMinutes).toBeCloseTo(checkin.minutes + (semi.distanceKm - 2.7) * pace, 5);
    const before = passages.find((p) => p.kind === "finish")!;
    expect(finish.estimatedMinutes).toBeGreaterThan(before.estimatedMinutes);
  });

  it("resserre les fourchettes juste après le pointage", () => {
    const next = recal.find((p) => p.km > 2.7)!;
    const nextBefore = passages.find((p) => p.km === next.km && p.spotId === next.spotId)!;
    const width = (p: typeof next) => p.windowEndMinutes - p.windowStartMinutes;
    expect(width(next)).toBeLessThanOrEqual(width(nextBefore));
  });

  it("garde le même nombre de passages, dans l'ordre", () => {
    expect(recal).toHaveLength(passages.length);
    expect(heller1.km).toBe(2.7);
  });
});

describe("utilitaires", () => {
  it("estime les km après pointage, sans reculer ni dépasser l'arrivée", () => {
    const c = { spotId: "parc-heller", km: 2.7, minutes: 880 };
    expect(estimatedKmAfterCheckin(880 + 12, c, 6, 21.0975)).toBeCloseTo(4.7);
    expect(estimatedKmAfterCheckin(870, c, 6, 21.0975)).toBe(2.7);
    expect(estimatedKmAfterCheckin(2000, c, 6, 21.0975)).toBe(21.0975);
  });

  it("formate l'écart", () => {
    expect(formatDelayFr(3.2)).toBe("3 min de retard");
    expect(formatDelayFr(-1.6)).toBe("2 min d'avance");
    expect(formatDelayFr(0.2)).toBe("pile à l'heure");
    expect(delaySentence("Léa", 3)).toBe("Léa a 3 min de retard");
    expect(delaySentence("Léa", 0)).toBe("Léa est pile à l'heure");
  });
});
