import { describe, it, expect } from "vitest";
import {
  parseVariant,
  parseDevice,
  parseEventDetail,
  deviceClassFromUserAgent,
  splitEvent,
} from "./ingest-fields";

describe("parseVariant", () => {
  it("accepts A/B, normalizing the client's lowercase cookie values", () => {
    expect(parseVariant("A")).toBe("A");
    expect(parseVariant("B")).toBe("B");
    // src/lib/onboarding/storage.ts persists the group as "a"/"b".
    expect(parseVariant("a")).toBe("A");
    expect(parseVariant("b")).toBe("B");
    expect(parseVariant("C")).toBeNull();
    expect(parseVariant("ab")).toBeNull();
    expect(parseVariant(1)).toBeNull();
    expect(parseVariant(undefined)).toBeNull();
  });
});

describe("parseDevice", () => {
  it("accepts only the three coarse classes", () => {
    expect(parseDevice("mobile")).toBe("mobile");
    expect(parseDevice("tablet")).toBe("tablet");
    expect(parseDevice("desktop")).toBe("desktop");
    expect(parseDevice("phone")).toBeNull();
    expect(parseDevice(null)).toBeNull();
  });
});

describe("deviceClassFromUserAgent", () => {
  it("classifies iPhone as mobile and iPad as tablet", () => {
    expect(
      deviceClassFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("mobile");
    expect(
      deviceClassFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("tablet");
  });
  it("classifies Android phones as mobile, Android tablets as tablet", () => {
    expect(deviceClassFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36")).toBe("mobile");
    expect(deviceClassFromUserAgent("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36")).toBe("tablet");
  });
  it("classifies desktop browsers as desktop and empty UA as null", () => {
    expect(deviceClassFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126")).toBe(
      "desktop",
    );
    expect(deviceClassFromUserAgent("")).toBeNull();
    expect(deviceClassFromUserAgent(null)).toBeNull();
  });
});

describe("parseEventDetail + splitEvent", () => {
  it("keeps machine tokens, drops junk", () => {
    expect(parseEventDetail("3")).toBe("3");
    expect(parseEventDetail("Camera")).toBe("camera");
    expect(parseEventDetail("step 2!")).toBe("step2");
    expect(parseEventDetail("")).toBeNull();
    expect(parseEventDetail(3)).toBeNull();
    expect(parseEventDetail("x".repeat(40))).toHaveLength(24);
  });
  it("round-trips stored event values", () => {
    expect(splitEvent("onboarding_step_complete:3")).toEqual({ name: "onboarding_step_complete", detail: "3" });
    expect(splitEvent("feature_first_use:camera")).toEqual({ name: "feature_first_use", detail: "camera" });
    expect(splitEvent("globe_reached")).toEqual({ name: "globe_reached", detail: null });
  });
});
