import { describe, it, expect } from "vitest";
import {
  EMAIL_CAPTURE_STORAGE_KEY,
  CAPTURE_IMPRESSION_EVENT,
  CAPTURE_SUBSCRIBE_EVENT,
  parseCaptureRecord,
  readCaptureRecord,
  writeCaptureRecord,
  shouldShowCameraCapture,
  shouldShowPricingCapture,
  captureSourceFor,
  captureDetailFor,
  type StorageLike,
} from "./capture";
import { parseEventDetail } from "@/lib/analytics/ingest-fields";

/** In-memory Storage stub (the rules take the storage as an argument). */
function stubStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
  };
}

const dismissed = { outcome: "dismissed" as const, at: 1 };
const subscribed = { outcome: "subscribed" as const, at: 1 };

describe("capture record parsing", () => {
  it("treats missing, corrupt and foreign values as no record", () => {
    expect(parseCaptureRecord(null)).toBeNull();
    expect(parseCaptureRecord("")).toBeNull();
    expect(parseCaptureRecord("not json")).toBeNull();
    expect(parseCaptureRecord(JSON.stringify({ outcome: "later" }))).toBeNull();
    expect(parseCaptureRecord(JSON.stringify({ hello: 1 }))).toBeNull();
  });

  it("round-trips a written record through storage", () => {
    const s = stubStorage();
    expect(writeCaptureRecord(s, "dismissed", 1234)).toBe(true);
    expect(s.map.get(EMAIL_CAPTURE_STORAGE_KEY)).toBe(
      JSON.stringify({ outcome: "dismissed", at: 1234 }),
    );
    expect(readCaptureRecord(s)).toEqual({ outcome: "dismissed", at: 1234 });
  });

  it("survives storage that throws (private mode, blocked cookies)", () => {
    const hostile: StorageLike = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(readCaptureRecord(hostile)).toBeNull();
    expect(writeCaptureRecord(hostile, "subscribed")).toBe(false);
    expect(readCaptureRecord(null)).toBeNull();
    expect(writeCaptureRecord(null, "subscribed")).toBe(false);
  });
});

describe("camera placement visibility", () => {
  it("stays hidden until the device's first camera open", () => {
    expect(shouldShowCameraCapture(null, 0)).toBe(false);
    expect(shouldShowCameraCapture(null, 1)).toBe(true);
    expect(shouldShowCameraCapture(null, 9)).toBe(true);
  });

  it("never shows again after a dismissal — at any open count", () => {
    expect(shouldShowCameraCapture(dismissed, 1)).toBe(false);
    expect(shouldShowCameraCapture(dismissed, 50)).toBe(false);
  });

  it("never shows again after subscribing", () => {
    expect(shouldShowCameraCapture(subscribed, 1)).toBe(false);
    expect(shouldShowCameraCapture(subscribed, 50)).toBe(false);
  });
});

describe("pricing placement visibility", () => {
  it("shows only to devices that were never asked", () => {
    expect(shouldShowPricingCapture(null)).toBe(true);
    expect(shouldShowPricingCapture(dismissed)).toBe(false);
    expect(shouldShowPricingCapture(subscribed)).toBe(false);
  });

  it("an outcome at one placement retires the other (one record per device)", () => {
    const s = stubStorage();
    writeCaptureRecord(s, "subscribed");
    const record = readCaptureRecord(s);
    expect(shouldShowCameraCapture(record, 5)).toBe(false);
    expect(shouldShowPricingCapture(record)).toBe(false);
  });
});

describe("subscribe source + analytics tokens", () => {
  it("tags each placement distinctly for the subscriber row", () => {
    expect(captureSourceFor("camera")).toBe("camera-first-open");
    expect(captureSourceFor("pricing")).toBe("pricing-recovery");
    // The subscribe route stores source capped at 40 chars.
    expect(captureSourceFor("camera").length).toBeLessThanOrEqual(40);
    expect(captureSourceFor("pricing").length).toBeLessThanOrEqual(40);
  });

  it("uses event names and detail tokens the ingest accepts verbatim", () => {
    for (const name of [CAPTURE_IMPRESSION_EVENT, CAPTURE_SUBSCRIBE_EVENT]) {
      expect(name).toMatch(/^[a-z0-9_]+$/);
    }
    for (const p of ["camera", "pricing"] as const) {
      expect(parseEventDetail(captureDetailFor(p))).toBe(p);
    }
  });
});
