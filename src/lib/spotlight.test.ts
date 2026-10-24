import { describe, expect, it } from "vitest";
import { pickSpotlight, spotlightDateKey, spotlightHash } from "./spotlight";

const cams = Array.from({ length: 50 }, (_, i) => ({ id: `cam-${String(i).padStart(3, "0")}` }));

describe("spotlightDateKey", () => {
  it("uses the Denver calendar day, not UTC", () => {
    // 2026-10-23T05:30:00Z is 2026-10-22 23:30 in Denver (MDT, UTC-6).
    expect(spotlightDateKey(new Date("2026-10-23T05:30:00Z"))).toBe("2026-10-22");
    // 2026-10-23T07:30:00Z is 2026-10-23 01:30 in Denver.
    expect(spotlightDateKey(new Date("2026-10-23T07:30:00Z"))).toBe("2026-10-23");
  });
});

describe("pickSpotlight", () => {
  it("is deterministic for the same day regardless of input order", () => {
    const a = pickSpotlight(cams, "2026-10-23");
    const b = pickSpotlight([...cams].reverse(), "2026-10-23");
    expect(a?.camera.id).toBe(b?.camera.id);
    expect(a?.index).toBe(b?.index);
  });

  it("rotates across days", () => {
    const picks = new Set(
      ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map(
        (d) => pickSpotlight(cams, d)?.camera.id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("returns null for an empty catalogue", () => {
    expect(pickSpotlight([], "2026-10-23")).toBeNull();
  });

  it("ignores records without a usable id", () => {
    const pick = pickSpotlight([{ id: "" }, { id: "only" }], "2026-10-23");
    expect(pick?.camera.id).toBe("only");
    expect(pick?.total).toBe(1);
  });
});

describe("spotlightHash", () => {
  it("is stable", () => {
    expect(spotlightHash("worldeye-spotlight:2026-10-23")).toBe(
      spotlightHash("worldeye-spotlight:2026-10-23"),
    );
  });
});
