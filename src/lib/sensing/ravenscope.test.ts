import { describe, expect, it } from "vitest";
import { parseRavenEvent, parseRavenSnapshot } from "./ravenscope";

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
    });
    expect(parseRavenEvent({ _event: "anomaly", detail: "z=4.2", ts: 2 })?.kind).toBe("anomaly");
    expect(parseRavenEvent({ state: "EMPTY" })).toBeNull();
  });
});
