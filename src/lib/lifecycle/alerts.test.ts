// Selector pins for the event-driven alerts (picks 14 + R8): the bar
// is rare-by-construction — sub-7.0 quakes, stale events, moderate
// weather and cancelled warnings must never select.
import { describe, it, expect } from "vitest";
import { selectUsgsAlerts, selectVolcanoAlerts, NEWS_ALERT_MIN_MAGNITUDE } from "./news-alerts";
import { selectNwsAlerts, cameraCoords, inNwsCoverage } from "./weather-alerts";

const NOW = new Date(Date.UTC(2026, 10, 1, 18, 0, 0));

describe("selectUsgsAlerts", () => {
  const feed = (mag: number, ageMin: number, id = "us7000xyz") => ({
    features: [
      {
        id,
        properties: { mag, place: "10km S of Somewhere, Chile", time: NOW.getTime() - ageMin * 60000, url: "https://earthquake.usgs.gov/x" },
      },
    ],
  });
  it("selects a fresh M7.0+", () => {
    const out = selectUsgsAlerts(feed(7.4, 30), NOW);
    expect(out).toHaveLength(1);
    expect(out[0].issueKey).toBe("alert:usgs:us7000xyz");
    expect(out[0].headline).toContain("M7.4");
  });
  it("rejects below-threshold, stale, and future events", () => {
    expect(selectUsgsAlerts(feed(NEWS_ALERT_MIN_MAGNITUDE - 0.1, 30), NOW)).toHaveLength(0);
    expect(selectUsgsAlerts(feed(8.1, 121), NOW)).toHaveLength(0);
    expect(selectUsgsAlerts(feed(8.1, -5), NOW)).toHaveLength(0);
  });
});

describe("selectVolcanoAlerts", () => {
  const feed = (ageMin: number) => ({
    events: [
      {
        id: "EONET_123",
        title: "Kilauea Volcano, Hawaii",
        geometry: [{ date: new Date(NOW.getTime() - ageMin * 60000).toISOString() }],
      },
    ],
  });
  it("selects a newly opened event (first geometry inside the window)", () => {
    expect(selectVolcanoAlerts(feed(45), NOW)).toHaveLength(1);
    expect(selectVolcanoAlerts(feed(45), NOW)[0].issueKey).toBe("alert:eonet:EONET_123");
  });
  it("rejects events that opened earlier even if still active", () => {
    expect(selectVolcanoAlerts(feed(60 * 26), NOW)).toHaveLength(0);
  });
});

describe("selectNwsAlerts + cameraCoords", () => {
  const payload = (severity: string, messageType = "Alert", status = "Actual") => ({
    features: [
      {
        properties: {
          id: "urn:oid:1",
          event: "Tornado Warning",
          headline: "Tornado Warning issued for X County",
          areaDesc: "X County",
          severity,
          status,
          messageType,
          expires: "2026-11-01T20:00:00Z",
        },
      },
    ],
  });
  it("keeps Severe and Extreme actual warnings only", () => {
    expect(selectNwsAlerts(payload("Severe"))).toHaveLength(1);
    expect(selectNwsAlerts(payload("Extreme"))).toHaveLength(1);
    expect(selectNwsAlerts(payload("Moderate"))).toHaveLength(0);
    expect(selectNwsAlerts(payload("Severe", "Cancel"))).toHaveLength(0);
    expect(selectNwsAlerts(payload("Severe", "Alert", "Test"))).toHaveLength(0);
  });
  it("reads coordinates defensively from camera snapshots", () => {
    expect(cameraCoords({ lat: 40.7, lng: -111.9 })).toEqual({ lat: 40.7, lng: -111.9 });
    expect(cameraCoords({ latitude: 40.7, longitude: -111.9 })).toEqual({ lat: 40.7, lng: -111.9 });
    expect(cameraCoords({})).toBeNull();
    expect(cameraCoords(null)).toBeNull();
    expect(cameraCoords({ lat: "40.7", lng: -111.9 })).toBeNull();
  });
  it("bounds NWS coverage to the US service area", () => {
    expect(inNwsCoverage(40.7, -111.9)).toBe(true); // Utah
    expect(inNwsCoverage(51.5, -0.12)).toBe(false); // London
    expect(inNwsCoverage(-33.8, 151.2)).toBe(false); // Sydney
  });
});
