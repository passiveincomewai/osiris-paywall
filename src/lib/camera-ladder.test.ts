import { describe, it, expect } from "vitest";
import { FREE_CAMERA_CLICKS } from "./cameraGate";
import {
  ACCOUNT_LADDER_TOTAL,
  EMAIL_LADDER_TOTAL,
  EMAIL_UNLOCK_OPENS,
  ACCOUNT_UNLOCK_OPENS,
  VERIFY_UNLOCK_OPENS,
  LADDER_STORAGE_KEY,
  SHARE_PROMPT_SESSION_KEY,
  TIMED_POPUP_COOLDOWN_MS,
  TIMED_POPUP_DELAY_MS,
  TIMED_POPUP_MIN_OPENS,
  TIMED_POPUP_SESSION_KEY,
  isPromptExcludedPath,
  ladderAllowance,
  ladderPromptFor,
  ladderTier,
  markEmailUnlocked,
  markTimedDismissed,
  parseLadderRecord,
  readLadderRecord,
  readSessionFlag,
  shareAwayShouldShow,
  timedPopupShouldShow,
  writeSessionFlag,
  type StorageLike,
} from "./camera-ladder";

// In-memory Storage stub, the same shape cameraGate's suite uses.
function installStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const stub: StorageLike = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
  };
  return { stub, map };
}

describe("the ladder shape (BRIEF F4 + the 2026-10-29 verification rung)", () => {
  it("is 5 anonymous / +5 email = 10, and 5 unverified / +5 verified = 10, derived from the base", () => {
    expect(EMAIL_UNLOCK_OPENS).toBe(5);
    expect(VERIFY_UNLOCK_OPENS).toBe(5);
    expect(ACCOUNT_UNLOCK_OPENS).toBe(VERIFY_UNLOCK_OPENS);
    expect(EMAIL_LADDER_TOTAL).toBe(FREE_CAMERA_CLICKS + 5);
    expect(ACCOUNT_LADDER_TOTAL).toBe(FREE_CAMERA_CLICKS + VERIFY_UNLOCK_OPENS);
    expect(ACCOUNT_LADDER_TOTAL).toBe(10);
  });

  it("a session outranks the email flag; the flag outranks bare anonymous", () => {
    expect(ladderTier({ signedIn: true, emailUnlocked: true, emailVerified: true })).toBe("account");
    expect(ladderTier({ signedIn: true, emailUnlocked: false, emailVerified: true })).toBe("account");
    expect(ladderTier({ signedIn: false, emailUnlocked: true })).toBe("email");
    expect(ladderTier({ signedIn: false, emailUnlocked: false })).toBe("anonymous");
  });

  it("a signed-in session splits on verification: unverified is its own rung", () => {
    expect(ladderTier({ signedIn: true, emailUnlocked: false, emailVerified: false })).toBe("account-unverified");
    expect(ladderTier({ signedIn: true, emailUnlocked: true, emailVerified: false })).toBe("account-unverified");
    // Absent (legacy session payload) reads unverified, never verified.
    expect(ladderTier({ signedIn: true, emailUnlocked: false })).toBe("account-unverified");
  });

  it("allowances follow the tier", () => {
    expect(ladderAllowance("anonymous")).toBe(5);
    expect(ladderAllowance("email")).toBe(10);
    expect(ladderAllowance("account-unverified")).toBe(5);
    expect(ladderAllowance("account")).toBe(10);
  });
});

