import { describe, it, expect } from "vitest";
import {
  POPUP_FREQ_WINDOW_MS,
  applyCameraVisit,
  applyVisitDay,
  arbitrate,
  claimSession,
  dayKey,
  frequencyAllows,
  habitualCameras,
  isPopupExcludedPath,
  parseCameraVisitsRecord,
  parseFreqRecord,
  parseVisitsRecord,
  readSessionClaim,
  stripLocalePrefix,
  type FreqRecord,
  type PopupId,
  type StorageLike,
} from "./manager";

function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  map: Map<string, string>;
} {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

const NOW = Date.UTC(2026, 9, 29, 18, 0, 0); // 2026-10-29

function arb(over: Partial<Parameters<typeof arbitrate>[0]> = {}) {
  return arbitrate({
    candidates: [],
    sessionClaim: null,
    freq: {},
    now: NOW,
    modalOpen: false,
    pathname: "/",
    ...over,
  });
}

describe("arbitrate — one popup per session", () => {
  it("shows nothing when the session is already claimed by this system", () => {
    expect(arb({ candidates: ["welcome_back"], sessionClaim: "install" })).toEqual({
      show: null,
      reason: "session-claimed",
    });
  });

  it("shows nothing when the session was claimed externally (newsletter Google popup / install bar)", () => {
    expect(arb({ candidates: ["welcome_back"], sessionClaim: "external" }).show).toBeNull();
  });

  it("defers while any modal dialog is open (ladder prompt, checkout sheet)", () => {
    expect(arb({ candidates: ["pricing_save"], modalOpen: true })).toEqual({
      show: null,
      reason: "modal-open",
    });
  });

  it("picks the highest priority among simultaneous candidates", () => {
    const r = arb({
      candidates: ["share_view", "engaged_watcher", "happening_now", "end_of_article"],
    });
    expect(r.show).toBe("happening_now");
  });

  it("pricing_save outranks trial_waiting, which outranks the rest", () => {
    expect(
      arb({ candidates: ["trial_waiting", "pricing_save"], pathname: "/pricing" }).show,
    ).toBe("pricing_save");
    expect(
      arb({ candidates: ["welcome_back", "trial_waiting", "happening_now"] }).show,
    ).toBe("trial_waiting");
  });

  it("powder_pass sits between trial_waiting and happening_now", () => {
    expect(
      arb({ candidates: ["happening_now", "powder_pass"], pathname: "/ski-webcams" }).show,
    ).toBe("powder_pass");
    expect(
      arb({ candidates: ["trial_waiting", "powder_pass"], pathname: "/ski-webcams" }).show,
    ).toBe("trial_waiting");
  });
});

describe("arbitrate — path discipline", () => {
  it("never fires on checkout, auth, settings or admin surfaces", () => {
    for (const p of ["/checkout", "/admin/users", "/signin", "/signup", "/settings", "/welcome"]) {
      expect(arb({ candidates: ["welcome_back"], pathname: p }).show).toBeNull();
    }
    expect(arb({ candidates: ["welcome_back"], pathname: "/checkout" }).reason).toBe(
      "excluded-path",
    );
  });

  it("keeps every non-pricing popup off /pricing, but pricing_save lives there", () => {
    expect(arb({ candidates: ["welcome_back"], pathname: "/pricing" }).show).toBeNull();
    expect(arb({ candidates: ["pricing_save"], pathname: "/pricing" }).show).toBe(
      "pricing_save",
    );
    // …but pricing_save itself still never fires on /checkout
    expect(arb({ candidates: ["pricing_save"], pathname: "/checkout" }).show).toBeNull();
  });

  it("applies the same rules under a locale prefix", () => {
    expect(stripLocalePrefix("/es/pricing")).toBe("/pricing");
    expect(isPopupExcludedPath("/es/checkout")).toBe(true);
    expect(arb({ candidates: ["pricing_save"], pathname: "/es/pricing" }).show).toBe(
      "pricing_save",
    );
    expect(arb({ candidates: ["welcome_back"], pathname: "/es/pricing" }).show).toBeNull();
  });
});

describe("frequency — 7-day cross-visit cap", () => {
  it("blocks a popup shown 6 days ago, allows one shown 8 days ago", () => {
    const freq: FreqRecord = { welcome_back: NOW - 6 * 24 * 3600 * 1000 };
    expect(frequencyAllows(freq, "welcome_back", NOW)).toBe(false);
    expect(arb({ candidates: ["welcome_back"], freq }).show).toBeNull();
    const old: FreqRecord = { welcome_back: NOW - 8 * 24 * 3600 * 1000 };
    expect(frequencyAllows(old, "welcome_back", NOW)).toBe(true);
    expect(arb({ candidates: ["welcome_back"], freq: old }).show).toBe("welcome_back");
  });

  it("the window is exactly 7 days", () => {
    const freq: FreqRecord = { share_view: NOW - POPUP_FREQ_WINDOW_MS };
    expect(frequencyAllows(freq, "share_view", NOW)).toBe(true);
    const justInside: FreqRecord = { share_view: NOW - POPUP_FREQ_WINDOW_MS + 1 };
    expect(frequencyAllows(justInside, "share_view", NOW)).toBe(false);
  });

  it("trial_waiting is exempt from the 7-day cap (once-ever is its own key)", () => {
    const freq: FreqRecord = { trial_waiting: NOW - 1000 };
    expect(frequencyAllows(freq, "trial_waiting", NOW)).toBe(true);
  });

  it("a freq-blocked high-priority popup yields to an allowed lower one", () => {
    const freq: FreqRecord = { happening_now: NOW - 1000 };
    expect(arb({ candidates: ["happening_now", "share_view"], freq }).show).toBe(
      "share_view",
    );
  });

  it("parseFreqRecord drops junk and keeps real entries", () => {
    expect(parseFreqRecord(null)).toEqual({});
    expect(parseFreqRecord("not json")).toEqual({});
    expect(
      parseFreqRecord(JSON.stringify({ welcome_back: 123, bogus: 5, install: "x" })),
    ).toEqual({ welcome_back: 123 });
  });
});

describe("session claim", () => {
  it("claimSession writes both keys and readSessionClaim round-trips", () => {
    const s = fakeStorage();
    expect(readSessionClaim(s)).toBeNull();
    claimSession(s, "welcome_back");
    expect(readSessionClaim(s)).toBe("welcome_back");
  });

  it("the generic claim key alone reads as an external claim", () => {
    const s = fakeStorage({ "worldeye.popupClaimed": "google-signup" });
    expect(readSessionClaim(s)).toBe("external");
  });

  it("an unknown id in the claim key does not read as a system claim", () => {
    const s = fakeStorage({ "worldeye.popups.sessionClaim": "nope" });
    expect(readSessionClaim(s)).toBeNull();
  });

  it("blocked storage degrades to no claim, never a throw", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readSessionClaim(throwing)).toBeNull();
    expect(() => claimSession(throwing, "install")).not.toThrow();
  });
});

