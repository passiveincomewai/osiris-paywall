// Phase E funnel taxonomy pins: the three events, the surface set,
// and the composite detail token every read-side query will split on.
// The ingest route stores ONE detail token ([a-z0-9_], ≤24 chars —
// lib/analytics/ingest-fields), so these tests prove every real
// surface × plan combination survives that cap intact: a truncated
// plan key would silently corrupt the funnel read.
import { describe, it, expect, vi, beforeEach } from "vitest";

const trackMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/AnalyticsTracker", () => ({
  trackAnalyticsEvent: trackMock,
}));

import {
  CHECKOUT_STARTED_EVENT,
  PICKER_OPENED_EVENT,
  PLAN_SELECTED_EVENT,
  pickerFunnelDetail,
  trackCheckoutStarted,
  trackPickerOpened,
  trackPlanSelected,
  type PickerSurface,
} from "./picker-analytics";
import { GRID_PLAN_OPTIONS } from "./trial-checkout";

const SURFACES: PickerSurface[] = [
  "picker",
  "dialog",
  "embed",
  "cta",
  "pricing",
  "sheet",
  "hosted",
  "direct",
];

describe("pickerFunnelDetail", () => {
  it("composes <surface>_<planKey>", () => {
    expect(pickerFunnelDetail("picker", "annual")).toBe("picker_annual");
    expect(pickerFunnelDetail("embed", "ultra_monthly")).toBe("embed_ultra_monthly");
    expect(pickerFunnelDetail("cta", "lite_weekly")).toBe("cta_lite_weekly");
    expect(pickerFunnelDetail("dialog", "weekly")).toBe("dialog_weekly");
  });

  it("keeps every surface × grid plan inside the ingest cap, untruncated", () => {
    const plans = GRID_PLAN_OPTIONS.map((o) => o.plan);
    expect(plans).toHaveLength(9);
    for (const surface of SURFACES) {
      for (const plan of plans) {
        const detail = pickerFunnelDetail(surface, plan);
        expect(detail).toBe(`${surface}_${plan}`);
        expect(detail.length).toBeLessThanOrEqual(24);
        expect(detail).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("keeps the standalone plans (sheet hosts) intact too", () => {
    for (const plan of ["ambient", "ski", "enterprise"]) {
      const detail = pickerFunnelDetail("sheet", plan);
      expect(detail).toBe(`sheet_${plan}`);
      expect(detail.length).toBeLessThanOrEqual(24);
    }
  });

  it("normalizes anything outside the ingest alphabet away", () => {
    expect(pickerFunnelDetail("picker", "Ultra Monthly!")).toBe("picker_ultramonthly");
  });
});

describe("funnel emitters", () => {
  beforeEach(() => trackMock.mockClear());

  it("picker_opened carries the surface + headline plan", () => {
    trackPickerOpened("picker", "annual");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(PICKER_OPENED_EVENT, "picker_annual");
    expect(PICKER_OPENED_EVENT).toBe("picker_opened");
  });

  it("plan_selected carries the surface + resulting plan", () => {
    trackPlanSelected("embed", "lite_annual");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(PLAN_SELECTED_EVENT, "embed_lite_annual");
    expect(PLAN_SELECTED_EVENT).toBe("plan_selected");
  });

  it("checkout_started carries the surface + plan", () => {
    trackCheckoutStarted("pricing", "ultra_annual");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(CHECKOUT_STARTED_EVENT, "pricing_ultra_annual");
    expect(CHECKOUT_STARTED_EVENT).toBe("checkout_started");
  });
});
