import { describe, expect, it } from "vitest";
import {
  PWA_DISMISS_COOLDOWN_MS,
  detectDesktopOs,
  detectInstallPlatform,
  parseDismissedAt,
  shouldShowBookmarkPrompt,
  shouldShowInstallPrompt,
  type BookmarkPromptInputs,
  type InstallPromptInputs,
} from "./install";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const LINUX_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

describe("detectInstallPlatform", () => {
  it("classifies iPhone Safari as ios", () => {
    expect(detectInstallPlatform(IPHONE_UA)).toBe("ios");
  });

  it("classifies iPadOS desktop-UA (macintosh + touch) as ios", () => {
    expect(detectInstallPlatform(IPAD_DESKTOP_UA, 5)).toBe("ios");
    expect(detectInstallPlatform(IPAD_DESKTOP_UA, 0)).toBe("desktop");
  });

  it("classifies Android Chrome as android", () => {
    expect(detectInstallPlatform(ANDROID_UA)).toBe("android");
  });

  it("classifies desktop Chrome as desktop", () => {
    expect(detectInstallPlatform(DESKTOP_UA)).toBe("desktop");
  });
});

describe("parseDismissedAt", () => {
  it("parses a stored timestamp and rejects garbage", () => {
    expect(parseDismissedAt("1720000000000")).toBe(1720000000000);
    expect(parseDismissedAt(null)).toBeNull();
    expect(parseDismissedAt("not-a-number")).toBeNull();
    expect(parseDismissedAt("0")).toBeNull();
    expect(parseDismissedAt("-5")).toBeNull();
  });
});

describe("shouldShowInstallPrompt", () => {
  const base: InstallPromptInputs = {
    standalone: false,
    installed: false,
    platform: "android",
    hasNativePrompt: true,
    dismissedAt: null,
    now: 1_800_000_000_000,
  };

  it("shows on Android when Chromium offered a native prompt", () => {
    expect(shouldShowInstallPrompt(base)).toBe(true);
  });

  it("hides when running standalone or already installed", () => {
    expect(shouldShowInstallPrompt({ ...base, standalone: true })).toBe(false);
    expect(shouldShowInstallPrompt({ ...base, installed: true })).toBe(false);
    expect(
      shouldShowInstallPrompt({
        ...base,
        platform: "ios",
        standalone: true,
        hasNativePrompt: false,
      }),
    ).toBe(false);
  });

  it("shows on iOS without any native prompt (instruction-sheet path)", () => {
    expect(
      shouldShowInstallPrompt({
        ...base,
        platform: "ios",
        hasNativePrompt: false,
      }),
    ).toBe(true);
  });

  it("hides on desktop/android when no native prompt was offered", () => {
    expect(shouldShowInstallPrompt({ ...base, hasNativePrompt: false })).toBe(
      false,
    );
    expect(
      shouldShowInstallPrompt({
        ...base,
        platform: "desktop",
        hasNativePrompt: false,
      }),
    ).toBe(false);
    expect(
      shouldShowInstallPrompt({
        ...base,
        platform: "desktop",
        hasNativePrompt: true,
      }),
    ).toBe(true);
  });

  it("honors the dismissal cooldown, then shows again", () => {
    const dismissedAt = base.now - 60_000;
    expect(shouldShowInstallPrompt({ ...base, dismissedAt })).toBe(false);
    expect(
      shouldShowInstallPrompt({
        ...base,
        dismissedAt,
        now: dismissedAt + PWA_DISMISS_COOLDOWN_MS + 1,
      }),
    ).toBe(true);
    // The cooldown binds iOS too.
    expect(
      shouldShowInstallPrompt({
        ...base,
        platform: "ios",
        hasNativePrompt: false,
        dismissedAt,
      }),
    ).toBe(false);
  });
});

describe("detectDesktopOs", () => {
  it("classifies macOS and Windows UAs, everything else is other", () => {
    expect(detectDesktopOs(MAC_UA)).toBe("mac");
    expect(detectDesktopOs(DESKTOP_UA)).toBe("windows");
    expect(detectDesktopOs(LINUX_UA)).toBe("other");
  });
});

describe("shouldShowBookmarkPrompt", () => {
  const base: BookmarkPromptInputs = {
    standalone: false,
    installed: false,
    platform: "desktop",
    dismissedAt: null,
    now: 1_800_000_000_000,
  };

  it("shows on desktop with no native prompt involved", () => {
    expect(shouldShowBookmarkPrompt(base)).toBe(true);
  });

  it("never shows on mobile platforms (install bar owns those)", () => {
    expect(shouldShowBookmarkPrompt({ ...base, platform: "ios" })).toBe(false);
    expect(shouldShowBookmarkPrompt({ ...base, platform: "android" })).toBe(
      false,
    );
    expect(shouldShowBookmarkPrompt({ ...base, platform: "other" })).toBe(
      false,
    );
  });

  it("hides when running standalone or already installed", () => {
    expect(shouldShowBookmarkPrompt({ ...base, standalone: true })).toBe(false);
    expect(shouldShowBookmarkPrompt({ ...base, installed: true })).toBe(false);
  });

  it("honors the same dismissal cooldown as the install bar, then shows again", () => {
    const dismissedAt = base.now - 60_000;
    expect(shouldShowBookmarkPrompt({ ...base, dismissedAt })).toBe(false);
    expect(
      shouldShowBookmarkPrompt({
        ...base,
        dismissedAt,
        now: dismissedAt + PWA_DISMISS_COOLDOWN_MS + 1,
      }),
    ).toBe(true);
  });
});