describe("visit days", () => {
  it("first-ever visit is not a return day", () => {
    const out = applyVisitDay({ days: [] }, "2026-10-29");
    expect(out.isReturnDay).toBe(false);
    expect(out.priorDays).toBe(0);
    expect(out.totalDays).toBe(1);
  });

  it("a visit on a later day is a return day; same-day re-apply is idempotent", () => {
    const first = applyVisitDay({ days: [] }, "2026-10-28");
    const second = applyVisitDay(first.record, "2026-10-29");
    expect(second.isReturnDay).toBe(true);
    expect(second.priorDays).toBe(1);
    const again = applyVisitDay(second.record, "2026-10-29");
    expect(again.totalDays).toBe(2);
    expect(again.priorDays).toBe(1);
  });

  it("dayKey formats the visitor-local calendar day", () => {
    expect(dayKey(new Date(2026, 0, 5, 12, 0, 0).getTime())).toBe("2026-01-05");
  });

  it("parseVisitsRecord filters malformed days", () => {
    expect(parseVisitsRecord(JSON.stringify({ days: ["2026-10-29", "junk", 5] }))).toEqual(
      { days: ["2026-10-29"] },
    );
    expect(parseVisitsRecord("{}")).toEqual({ days: [] });
  });
});

describe("per-camera visit days (your_camera)", () => {
  it("counts distinct days per camera, idempotent within a day", () => {
    let rec = {};
    let out = applyCameraVisit(rec, "cam-1", "Big Sur", "2026-10-27");
    expect(out.distinctDays).toBe(1);
    out = applyCameraVisit(out.record, "cam-1", "Big Sur", "2026-10-27");
    expect(out.distinctDays).toBe(1);
    out = applyCameraVisit(out.record, "cam-1", null, "2026-10-28");
    expect(out.distinctDays).toBe(2);
    out = applyCameraVisit(out.record, "cam-1", null, "2026-10-29");
    expect(out.distinctDays).toBe(3);
    // the name survives later null-name visits
    expect(out.record["cam-1"].name).toBe("Big Sur");
    rec = out.record;
    expect(habitualCameras(rec, 3)).toEqual([
      { key: "cam-1", name: "Big Sur", distinctDays: 3 },
    ]);
    expect(habitualCameras(rec, 4)).toEqual([]);
  });

  it("tracks cameras independently", () => {
    let rec = {};
    rec = applyCameraVisit(rec, "a", null, "2026-10-29").record;
    rec = applyCameraVisit(rec, "b", null, "2026-10-29").record;
    rec = applyCameraVisit(rec, "b", null, "2026-10-28").record;
    expect(habitualCameras(rec, 2).map((c) => c.key)).toEqual(["b"]);
  });

  it("parseCameraVisitsRecord drops malformed entries", () => {
    expect(
      parseCameraVisitsRecord(
        JSON.stringify({ ok: { days: ["2026-10-29"], name: null }, bad: { days: "x" } }),
      ),
    ).toEqual({ ok: { days: ["2026-10-29"], name: null } });
  });
});

describe("candidate plumbing", () => {
  it("empty candidates arbitrate to none-eligible", () => {
    expect(arb({})).toEqual({ show: null, reason: "none-eligible" });
  });

  it("every PopupId has a valid analytics detail token (≤24 chars, [a-z0-9_])", async () => {
    const { POPUP_EVENT_DETAIL } = await import("./manager");
    for (const token of Object.values(POPUP_EVENT_DETAIL)) {
      expect(token).toMatch(/^[a-z0-9_]{1,24}$/);
    }
  });
});