describe("ladderPromptFor — always the NEXT rung, never a skip to Pro", () => {
  it("anonymous opens freely to 5, then meets the middle-tier (email) prompt", () => {
    for (let opens = 0; opens < 5; opens++) {
      expect(ladderPromptFor({ opens, signedIn: false, emailUnlocked: false })).toBeNull();
    }
    expect(ladderPromptFor({ opens: 5, signedIn: false, emailUnlocked: false })).toBe("email");
    expect(ladderPromptFor({ opens: 9, signedIn: false, emailUnlocked: false })).toBe("email");
  });

  it("after the email step, opens freely to 10, then meets the account prompt — still not Pro", () => {
    for (let opens = 5; opens < 10; opens++) {
      expect(ladderPromptFor({ opens, signedIn: false, emailUnlocked: true })).toBeNull();
    }
    expect(ladderPromptFor({ opens: 10, signedIn: false, emailUnlocked: true })).toBe("account");
    expect(ladderPromptFor({ opens: 14, signedIn: false, emailUnlocked: true })).toBe("account");
  });

  it("an UNVERIFIED free account opens freely to 5; then the prompt is VERIFY, not Pro", () => {
    for (let opens = 0; opens < 5; opens++) {
      expect(ladderPromptFor({ opens, signedIn: true, emailUnlocked: false, emailVerified: false })).toBeNull();
    }
    expect(ladderPromptFor({ opens: 5, signedIn: true, emailUnlocked: false, emailVerified: false })).toBe("verify");
    expect(ladderPromptFor({ opens: 9, signedIn: true, emailUnlocked: true, emailVerified: false })).toBe("verify");
  });

  it("a VERIFIED free account opens freely to 10; only then is the prompt Pro", () => {
    for (let opens = 0; opens < 10; opens++) {
      expect(ladderPromptFor({ opens, signedIn: true, emailUnlocked: false, emailVerified: true })).toBeNull();
    }
    expect(ladderPromptFor({ opens: 10, signedIn: true, emailUnlocked: false, emailVerified: true })).toBe("pro");
    expect(ladderPromptFor({ opens: 40, signedIn: true, emailUnlocked: true, emailVerified: true })).toBe("pro");
  });
});

describe("the ladder record", () => {
  it("round-trips both fields under the one key, merge-writing", () => {
    const { stub, map } = installStorage();
    expect(readLadderRecord(stub)).toBeNull();
    expect(markEmailUnlocked(stub, 111)).toBe(true);
    expect(markTimedDismissed(stub, 222)).toBe(true);
    expect(readLadderRecord(stub)).toEqual({ emailUnlockedAt: 111, timedDismissedAt: 222 });
    expect(map.has(LADDER_STORAGE_KEY)).toBe(true);
  });

  it("treats corrupt or partial records as their sane parts", () => {
    expect(parseLadderRecord(null)).toBeNull();
    expect(parseLadderRecord("not json")).toBeNull();
    expect(parseLadderRecord('{"emailUnlockedAt":"soon"}')).toEqual({
      emailUnlockedAt: null,
      timedDismissedAt: null,
    });
    expect(parseLadderRecord('{"emailUnlockedAt":5}')).toEqual({
      emailUnlockedAt: 5,
      timedDismissedAt: null,
    });
  });

  it("degrades quietly when storage is missing or refuses", () => {
    expect(readLadderRecord(null)).toBeNull();
    expect(markEmailUnlocked(null)).toBe(false);
    const refusing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readLadderRecord(refusing)).toBeNull();
    expect(markTimedDismissed(refusing)).toBe(false);
  });
});

describe("session flags", () => {
  it("read/write round-trips, defaults false", () => {
    const { stub } = installStorage();
    expect(readSessionFlag(stub, TIMED_POPUP_SESSION_KEY)).toBe(false);
    writeSessionFlag(stub, TIMED_POPUP_SESSION_KEY);
    expect(readSessionFlag(stub, TIMED_POPUP_SESSION_KEY)).toBe(true);
    expect(readSessionFlag(stub, SHARE_PROMPT_SESSION_KEY)).toBe(false);
    expect(readSessionFlag(null, TIMED_POPUP_SESSION_KEY)).toBe(false);
  });
});

describe("prompt-excluded paths", () => {
  it("covers pricing, checkout and settings, incl. sub-paths — nothing else", () => {
    for (const p of ["/pricing", "/pricing/annual", "/checkout", "/checkout/embedded", "/settings", "/settings/alerts"]) {
      expect(isPromptExcludedPath(p)).toBe(true);
    }
    for (const p of ["/", "/cameras", "/live-webcams", "/priceless", "/settingsx"]) {
      expect(isPromptExcludedPath(p)).toBe(false);
    }
  });
});

