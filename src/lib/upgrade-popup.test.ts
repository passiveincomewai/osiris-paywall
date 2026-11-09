import { describe, expect, it } from "vitest";
import {
  DONATE_SHOWN_AT_KEY,
  PROMO_EXCLUSION_MS,
  UPGRADE_SHOWN_AT_KEY,
  donateDeferActive,
  donateShownAt,
  markUpgradeShown,
  readSelection,
  selectionDetail,
  upgradeCheckoutPlan,
  writeSelection,
  type StorageLike,
} from "./upgrade-popup";

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

describe("donation exclusion contract", () => {
  it("stamps we_promo_upgrade_shown_at into BOTH storages", () => {
    const local = fakeStorage();
    const session = fakeStorage();
    markUpgradeShown(1_700_000_000_000, local, session);
    expect(local.map.get(UPGRADE_SHOWN_AT_KEY)).toBe("1700000000000");
    expect(session.map.get(UPGRADE_SHOWN_AT_KEY)).toBe("1700000000000");
  });

  it("defers while a donation prompt was shown less than 5 minutes ago", () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const shownAt = 1_000_000;
    local.setItem(DONATE_SHOWN_AT_KEY, String(shownAt));
    expect(donateDeferActive(shownAt + PROMO_EXCLUSION_MS - 1, local, session)).toBe(true);
  });

  it("does NOT defer at exactly 5 minutes or later", () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const shownAt = 1_000_000;
    session.setItem(DONATE_SHOWN_AT_KEY, String(shownAt));
    expect(donateDeferActive(shownAt + PROMO_EXCLUSION_MS, local, session)).toBe(false);
    expect(donateDeferActive(shownAt + PROMO_EXCLUSION_MS + 60_000, local, session)).toBe(false);
  });

  it("never defers when no donation stamp exists, and reads the newest stamp", () => {
    const local = fakeStorage();
    const session = fakeStorage();
    expect(donateDeferActive(5_000_000, local, session)).toBe(false);
    local.setItem(DONATE_SHOWN_AT_KEY, "100");
    session.setItem(DONATE_SHOWN_AT_KEY, "900");
    expect(donateShownAt(local, session)).toBe(900);
    expect(donateDeferActive(900 + 1_000, local, session)).toBe(true);
  });

  it("tolerates garbage stamps and null storage", () => {
    const local = fakeStorage();
    local.setItem(DONATE_SHOWN_AT_KEY, "not-a-number");
    expect(donateShownAt(local, null)).toBeNull();
    expect(donateDeferActive(123, local, null)).toBe(false);
    expect(donateDeferActive(123, null, null)).toBe(false);
  });
});

describe("session selection memory", () => {
  it("defaults to Pro yearly and round-trips writes", () => {
    const session = fakeStorage();
    expect(readSelection(session)).toEqual({ plan: "pro", interval: "annual" });
    writeSelection(session, { plan: "ultra", interval: "monthly" });
    expect(readSelection(session)).toEqual({ plan: "ultra", interval: "monthly" });
  });

  it("tolerates corrupt stored values", () => {
    const session = fakeStorage();
    session.setItem("we_upgrade_selection", "{broken");
    expect(readSelection(session)).toEqual({ plan: "pro", interval: "annual" });
    session.setItem("we_upgrade_selection", JSON.stringify({ plan: "gold", interval: "weekly" }));
    expect(readSelection(session)).toEqual({ plan: "pro", interval: "annual" });
  });
});

describe("checkout plan mapping (existing /api/checkout ids, price lock)", () => {
  it("maps every tier × interval to the grid's existing plan ids", () => {
    expect(upgradeCheckoutPlan("lite", "monthly")).toBe("lite_monthly");
    expect(upgradeCheckoutPlan("lite", "annual")).toBe("lite_annual");
    expect(upgradeCheckoutPlan("pro", "monthly")).toBe("monthly");
    expect(upgradeCheckoutPlan("pro", "annual")).toBe("annual");
    expect(upgradeCheckoutPlan("ultra", "monthly")).toBe("ultra_monthly");
    expect(upgradeCheckoutPlan("ultra", "annual")).toBe("ultra_annual");
  });

  it("encodes the analytics detail token", () => {
    expect(selectionDetail({ plan: "pro", interval: "annual" })).toBe("pro_annual");
    expect(selectionDetail({ plan: "lite", interval: "monthly" })).toBe("lite_monthly");
  });
});
