import { describe, it, expect } from "vitest";
import {
  TOUR_STEPS,
  EVENT_LAYERS,
  MICROS,
  HELP_ENTRIES,
  CAMERA_STEP_N,
  LAYER_STEP_N,
  isCameraOpenedSignal,
  parseLayerSig,
  layersTurnedOn,
  shouldCompleteCameraStep,
  shouldCompleteLayerStep,
  watchOfferAction,
} from "./steps";

describe("TOUR_STEPS", () => {
  it("has exactly 4 steps numbered 1..4", () => {
    expect(TOUR_STEPS).toHaveLength(4);
    expect(TOUR_STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4]);
  });

  it("every step has copy for mouse and touch", () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(10);
      expect(s.bodyTouch.length).toBeGreaterThan(10);
    }
  });

  it("action steps require a real signal; the only info step is the last one", () => {
    expect(TOUR_STEPS.filter((s) => s.action !== "info").map((s) => s.n)).toEqual([1, 2, 3]);
    expect(TOUR_STEPS[3].action).toBe("info");
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

  it("event layers are the off-by-default data layers the tour asks for", () => {
    expect(EVENT_LAYERS).toContain("weather");
    expect(EVENT_LAYERS).toContain("fires");
    // Tracking layers (flights etc.) feed micro-tutorials, not a tour step.
    expect(EVENT_LAYERS as readonly string[]).not.toContain("flights");
  });
});

describe("MICROS + HELP_ENTRIES", () => {
  it("every contextual micro-tutorial has at most 3 steps", () => {
    for (const id of ["camera", "flight", "satellite", "recon", "oi", "recording", "alerts"]) {
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
        expect(["/faq", "/pricing", "/sensing", "/ski-webcams"]).toContain(e.href);
      }
    }
    const labels = HELP_ENTRIES.map((e) => e.label);
    expect(labels).toContain("Take the Full Tour");
    expect(labels).toContain("Compare Free vs. Pro");
    expect(labels).toContain("Recording Studio");
    expect(labels).toContain("Camera Alerts");
    expect(labels).toContain("WiFi Sensing Tool");
    expect(labels).toContain("Ski Cameras & Powder Pass");
  });
});

describe("camera step signal logic (tutorial hand-off fix)", () => {
  it("derives the camera step from TOUR_STEPS", () => {
    expect(CAMERA_STEP_N).toBe(2);
    expect(TOUR_STEPS[CAMERA_STEP_N - 1].action).toBe("camera-open");
    // The camera step spotlights the globe (where the glowing dots are),
    // never the layer panel — the copy tells the visitor to tap a dot.
    expect(TOUR_STEPS[CAMERA_STEP_N - 1].anchor).toBe("globe");
  });

  it("a first open and a camera-to-camera switch are opened signals; a close is not", () => {
    expect(isCameraOpenedSignal(null, "cam-1")).toBe(true);
    // Switching directly between open cameras must still count — the old
    // wiring only recognised null → id, so the step could never complete.
    expect(isCameraOpenedSignal("cam-1", "cam-2")).toBe(true);
    expect(isCameraOpenedSignal("cam-1", "cam-1")).toBe(false);
    expect(isCameraOpenedSignal("cam-1", null)).toBe(false);
    expect(isCameraOpenedSignal(null, null)).toBe(false);
  });

  it("the camera step completes only in the tour, on that step, with a camera open", () => {
    expect(shouldCompleteCameraStep(true, CAMERA_STEP_N, "cam-1")).toBe(true);
    expect(shouldCompleteCameraStep(false, CAMERA_STEP_N, "cam-1")).toBe(false);
    expect(shouldCompleteCameraStep(true, CAMERA_STEP_N - 1, "cam-1")).toBe(false);
    expect(shouldCompleteCameraStep(true, CAMERA_STEP_N + 1, "cam-1")).toBe(false);
    expect(shouldCompleteCameraStep(true, CAMERA_STEP_N, null)).toBe(false);
  });

  it("the first-camera offer hands the welcome into the tour instead of ending it", () => {
    // Regression pin: clicking "Watch a Live Camera — <city>" on the
    // welcome panel used to persist welcome "done" and close every
    // onboarding surface — the tutorial ended at the click.
    expect(watchOfferAction("welcome")).toBe("enter-tour-at-camera-step");
    expect(watchOfferAction("tour")).toBe("await-camera-signal");
  });
});

describe("layer step signal logic (step-3 mobile fix)", () => {
  it("derives the layer step from TOUR_STEPS", () => {
    expect(LAYER_STEP_N).toBe(3);
    expect(TOUR_STEPS[LAYER_STEP_N - 1].action).toBe("event-layer");
    expect(TOUR_STEPS[LAYER_STEP_N - 1].anchor).toBe("layers");
  });

  it("step copy names the panel's real rows (Severe Weather / Active Fires)", () => {
    // The panel rows are labelled "Severe Weather" and "Active Fires";
    // the old copy sent visitors hunting for rows called "Weather" and
    // "Fires", which do not exist.
    const s = TOUR_STEPS[LAYER_STEP_N - 1];
    for (const text of [s.body, s.bodyTouch, s.hint]) {
      expect(text).toContain("Severe Weather");
      expect(text).toContain("Active Fires");
      expect(text).not.toContain("Weather or Fires");
    }
  });

  it("every event-layer key completes the step while it is on (toggle key → step advance)", () => {
    // The mapping the step actually accepts: the LayerPanel rows set
    // these exact activeLayers keys, and the Dashboard joins the on
    // keys into the signature OnboardingRoot checks.
    for (const key of EVENT_LAYERS) {
      expect(shouldCompleteLayerStep(true, LAYER_STEP_N, `cctv,earthquakes,${key}`)).toBe(true);
    }
    // The two rows the step's copy names, in a realistic mobile sig
    // (earthquakes + cctv are on by default / in use).
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N, "cctv,earthquakes,weather")).toBe(true);
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N, "cctv,earthquakes,fires")).toBe(true);
  });

  it("a fresh toggle still registers as a turned-on transition for either named row", () => {
    expect(layersTurnedOn("cctv,earthquakes", "cctv,earthquakes,weather")).toEqual(["weather"]);
    expect(layersTurnedOn("cctv,earthquakes", "cctv,earthquakes,fires")).toEqual(["fires"]);
  });

  it("non-event layers, other steps and non-tour states do not complete it", () => {
    // Earthquakes is on by default and is NOT a qualifying layer.
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N, "cctv,earthquakes")).toBe(false);
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N, "")).toBe(false);
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N - 1, "weather")).toBe(false);
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N + 1, "weather")).toBe(false);
    expect(shouldCompleteLayerStep(false, LAYER_STEP_N, "weather")).toBe(false);
  });

  it("state-based completion covers the already-on case the transition check cannot see", () => {
    // A qualifying layer switched on BEFORE the step was entered (or
    // remembered from an earlier visit) produces no off→on transition
    // at the step — layersTurnedOn is empty — yet the step must still
    // complete, exactly like the camera step's already-open case.
    expect(layersTurnedOn("weather", "weather")).toEqual([]);
    expect(shouldCompleteLayerStep(true, LAYER_STEP_N, "weather")).toBe(true);
  });
});
