import { describe, expect, it } from "vitest";
import { parseRavenEvent, parseRavenHistory, parseRavenSnapshot } from "./ravenscope";

// A real snapshot captured from RavenScope (commit 9919537) /api/state in
// --simulate mode on 2026-10-29, trimmed of nothing but the ts value.
const REAL_SNAPSHOT = {
  ts: 1793254700.6710222,
  energy: 0.1324,
  z: 0.0,
  state: "STILL",
  dwell: 1.2,
  n_links: 5,
  n_reliable: 5,
  calibrating: false,
  calib_remaining: 0.0,
  backend: "simulate",
  backend_desc: "Physics simulator (no radio)",
  unit: "dBm",
  sector: "right",
  sector_conf: 0.85,
  sectors: [0.0, 0.023, 0.132],
  links: [
    { bssid: "02:00:00:00:00:03", ssid: "xfinitywifi", rssi: -49.6, energy: 0.0, coherence: 0.0, reliable: true },
    { bssid: "02:00:00:00:00:04", ssid: "ATT-Guest", rssi: -61.3, energy: 0.132, coherence: 0.071, reliable: true },
  ],
  ruview_note: "RuView CSI core not importable here",
  ruview_installed: false,
};

describe("parseRavenSnapshot", () => {
  it("parses a genuine RavenScope snapshot", () => {
    const s = parseRavenSnapshot(REAL_SNAPSHOT);
    expect(s).not.toBeNull();
    expect(s!.state).toBe("STILL");
    expect(s!.energy).toBeCloseTo(0.1324);
    expect(s!.sector).toBe("right");
    expect(s!.nLinks).toBe(5);
    expect(s!.links[1].ssid).toBe("ATT-Guest");
    expect(s!.links[0].reliable).toBe(true);
  });

  it("carries the full snapshot fields the dashboard renders", () => {
    const s = parseRavenSnapshot(REAL_SNAPSHOT);
    expect(s!.ts).toBeCloseTo(1793254700.6710222);
    expect(s!.unit).toBe("dBm");
    expect(s!.backend).toBe("simulate");
    expect(s!.sectorConf).toBeCloseTo(0.85);
    expect(s!.ruviewNote).toContain("RuView");
    expect(s!.ruviewInstalled).toBe(false);
    expect(s!.links[0].bssid).toBe("02:00:00:00:00:03");
    expect(s!.links[1].coherence).toBeCloseTo(0.071);
  });

  it("rejects payloads that are not RavenScope-shaped", () => {
    expect(parseRavenSnapshot(null)).toBeNull();
    expect(parseRavenSnapshot({ hello: "world" })).toBeNull();
    expect(parseRavenSnapshot({ state: "WOBBLY", energy: 0.5 })).toBeNull();
    expect(parseRavenSnapshot({ state: "EMPTY" })).toBeNull(); // no energy
  });
});

describe("parseRavenEvent", () => {
  it("parses SSE event payloads", () => {
    expect(parseRavenEvent({ _event: "transition", detail: "STILL->MOTION", ts: 1 })).toEqual({
      kind: "transition",
      detail: "STILL->MOTION",
      ts: 1,
    });
    expect(parseRavenEvent({ _event: "anomaly", detail: "z=4.2", ts: 2 })?.kind).toBe("anomaly");
    expect(parseRavenEvent({ state: "EMPTY" })).toBeNull();
  });
});

// Shape mirrors server.py _history(): samples ascending by ts, events
// newest-first (store query is ts DESC), occupancy = 24 hourly averages.
const REAL_HISTORY = {
  samples: [
    { ts: 1793254400.5, energy: 0.01, state: "EMPTY", z: 0.0 },
    { ts: 1793254400.9, energy: 0.31, state: "MOTION", z: 4.6 },
  ],
  events: [
    { ts: 1793254401.0, kind: "anomaly", detail: "z=4.6 energy=0.31" },
    { ts: 1793254400.8, kind: "transition", detail: "EMPTY->MOTION" },
  ],
  occupancy: [0, 0.02, 0, 0, 0, 0, 0.11, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0],
};

describe("parseRavenHistory", () => {
  it("parses samples, events and the 24h occupancy profile", () => {
    const h = parseRavenHistory(REAL_HISTORY);
    expect(h).not.toBeNull();
    expect(h!.samples).toHaveLength(2);
    expect(h!.samples[1].state).toBe("MOTION");
    expect(h!.samples[1].z).toBeCloseTo(4.6);
    expect(h!.events[0].kind).toBe("anomaly");
    expect(h!.events[1].detail).toBe("EMPTY->MOTION");
    expect(h!.occupancy).toHaveLength(24);
    expect(h!.occupancy[7]).toBeCloseTo(0.2);
  });

  it("tolerates missing sections and rejects non-objects", () => {
    expect(parseRavenHistory({})).toEqual({ samples: [], events: [], occupancy: [] });
    expect(parseRavenHistory(null)).toBeNull();
    expect(parseRavenHistory("nope")).toBeNull();
  });

  it("drops malformed rows instead of inventing values", () => {
    const h = parseRavenHistory({
      samples: [{ energy: 0.5 }, null, { ts: 5, energy: 0.2, state: "STILL", z: 1 }],
      events: [{ ts: 0, kind: "transition", detail: "X->Y" }, { ts: 9, kind: "", detail: "?" }],
      occupancy: "not-an-array",
    });
    expect(h!.samples).toHaveLength(1);
    expect(h!.events).toHaveLength(0);
    expect(h!.occupancy).toEqual([]);
  });
});
