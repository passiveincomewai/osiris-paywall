import { describe, it, expect } from "vitest";
import {
  TOUR_STEPS,
  TRACK_LAYERS,
  EVENT_LAYERS,
  MICROS,
  HELP_ENTRIES,
  parseLayerSig,
  layersTurnedOn,
} from "./steps";

describe("TOUR_STEPS", () => {
  it("has exactly 6 steps numbered 1..6", () => {
    expect(TOUR_STEPS).toHaveLength(6);
    expect(TOUR_STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("every step has copy for mouse and touch", () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(10);
      expect(s.bodyTouch.length).toBeGreaterThan(10);
    }
  });

  it("action steps require a real signal; info steps are 5 and 6", () => {
    expect(TOUR_STEPS.filter((s) => s.action !== "info").map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(TOUR_STEPS[4].action).toBe("info");
    expect(TOUR_STEPS[5].action).toBe("info");
  });

  it("no copy mentions API keys or invents a camera count", () => {
    const all = TOUR_STEPS.map((s) => `${s.body} ${s.bodyTouch}`).join(" ");
    expect(all.toLowerCase()).not.toContain("api key");
    expect(all).not.toContain("40,000");
    expect(all).not.toContain("40000");
  });
});

describe("layer signal helpers", () => {
  it("parses signatures", () => {
    expect([...parseLayerSig("cctv, satellites,,weather")]).toEqual(["cctv", "satellites", "weather"]);
    expect(parseLayerSig("").size).toBe(0);
  });

  it("reports only newly-on layers", () => {
    expect(layersTurnedOn("cctv,satellites", "cctv,satellites,weather")).toEqual(["weather"]);
    expect(layersTurnedOn("cctv,weather", "cctv")).toEqual([]);
    expect(layersTurnedOn("", "flights")).toEqual(["flights"]);
  });

  it("track and event layer sets do not overlap", () => {
    const ev = new Set<string>(EVENT_LAYERS as unknown as string[]);
    for (const k of TRACK_LAYERS) expect(ev.has(k)).toBe(false);
  });
});

describe("MICROS + HELP_ENTRIES", () => {
  it("every contextual micro-tutorial has at most 3 steps", () => {
    for (const id of ["camera", "flight", "satellite", "recon", "oi", "recording"]) {
      expect(MICROS[id], id).toBeDefined();
      expect(MICROS[id].steps.length).toBeLessThanOrEqual(3);
      expect(MICROS[id].steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("help entries reference real micros and real routes (no /docs)", () => {
    for (const e of HELP_ENTRIES) {
      if (e.kind === "micro") expect(MICROS[e.microId], e.label).toBeDefined();
      if (e.kind === "link") {
        expect(e.href).not.toContain("/docs");
        expect(["/faq", "/pricing"]).toContain(e.href);
      }
    }
    const labels = HELP_ENTRIES.map((e) => e.label);
    expect(labels).toContain("Take the Full Tour");
    expect(labels).toContain("Compare Free vs. Pro");
  });
});
