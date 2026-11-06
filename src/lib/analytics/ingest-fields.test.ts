import { describe, it, expect } from "vitest";
import {
  parseVariant,
  parseDevice,
  parseVisitorId,
  parseEventDetail,
  parseSearchDetail,
  parseCameraId,
  parseCameraName,
  CAMERA_ID_MAX,
  CAMERA_NAME_MAX,
  SEARCH_PERFORMED_EVENT,
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

describe("parseVisitorId", () => {
  it("accepts canonical UUIDs and normalizes them to lowercase", () => {
    expect(parseVisitorId("123e4567-e89b-42d3-a456-426614174000")).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(parseVisitorId("123E4567-E89B-42D3-A456-426614174000")).toBe("123e4567-e89b-42d3-a456-426614174000");
  });
  it("rejects sessionId-shaped tokens, junk, and non-strings", () => {
    // A per-visit sessionId must never be stored as a visitor ID.
    expect(parseVisitorId("k3j9x2abc123")).toBeNull();
    expect(parseVisitorId("nosession")).toBeNull();
    expect(parseVisitorId("unknown")).toBeNull();
    expect(parseVisitorId("123e4567e89b42d3a456426614174000")).toBeNull(); // hyphens required
    expect(parseVisitorId("123e4567-e89b-42d3-a456-42661417400")).toBeNull(); // too short
    expect(parseVisitorId("")).toBeNull();
    expect(parseVisitorId(null)).toBeNull();
    expect(parseVisitorId(undefined)).toBeNull();
    expect(parseVisitorId(42)).toBeNull();
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

describe("parseSearchDetail (search_performed payload)", () => {
  it("accepts the '<count>_<query token>' shape the client builder emits", () => {
    expect(SEARCH_PERFORMED_EVENT).toBe("search_performed");
    expect(parseSearchDetail("0_jamaica")).toBe("0_jamaica");
    expect(parseSearchDetail("12_eiffel_tower")).toBe("12_eiffel_tower");
    expect(parseSearchDetail("3_10_downing_street")).toBe("3_10_downing_street");
    // Longer than the 24-char bare-token cap — the whole point of the exception.
    expect(parseSearchDetail("7_a_much_longer_place_name_query_token")).toBe("7_a_much_longer_place_name_query_token");
  });
  it("sanitizes like parseEventDetail before validating the shape", () => {
    expect(parseSearchDetail("12_Eiffel Tower!")).toBe("12_eiffeltower");
    expect(parseSearchDetail("0_JAMAICA")).toBe("0_jamaica");
  });
  it("rejects anything that is not count + token", () => {
    expect(parseSearchDetail("jamaica")).toBeNull();
    expect(parseSearchDetail("_jamaica")).toBeNull();
    expect(parseSearchDetail("x_jamaica")).toBeNull();
    expect(parseSearchDetail("0_")).toBeNull();
    expect(parseSearchDetail("")).toBeNull();
    expect(parseSearchDetail(0)).toBeNull();
    expect(parseSearchDetail(undefined)).toBeNull();
  });
  it("caps the detail at 60 chars so the stored event stays within 80", () => {
    const cleaned = parseSearchDetail(`9_${"a".repeat(100)}`);
    expect(cleaned).not.toBeNull();
    expect(cleaned!.length).toBe(60);
    expect(`search_performed:${cleaned}`.length).toBeLessThanOrEqual(80);
  });
});

describe("parseCameraId", () => {
  it("accepts real camera ids verbatim — dashed slugs and CAM- codes", () => {
    expect(parseCameraId("sky-maldives-sunset-beach-veligandu-maldives-resort-island-5535")).toBe(
      "sky-maldives-sunset-beach-veligandu-maldives-resort-island-5535",
    );
    expect(parseCameraId("CAM-9009-4833")).toBe("CAM-9009-4833");
    expect(parseCameraId("12345")).toBe("12345");
  });
  it("rejects non-strings, blanks, whitespace and overlong values", () => {
    expect(parseCameraId(undefined)).toBeNull();
    expect(parseCameraId(null)).toBeNull();
    expect(parseCameraId(42)).toBeNull();
    expect(parseCameraId("")).toBeNull();
    expect(parseCameraId("   ")).toBeNull();
    expect(parseCameraId("has spaces")).toBeNull();
    expect(parseCameraId("a/b?c")).toBeNull();
    expect(parseCameraId("x".repeat(CAMERA_ID_MAX + 1))).toBeNull();
    expect(parseCameraId("x".repeat(CAMERA_ID_MAX))).toBe("x".repeat(CAMERA_ID_MAX));
  });
  it("trims surrounding whitespace", () => {
    expect(parseCameraId("  CAM-1  ")).toBe("CAM-1");
  });
});

describe("parseCameraName", () => {
  it("keeps a normal display name", () => {
    expect(parseCameraName("Sukiyabashi Crossing, Tokyo")).toBe("Sukiyabashi Crossing, Tokyo");
  });
  it("rejects non-strings and blanks, strips control chars, caps length", () => {
    expect(parseCameraName(undefined)).toBeNull();
    expect(parseCameraName("")).toBeNull();
    expect(parseCameraName("   ")).toBeNull();
    expect(parseCameraName("a\u0000b")).toBe("a b");
    expect(parseCameraName("n".repeat(CAMERA_NAME_MAX + 50))!.length).toBe(CAMERA_NAME_MAX);
  });
});