describe("timedPopupShouldShow — F4's timed popup discipline", () => {
  const base = {
    now: 1_000_000,
    mountedAt: 0,
    opens: 0,
    shownThisSession: false,
    otherPromptOpen: false,
    record: null,
    pathname: "/",
    premium: false,
  };

  it("waits for real exploring: ~75s on page, or a few opens", () => {
    expect(TIMED_POPUP_DELAY_MS).toBeGreaterThanOrEqual(60_000);
    expect(TIMED_POPUP_DELAY_MS).toBeLessThanOrEqual(90_000);
    expect(timedPopupShouldShow({ ...base, now: TIMED_POPUP_DELAY_MS - 1 })).toBe(false);
    expect(timedPopupShouldShow({ ...base, now: TIMED_POPUP_DELAY_MS })).toBe(true);
    expect(timedPopupShouldShow({ ...base, now: 5_000, opens: TIMED_POPUP_MIN_OPENS })).toBe(true);
    expect(timedPopupShouldShow({ ...base, now: 5_000, opens: TIMED_POPUP_MIN_OPENS - 1 })).toBe(false);
  });

  it("is once per session, and never for premium", () => {
    expect(timedPopupShouldShow({ ...base, shownThisSession: true })).toBe(false);
    expect(timedPopupShouldShow({ ...base, premium: true })).toBe(false);
  });

  it("never stacks with another prompt and never lands on excluded surfaces", () => {
    expect(timedPopupShouldShow({ ...base, otherPromptOpen: true })).toBe(false);
    expect(timedPopupShouldShow({ ...base, pathname: "/pricing" })).toBe(false);
    expect(timedPopupShouldShow({ ...base, pathname: "/settings/alerts" })).toBe(false);
    expect(timedPopupShouldShow({ ...base, pathname: "/checkout" })).toBe(false);
  });

  it("a dismissal retires it for the multi-day cooldown, then it may return", () => {
    const record = { emailUnlockedAt: null, timedDismissedAt: 500_000 };
    expect(timedPopupShouldShow({ ...base, record, now: 500_000 + TIMED_POPUP_COOLDOWN_MS - 1 })).toBe(false);
    expect(
      timedPopupShouldShow({ ...base, record, now: 500_000 + TIMED_POPUP_COOLDOWN_MS + TIMED_POPUP_DELAY_MS }),
    ).toBe(true);
    expect(TIMED_POPUP_COOLDOWN_MS).toBeGreaterThanOrEqual(2 * 24 * 60 * 60 * 1000);
  });
});

describe("shareAwayShouldShow — F11's one soft prompt, on navigating away", () => {
  const base = {
    arrivedViaShare: true,
    sharedCameraOpened: true,
    navigatedAway: true,
    shownThisSession: false,
    otherPromptOpen: false,
    pathname: "/",
    signedIn: false,
    premium: false,
  };

  it("shows for the textbook shared-link explorer", () => {
    expect(shareAwayShouldShow(base)).toBe(true);
  });

  it("never before the away-navigation, and never for a direct (non-share) visit", () => {
    expect(shareAwayShouldShow({ ...base, navigatedAway: false })).toBe(false);
    expect(shareAwayShouldShow({ ...base, arrivedViaShare: false })).toBe(false);
  });

  it("a walled shared open doesn't count — that visitor met the ladder instead", () => {
    expect(shareAwayShouldShow({ ...base, sharedCameraOpened: false })).toBe(false);
  });

  it("once per session, unstacked, and only for anonymous visitors", () => {
    expect(shareAwayShouldShow({ ...base, shownThisSession: true })).toBe(false);
    expect(shareAwayShouldShow({ ...base, otherPromptOpen: true })).toBe(false);
    expect(shareAwayShouldShow({ ...base, signedIn: true })).toBe(false);
    expect(shareAwayShouldShow({ ...base, premium: true })).toBe(false);
    expect(shareAwayShouldShow({ ...base, pathname: "/pricing" })).toBe(false);
  });
});
