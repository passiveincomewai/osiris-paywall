import { describe, expect, it } from "vitest";
import {
  dedupeSortReports,
  dropSupersededAlerts,
  isTornadoAlertEvent,
  parseNwsTornadoAlerts,
  parseSpcTornadoCsv,
  sortTornadoAlerts,
  spcDayString,
  spcDayToIsoDate,
  tornadoReportEpochMs,
  tornadoReportId,
  type TornadoReport,
} from "./tornadoes";

const SPC_SAMPLE = [
  "Time,F_Scale,Location,County,State,Lat,Lon,Comments",
  "1812,UNK,4 NW Leefield,Bulloch,GA,32.46,-81.67,NWS storm survey team confirmed an EF-0 tornado near Clito Rd (CHS)",
  "1833,EF1,5 WNW Oliver,Screven,GA,32.55,-81.6,Spotter noted trees shredded, power lines down (CHS)",
  "bad,row,without,enough",
  "1930,,2 SSE Captolo,Screven,GA,32.6,-81.58,Brief touchdown (CHS)",
].join("\n");

describe("parseSpcTornadoCsv", () => {
  it("parses SPC rows, keeping the comment remainder intact (commas included)", () => {
    const reports = parseSpcTornadoCsv(SPC_SAMPLE, "261010");
    expect(reports).toHaveLength(3);
    const first = reports[0];
    expect(first.timeUtc).toBe("1812");
    expect(first.fScale).toBe("UNK");
    expect(first.location).toBe("4 NW Leefield");
    expect(first.county).toBe("Bulloch");
    expect(first.state).toBe("GA");
    expect(first.lat).toBeCloseTo(32.46);
    expect(first.lng).toBeCloseTo(-81.67);
    expect(first.date).toBe("2026-10-10");
    expect(reports[1].comments).toContain("trees shredded, power lines down");
    // An empty F_Scale cell stays null rather than inventing a rating.
    expect(reports[2].fScale).toBeNull();
  });

  it("never upgrades a report's scale — 'UNK' stays 'UNK'", () => {
    const reports = parseSpcTornadoCsv(SPC_SAMPLE, "261010");
    expect(reports.map((r) => r.fScale)).toEqual(["UNK", "EF1", null]);
  });

  it("gives every row a stable id", () => {
    const a = parseSpcTornadoCsv(SPC_SAMPLE, "261010");
    const b = parseSpcTornadoCsv(SPC_SAMPLE, "261010");
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
  });
});

describe("tornadoReportId / dates", () => {
  it("is deterministic and changes when the place changes", () => {
    const base = {
      spcDay: "261010",
      timeUtc: "1812",
      lat: 32.46,
      lng: -81.67,
      location: "4 NW Leefield",
      county: "Bulloch",
      state: "GA",
    };
    expect(tornadoReportId(base)).toBe(tornadoReportId({ ...base }));
    expect(tornadoReportId(base)).not.toBe(
      tornadoReportId({ ...base, location: "5 NW Leefield" }),
    );
    expect(tornadoReportId(base).startsWith("261010-1812-")).toBe(true);
  });

  it("converts SPC day strings and report epochs (times are UTC)", () => {
    expect(spcDayString(new Date(Date.UTC(2026, 9, 10, 23, 59)))).toBe("261010");
    expect(spcDayToIsoDate("261010")).toBe("2026-10-10");
    const r = parseSpcTornadoCsv(SPC_SAMPLE, "261010")[0];
    expect(tornadoReportEpochMs(r)).toBe(Date.UTC(2026, 9, 10, 18, 12));
  });

  it("dedupes and sorts newest first", () => {
    const reports = parseSpcTornadoCsv(SPC_SAMPLE, "261010");
    const older: TornadoReport = { ...reports[0], id: "x-old", spcDay: "261009", date: "2026-10-09" };
    const out = dedupeSortReports([...reports, reports[0], older]);
    expect(out.map((r) => r.id)).toEqual([
      reports[2].id,
      reports[1].id,
      reports[0].id,
      "x-old",
    ]);
  });
});

function nwsFeature(overrides: Record<string, any> = {}): any {
  return {
    geometry: null,
    properties: {
      id: "urn:oid:2.49.0.1.840.0.abc.001.1",
      "@id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.abc.001.1",
      event: "Tornado Warning",
      headline: "Tornado Warning issued October 22 at 1:15PM MDT until 2:00PM MDT by NWS Denver CO",
      areaDesc: "Central Adams County",
      description: "...",
      instruction: "Take cover now.",
      severity: "Extreme",
      certainty: "Observed",
      urgency: "Immediate",
      senderName: "NWS Denver CO",
      effective: "2026-10-22T13:15:00-06:00",
      onset: "2026-10-22T13:15:00-06:00",
      expires: "2026-10-22T14:00:00-06:00",
      ends: null,
      status: "Actual",
      messageType: "Alert",
      references: [],
      parameters: {
        tornadoDetection: ["OBSERVED"],
        tornadoDamageThreat: ["CONSIDERABLE"],
        maxHailSize: ["1.75"],
        maxWindGust: ["70"],
      },
      ...overrides,
    },
  };
}

describe("NWS alert parsing", () => {
  it("recognizes exactly the tornado alert family", () => {
    expect(isTornadoAlertEvent("Tornado Warning")).toBe(true);
    expect(isTornadoAlertEvent("Tornado Watch")).toBe(true);
    expect(isTornadoAlertEvent("Tornado Emergency")).toBe(true);
    expect(isTornadoAlertEvent("Severe Thunderstorm Warning")).toBe(false);
    expect(isTornadoAlertEvent("Flood Watch")).toBe(false);
  });

  it("keeps tornado alerts and drops everything else, parameters flattened", () => {
    const fc = {
      features: [
        nwsFeature(),
        nwsFeature({ id: "flood-1", event: "Flood Watch", parameters: {} }),
      ],
    };
    const alerts = parseNwsTornadoAlerts(fc);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].tornadoDetection).toBe("OBSERVED");
    expect(alerts[0].damageThreat).toBe("CONSIDERABLE");
    expect(alerts[0].maxHailSizeIn).toBe(1.75);
    expect(alerts[0].maxWindGustMph).toBe(70);
    expect(alerts[0].expires).toBe("2026-10-22T14:00:00-06:00");
  });

  it("drops versions superseded by a later update message", () => {
    const old = nwsFeature({ id: "urn:old" });
    const update = nwsFeature({
      id: "urn:new",
      references: [{ identifier: "urn:old", "@id": "https://api.weather.gov/alerts/urn:old" }],
    });
    const fc = dropSupersededAlerts({ features: [old, update] });
    expect(fc.features.map((f: any) => f.properties.id)).toEqual(["urn:new"]);
    const alerts = parseNwsTornadoAlerts(fc);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("urn:new");
  });

  it("sorts warnings ahead of watches", () => {
    const watch = parseNwsTornadoAlerts({
      features: [nwsFeature({ id: "w1", event: "Tornado Watch" })],
    });
    const warning = parseNwsTornadoAlerts({ features: [nwsFeature({ id: "w2" })] });
    const sorted = sortTornadoAlerts([...watch, ...warning]);
    expect(sorted.map((a) => a.id)).toEqual(["w2", "w1"]);
  });
});
