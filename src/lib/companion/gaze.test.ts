import { describe, it, expect } from "vitest";
import {
  clampUnit, normalizeFaceCenter, pointerToGaze, GazeSmoother, NEUTRAL_GAZE,
} from "./gaze";

describe("clampUnit", () => {
  it("clamps to -1..1 and tames non-finite values", () => {
    expect(clampUnit(0.4)).toBe(0.4);
    expect(clampUnit(2)).toBe(1);
    expect(clampUnit(-7)).toBe(-1);
    expect(clampUnit(NaN)).toBe(0);
    expect(clampUnit(Infinity)).toBe(0);
  });
});

describe("normalizeFaceCenter", () => {
  it("maps frame center to (0,0) and corners to ±1", () => {
    expect(normalizeFaceCenter(320, 240, 640, 480)).toEqual({ x: 0, y: 0 });
    expect(normalizeFaceCenter(0, 0, 640, 480)).toEqual({ x: -1, y: -1 });
    expect(normalizeFaceCenter(640, 480, 640, 480)).toEqual({ x: 1, y: 1 });
    expect(normalizeFaceCenter(480, 120, 640, 480)).toEqual({ x: 0.5, y: -0.5 });
  });

  it("clamps out-of-frame centers and guards degenerate frames", () => {
    expect(normalizeFaceCenter(900, -50, 640, 480)).toEqual({ x: 1, y: -1 });
    expect(normalizeFaceCenter(10, 10, 0, 480)).toEqual({ x: 0, y: 0 });
    expect(normalizeFaceCenter(10, 10, 640, -1)).toEqual({ x: 0, y: 0 });
  });
});

describe("pointerToGaze", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it("maps rect center to (0,0) and edges to ±1", () => {
    expect(pointerToGaze(200, 100, rect)).toEqual({ x: 0, y: 0 });
    expect(pointerToGaze(100, 50, rect)).toEqual({ x: -1, y: -1 });
    expect(pointerToGaze(300, 150, rect)).toEqual({ x: 1, y: 1 });
  });

  it("clamps pointers outside the rect and guards degenerate rects", () => {
    expect(pointerToGaze(999, -40, rect)).toEqual({ x: 1, y: -1 });
    expect(pointerToGaze(200, 100, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("GazeSmoother", () => {
  it("starts neutral", () => {
    const s = new GazeSmoother();
    expect(s.snapshot(1000)).toEqual(NEUTRAL_GAZE);
  });

  it("becomes present with source=face on a face sample and eases toward it", () => {
    const s = new GazeSmoother({ alpha: 0.5 });
    s.faceSample({ x: 1, y: -1 }, 1000);
    const snap = s.snapshot(1000);
    expect(snap.present).toBe(true);
    expect(snap.source).toBe("face");
    expect(snap.x).toBeCloseTo(0.5); // one smoothing step from 0 toward 1
    expect(snap.y).toBeCloseTo(-0.5);
    s.faceSample({ x: 1, y: -1 }, 1200);
    expect(s.snapshot(1200).x).toBeCloseTo(0.75); // converging on the target
  });

  it("debounces presence: brief dropouts stay present, long ones expire and release to center", () => {
    const s = new GazeSmoother({ alpha: 1, faceExitMs: 1200 });
    s.faceSample({ x: 0.8, y: 0 }, 1000);
    expect(s.snapshot(1500).present).toBe(true); // 500ms since seen — still present
    expect(s.snapshot(2199).present).toBe(true); // just inside the window
    const gone = s.snapshot(2201); // just outside the window
    expect(gone.present).toBe(false);
    expect(gone.source).toBe("none");
    // repeated snapshots keep releasing toward center
    let v = gone.x;
    for (let t = 2400; t < 6000; t += 200) v = s.snapshot(t).x;
    expect(Math.abs(v)).toBeLessThan(0.01);
  });

  it("null face samples do not clear presence by themselves (time does)", () => {
    const s = new GazeSmoother({ faceExitMs: 1000 });
    s.faceSample({ x: 0.5, y: 0.5 }, 0);
    s.faceSample(null, 100);
    s.faceSample(null, 500);
    expect(s.snapshot(500).present).toBe(true);
    expect(s.snapshot(1001).present).toBe(false);
  });

  it("pointer gaze reports source=pointer and expires after pointerExitMs", () => {
    const s = new GazeSmoother({ alpha: 1, pointerExitMs: 2500 });
    s.pointerSample({ x: -0.6, y: 0.2 }, 1000);
    const snap = s.snapshot(1000);
    expect(snap).toMatchObject({ present: true, source: "pointer", x: -0.6, y: 0.2 });
    expect(s.snapshot(3499).present).toBe(true);
    expect(s.snapshot(3501).present).toBe(false);
  });

  it("face takes precedence: pointer samples are ignored while a face is fresh", () => {
    const s = new GazeSmoother({ alpha: 1, faceExitMs: 1200 });
    s.faceSample({ x: 0.9, y: 0 }, 1000);
    s.pointerSample({ x: -0.9, y: 0 }, 1100); // should be ignored
    const snap = s.snapshot(1100);
    expect(snap.source).toBe("face");
    expect(snap.x).toBeCloseTo(0.9);
    // once the face goes stale, pointer gaze can take over
    s.pointerSample({ x: -0.9, y: 0 }, 3000);
    expect(s.snapshot(3000)).toMatchObject({ present: true, source: "pointer", x: -0.9 });
  });

  it("reset returns to neutral immediately", () => {
    const s = new GazeSmoother({ alpha: 1 });
    s.faceSample({ x: 1, y: 1 }, 500);
    s.reset();
    expect(s.snapshot(500)).toEqual(NEUTRAL_GAZE);
  });
});
