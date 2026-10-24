import { describe, it, expect } from "vitest";
import { isIOS, isIOSSafari, notificationSupport } from "./platform";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

describe("détection de plateforme", () => {
  it("reconnaît iPhone, iPad (mode bureau) et Android", () => {
    expect(isIOS(IPHONE_SAFARI, "iPhone", 5)).toBe(true);
    expect(isIOS(IPAD_DESKTOP_MODE, "MacIntel", 5)).toBe(true);
    expect(isIOS(IPAD_DESKTOP_MODE, "MacIntel", 0)).toBe(false);
    expect(isIOS(ANDROID, "Linux armv8l", 5)).toBe(false);
  });

  it("distingue Safari iOS de Chrome iOS", () => {
    expect(isIOSSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIOSSafari(IPHONE_CHROME)).toBe(false);
  });
});

describe("notificationSupport", () => {
  it("iOS dans Safari : il faut d'abord installer", () => {
    expect(notificationSupport({ ios: true, standalone: false, hasNotificationApi: false })).toBe("needs-install");
  });
  it("iOS installé ou Android : supporté si l'API existe", () => {
    expect(notificationSupport({ ios: true, standalone: true, hasNotificationApi: true })).toBe("supported");
    expect(notificationSupport({ ios: false, standalone: false, hasNotificationApi: true })).toBe("supported");
    expect(notificationSupport({ ios: false, standalone: false, hasNotificationApi: false })).toBe("unsupported");
  });
});
