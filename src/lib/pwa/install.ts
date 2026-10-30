/**
 * Pure install-prompt state helpers for the WorldEye PWA (F17).
 *
 * Kept free of DOM access so the decision logic is unit-testable in the
 * repo's node-environment vitest setup; the client component
 * (src/components/pwa/InstallPrompt.tsx) gathers the inputs and calls
 * `shouldShowInstallPrompt`.
 */

export const PWA_DISMISS_STORAGE_KEY = "we_pwa_install_dismissed_at";

/** How long a dismissal hides the install bar: 14 days. */
export const PWA_DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export type InstallPlatform = "ios" | "android" | "desktop" | "other";

/**
 * Classify the platform from a user-agent string. iPadOS 13+ sends a
 * macOS desktop UA, so a "macintosh" UA with multi-touch is treated as iOS.
 */
export function detectInstallPlatform(
  userAgent: string,
  maxTouchPoints = 0,
): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("macintosh") && maxTouchPoints > 1) return "ios";
  if (ua.includes("android")) return "android";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "other";
}

/** Parse the stored dismissal timestamp; anything unusable counts as never dismissed. */
export function parseDismissedAt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export interface InstallPromptInputs {
  /** Already running as an installed app (display-mode: standalone / navigator.standalone). */
  standalone: boolean;
  /** The app was installed during a previous visit (best-effort flag). */
  installed: boolean;
  platform: InstallPlatform;
  /** Chromium fired beforeinstallprompt and we hold a deferred prompt. */
  hasNativePrompt: boolean;
  /** Stored dismissal timestamp (ms), or null if never dismissed. */
  dismissedAt: number | null;
  now: number;
}

/**
 * Decide whether the "Add to Home Screen" bar may show.
 *
 * - Never when installed/standalone.
 * - Never during the dismissal cooldown.
 * - iOS Safari has no programmatic prompt, so the bar (which opens the
 *   Share → Add to Home Screen instructions) is allowed whenever the
 *   platform is iOS.
 * - Everywhere else the bar appears only when Chromium has actually
 *   offered a native install prompt — desktop included.
 */
export function shouldShowInstallPrompt(input: InstallPromptInputs): boolean {
  if (input.standalone || input.installed) return false;
  if (
    input.dismissedAt !== null &&
    input.now - input.dismissedAt < PWA_DISMISS_COOLDOWN_MS
  ) {
    return false;
  }
  if (input.platform === "ios") return true;
  return input.hasNativePrompt;
}

export type DesktopOs = "mac" | "windows" | "other";

/**
 * Which bookmark shortcut a desktop OS uses: macOS browsers bookmark
 * with Cmd+D, Windows/Linux/ChromeOS with Ctrl+D. Only consulted when
 * `detectInstallPlatform` already classified the visitor as desktop.
 */
export function detectDesktopOs(userAgent: string): DesktopOs {
  const ua = userAgent.toLowerCase();
  if (ua.includes("macintosh") || ua.includes("mac os")) return "mac";
  if (ua.includes("windows")) return "windows";
  return "other";
}

export interface BookmarkPromptInputs {
  /** Already running as an installed app (display-mode: standalone / navigator.standalone). */
  standalone: boolean;
  /** The app was installed during a previous visit (best-effort flag). */
  installed: boolean;
  platform: InstallPlatform;
  /** Stored dismissal timestamp (ms), or null if never dismissed. */
  dismissedAt: number | null;
  now: number;
}

/**
 * Decide whether the desktop bookmark-teaching bar may show.
 *
 * Desktop gets no install pitch (owner order 2026-10-29); the same
 * bottom bar teaches bookmarking instead. The discipline mirrors the
 * install bar exactly: never when installed/standalone, and the same
 * 14-day dismissal cooldown (the component shares the storage key, so
 * a dismissal of either bar silences both). No native prompt is
 * required — bookmarking needs no browser offer, the same reason iOS
 * shows its instruction bar without one.
 */
export function shouldShowBookmarkPrompt(input: BookmarkPromptInputs): boolean {
  if (input.platform !== "desktop") return false;
  if (input.standalone || input.installed) return false;
  if (
    input.dismissedAt !== null &&
    input.now - input.dismissedAt < PWA_DISMISS_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
}
