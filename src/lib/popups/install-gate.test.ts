/**
 * The install popup's (#7) popup-system gates, layered onto
 * lib/pwa/install's shouldShowInstallPrompt: 2nd+-visit only, and
 * never when the shared one-popup-per-session claim is already taken.
 * When the inputs are omitted (older callers), behaviour is unchanged.
 */
import { describe, expect, it } from "vitest";
import { shouldShowInstallPrompt, type InstallPromptInputs } from "../pwa/install";

const base: InstallPromptInputs = {
  standalone: false,
  installed: false,
  platform: "ios",
  hasNativePrompt: false,
  dismissedAt: null,
  now: 1_000_000,
};

describe("install popup — popup-system gates", () => {
  it("omitted inputs keep the legacy behaviour", () => {
    expect(shouldShowInstallPrompt(base)).toBe(true);
  });

  it("first-visit (1 recorded day) never shows", () => {
    expect(shouldShowInstallPrompt({ ...base, visitCount: 1 })).toBe(false);
    expect(shouldShowInstallPrompt({ ...base, visitCount: 0 })).toBe(false);
  });

  it("second visit day may show", () => {
    expect(shouldShowInstallPrompt({ ...base, visitCount: 2 })).toBe(true);
    expect(shouldShowInstallPrompt({ ...base, visitCount: 9 })).toBe(true);
  });

  it("a taken session claim suppresses the bar", () => {
    expect(
      shouldShowInstallPrompt({ ...base, visitCount: 5, sessionClaimed: true }),
    ).toBe(false);
    expect(
      shouldShowInstallPrompt({ ...base, visitCount: 5, sessionClaimed: false }),
    ).toBe(true);
  });

  it("installed/standalone still wins over every other input", () => {
    expect(
      shouldShowInstallPrompt({ ...base, visitCount: 5, standalone: true }),
    ).toBe(false);
  });
});
