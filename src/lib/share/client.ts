"use client";

// ── Universal sharing (client) ───────────────────────────────────────
// Every visitor has a share code:
//  - signed in → their affiliate code (via /api/share/code);
//  - signed out → an anonymous code minted for this device
//    (POST /api/share/identity). The device token that owns it lives
//    in localStorage; when this device signs in, the identity is
//    claimed by the account (AffiliateAttributionSync fires the
//    claim, and /api/share/claim is also callable from the UI).
//
// The code rides every shared link through /ref/<code>, so a visit
// or signup through anything anyone shares attributes exactly like
// the affiliate program always has.

import {
  buildEntityShareUrl,
  entityShareText,
  entityShareTitle,
  type EntityShareRef,
  type ShareEntityKind,
} from "./links";
import type { ShareOutcome } from "../camera-share";

export { type ShareOutcome };

export const SHARE_DEVICE_KEY = "we_share_device";
export const SHARE_CODE_KEY = "we_share_code";

/* ── Device token + cached code ─────────────────────────────────────── */

function randomToken(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch { /* fall through */ }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** This device's share token (created on first use). Null off-browser. */
export function getShareDeviceToken(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    let token = localStorage.getItem(SHARE_DEVICE_KEY);
    if (!token) {
      token = randomToken();
      localStorage.setItem(SHARE_DEVICE_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function readCachedShareCode(): string | null {
  try {
    return localStorage.getItem(SHARE_CODE_KEY);
  } catch {
    return null;
  }
}

function cacheShareCode(code: string): void {
  try {
    localStorage.setItem(SHARE_CODE_KEY, code);
  } catch { /* private mode etc. — sharing still works, just uncached */ }
}

/* ── Code resolution ────────────────────────────────────────────────── */

let inflight: Promise<string | null> | null = null;

async function fetchAccountCode(): Promise<string | null> {
  try {
    const s = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await s.json().catch(() => null);
    if (!session?.user) return null;
    const r = await fetch("/api/share/code", { cache: "no-store" });
    const data = await r.json().catch(() => null);
    return typeof data?.code === "string" && data.code ? data.code : null;
  } catch {
    return null;
  }
}

async function mintAnonCode(): Promise<string | null> {
  const deviceToken = getShareDeviceToken();
  if (!deviceToken) return null;
  try {
    const r = await fetch("/api/share/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken }),
    });
    const data = await r.json().catch(() => null);
    return typeof data?.code === "string" && data.code ? data.code : null;
  } catch {
    return null;
  }
}

/**
 * The current visitor's share code. A signed-in user's account code
 * always wins (it is their one code); otherwise the cached anon code,
 * minted on first need — never at page render, only when the visitor
 * actually shares or asks for their link.
 */
export function ensureShareCode(): Promise<string | null> {
  if (!inflight) {
    inflight = (async () => {
      const account = await fetchAccountCode();
      if (account) {
        cacheShareCode(account);
        return account;
      }
      const cached = readCachedShareCode();
      if (cached) return cached;
      const minted = await mintAnonCode();
      if (minted) cacheShareCode(minted);
      return minted;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** Attach this device's anonymous identity to the signed-in account. */
export async function claimThisDeviceShareIdentity(): Promise<
  { status: string; code?: string; profileCode?: string | null } | null
> {
  const deviceToken = getShareDeviceToken();
  if (!deviceToken) return null;
  try {
    const r = await fetch("/api/share/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken }),
    });
    const data = await r.json().catch(() => null);
    if (data?.profileCode) cacheShareCode(data.profileCode);
    else if (data?.code) cacheShareCode(data.code);
    return data;
  } catch {
    return null;
  }
}

/* ── Share execution (same semantics as lib/camera-share) ───────────── */

export interface ShareActionEnv {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboardWrite?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
}

function defaultShareActionEnv(): ShareActionEnv {
  if (typeof navigator === "undefined") return {};
  const env: ShareActionEnv = {};
  if (typeof navigator.share === "function") {
    env.share = data => navigator.share(data);
  }
  if (typeof navigator.clipboard?.writeText === "function") {
    env.clipboardWrite = text => navigator.clipboard.writeText(text);
  }
  if (typeof document !== "undefined") {
    env.legacyCopy = text => {
      try {
        const input = document.createElement("input");
        input.value = text;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(input);
        return ok;
      } catch {
        return false;
      }
    };
  }
  return env;
}

/** Run the platform share sheet / clipboard for an arbitrary URL. */
export async function shareUrl(
  url: string,
  title: string,
  text: string,
  env: ShareActionEnv = defaultShareActionEnv(),
): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "dismissed";
      /* genuine failure falls through to the clipboard */
    }
  }
  if (env.clipboardWrite) {
    try {
      await env.clipboardWrite(url);
      return "copied";
    } catch { /* fall through */ }
  }
  if (env.legacyCopy) {
    try {
      if (env.legacyCopy(url)) return "copied";
    } catch { /* nothing left */ }
  }
  return "unavailable";
}

/**
 * Share an entity: resolve the visitor's code (never blocking the
 * share when no code is available — the bare deep link still works),
 * build the /ref-carrying URL, and run the share sheet.
 */
export async function shareEntity(
  ref: EntityShareRef,
  opts?: { label?: string | null; code?: string | null; env?: ShareActionEnv },
): Promise<{ outcome: ShareOutcome; url: string }> {
  const code = opts?.code !== undefined ? opts.code : await ensureShareCode().catch(() => null);
  const url = buildEntityShareUrl(ref, code);
  const outcome = await shareUrl(
    url,
    entityShareTitle(ref.kind, opts?.label),
    entityShareText(ref.kind, opts?.label),
    opts?.env,
  );
  return { outcome, url };
}

/* ── Popup bridge ─────────────────────────────────────────────────────
 * The globe's entity popups are HTML strings (maplibre popups in
 * OsirisMap) — they call window.__weShareEntity(kind, id) the same
 * way drone popups call window.__weDroneFollowToggle. Installed once
 * by ShareButton / ShareLinkBlock on the globe. */

declare global {
  interface Window {
    __weShareEntity?: (kind: ShareEntityKind, id: string) => void;
  }
}

let bridgeInstalled = false;

export function installShareEntityBridge(): void {
  if (bridgeInstalled || typeof window === "undefined") return;
  bridgeInstalled = true;
  window.__weShareEntity = (kind: ShareEntityKind, id: string) => {
    void shareEntity({ kind, id }).catch(() => {});
  };
}
