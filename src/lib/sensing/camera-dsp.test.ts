import { describe, expect, it } from "vitest";
import { CameraSensingEngine, RoomStateMachine, RttSensingEngine } from "./camera-dsp";

/** Deterministic pseudo-noise so tests never flake on Math.random. */
function noise(tick: number, amp = 0.0015): number {
  const x = Math.sin(tick * 127.1) * 43758.5453;
  return amp * (x - Math.floor(x));
}

const DT = 0.25; // 4 fps, matching the page's sampling interval

function run(engine: CameraSensingEngine, seconds: number, mad: (t: number) => [number, number, number], t0 = 0) {
  let snap = engine.pushFrame(mad(t0), t0);
  const steps = Math.floor(seconds / DT);
  for (let i = 1; i <= steps; i++) snap = engine.pushFrame(mad(t0 + i * DT), t0 + i * DT);
  return snap;
}

describe("CameraSensingEngine (RavenScope pipeline port)", () => {
  it("a still scene calibrates and settles at NO MOTION with near-zero energy", () => {
    const eng = new CameraSensingEngine(2);
    const snap = run(eng, 20, (t) => {
      const n = noise(Math.round(t / DT));
      return [0.002 + n, 0.002 + n, 0.002 + n];
    });
    expect(snap.calibrating).toBe(false);
    expect(snap.state).toBe("EMPTY");
    expect(snap.energy).toBeLessThan(0.1);
  });

  it("sustained movement drives the state up to ACTIVE and logs the transition", () => {
    const eng = new CameraSensingEngine(2);
    run(eng, 6, (t) => {
      const n = noise(Math.round(t / DT));
      return [0.002 + n, 0.002 + n, 0.002 + n];
    });
    const snap = run(eng, 10, (t) => {
      const n = noise(Math.round(t / DT), 0.01);
      return [0.16 + n, 0.05 + n, 0.03 + n];
    }, 6);
    expect(snap.state).toBe("ACTIVE");
    expect(snap.energy).toBeGreaterThan(0.62);
    expect(snap.sector).toBe("left");
    expect(eng.events.some((e) => e.kind === "transition" && e.detail.endsWith("->ACTIVE"))).toBe(true);
  });

  it("when movement stops the state steps back down to NO MOTION after the empty hold", () => {
    const eng = new CameraSensingEngine(2);
    run(eng, 6, (t) => {
      const n = noise(Math.round(t / DT));
      return [0.002 + n, 0.002 + n, 0.002 + n];
    });
    run(eng, 8, (t) => {
      const n = noise(Math.round(t / DT), 0.01);
      return [0.16 + n, 0.05 + n, 0.03 + n];
    }, 6);
    const snap = run(eng, 20, (t) => {
      const n = noise(Math.round(t / DT));
      return [0.002 + n, 0.002 + n, 0.002 + n];
    }, 14);
    expect(snap.state).toBe("EMPTY");
  });

  it("a single-frame blip does not change the state (debounce)", () => {
    const eng = new CameraSensingEngine(2);
    run(eng, 8, (t) => {
      const n = noise(Math.round(t / DT));
      return [0.002 + n, 0.002 + n, 0.002 + n];
    });
    const snap = eng.pushFrame([0.9, 0.9, 0.9], 8 + DT);
    expect(snap.state).toBe("EMPTY");
  });

  it("a sudden sustained burst after a long quiet period raises an anomaly event", () => {
    const eng = new CameraSensingEngine(2);
    run(eng, 40, (t) => {
      const n = noise(Math.round(t / DT), 0.0008);
      return [0.002 + n, 0.002 + n, 0.002 + n];
    });
    run(eng, 4, (t) => {
      const n = noise(Math.round(t / DT), 0.01);
      return [0.5 + n, 0.4 + n, 0.4 + n];
    }, 40);
    expect(eng.events.some((e) => e.kind === "anomaly")).toBe(true);
  });
});

describe("RttSensingEngine (RavenScope ping-backend port)", () => {
  const P_DT = 1 / 3; // ~3 Hz probes

  function runRtt(engine: RttSensingEngine, seconds: number, rtt: (t: number) => number, t0 = 0) {
    let snap = engine.pushRtt(rtt(t0), t0);
    const steps = Math.floor(seconds / P_DT);
    for (let i = 1; i <= steps; i++) snap = engine.pushRtt(rtt(t0 + i * P_DT), t0 + i * P_DT);
    return snap;
  }

  it("a stable link calibrates and reads LINK QUIET with low energy", () => {
    const eng = new RttSensingEngine(3);
    const snap = runRtt(eng, 30, (t) => 42 + noise(Math.round(t / P_DT), 1.2) * 1000 * 0.001 + Math.sin(t * 7) * 0.8);
    expect(snap.calibrating).toBe(false);
    expect(snap.state).toBe("EMPTY");
    expect(snap.stateLabel).toBe("LINK QUIET");
    expect(snap.energy).toBeLessThan(0.28);
  });

  it("heavy jitter drives the link to ACTIVE DISTURBANCE and logs transitions", () => {
    const eng = new RttSensingEngine(3);
    runRtt(eng, 15, (t) => 42 + Math.sin(t * 7) * 0.8);
    const snap = runRtt(eng, 12, (t) => {
      const swing = Math.sin(t * 2.1) * 55 + Math.sin(t * 5.7) * 30;
      return 90 + swing;
    }, 15);
    expect(["MOTION", "ACTIVE"]).toContain(snap.state);
    expect(snap.energy).toBeGreaterThan(0.28);
    expect(eng.events.some((e) => e.kind === "transition")).toBe(true);
  });

  it("one slow probe (single spike) does not disturb the state — Hampel + debounce", () => {
    const eng = new RttSensingEngine(3);
    runRtt(eng, 15, () => 42);
    const snap = eng.pushRtt(900, 15 + P_DT);
    expect(snap.state).toBe("EMPTY");
  });
});

describe("RoomStateMachine hysteresis", () => {
  it("requires energy to fall below enter-minus-hysteresis to step down", () => {
    const sm = new RoomStateMachine(undefined, 0);
    // climb to MOTION
    for (let i = 0; i < 4; i++) sm.update(0.4, i * DT);
    expect(sm.state).toBe("MOTION");
    // 0.25 is below motionEnter (0.28) but inside the hysteresis band
    // (0.28 - 0.06 = 0.22): no step down.
    for (let i = 0; i < 4; i++) sm.update(0.25, 2 + i * DT);
    expect(sm.state).toBe("MOTION");
    // 0.20 is below the band: steps down to STILL.
    for (let i = 0; i < 4; i++) sm.update(0.2, 4 + i * DT);
    expect(sm.state).toBe("STILL");
    // Near-zero energy: EMPTY is reachable once the 6 s empty hold passes
    // (upstream's target-keyed rule makes EMPTY unreachable — see the
    // deviation note in camera-dsp.ts).
    for (let i = 0; i < 40; i++) sm.update(0.0, 6 + i * DT);
    expect(sm.state).toBe("EMPTY");
  });
});
