import { describe, expect, it } from "vitest";
import {
  isStaleFeed,
  matchEventsToRoute,
  normaliseCaChainControl,
  normaliseCaLaneClosures,
  normaliseIdWzdx,
  normaliseMtGeoJson,
  parsePacificTimestamp,
  pointToPolylineMiles,
  statesForRoute,
  stripHtml,
  type RoadEvent,
} from "./road-conditions";

/**
 * Fixtures are trimmed copies of the REAL payload shapes fetched from
 * the live feeds on 2026-10-30 (see f10/RECON.md + NOTES.md) — same
 * nesting, same stringly-typed numbers, same field names.
 */

const CA_CC_FIXTURE = {
  data: [
    {
      cc: {
        index: "3-ALP-89-23.6-N-237",
        recordTimestamp: { recordDate: "2026-10-30", recordTime: "08:04:02" },
        location: {
          district: "3",
          locationName: "Luther Pass",
          nearbyPlace: "Markleeville",
          longitude: "-119.939680",
          latitude: "38.787944",
          route: "SR-89",
          postmile: "23.60",
        },
        inService: "true",
        statusData: {
          statusTimestamp: { statusDate: "2026-05-05", statusTime: "05:58:27" },
          status: "R-0",
          statusDescription: "No chain controls are in effect at this time.",
        },
      },
    },
    {
      cc: {
        index: "3-ED-50-40.1-E-999",
        recordTimestamp: { recordDate: "2026-10-30", recordTime: "08:04:02" },
        location: {
          district: "3",
          locationName: "Echo Summit",
          nearbyPlace: "Meyers",
          longitude: "-120.066",
          latitude: "38.813",
          route: "US-50",
          postmile: "40.10",
        },
        inService: "true",
        statusData: {
          statusTimestamp: { statusDate: "2026-10-30", statusTime: "07:15:00" },
          status: "R-1",
          statusDescription: "Chains are required on all vehicles except 4WD with snow tires.",
        },
      },
    },
  ],
};

const CA_LCS_FIXTURE = {
  data: [
    {
      lcs: {
        index: "C5BB-0001-2026-10-30-21:01:00",
        recordTimestamp: {
          recordDate: "2026-10-30",
          recordTime: "08:03:02",
          recordEpoch: "1793372582",
        },
        location: {
          begin: {
            beginLocationName: "Sutterville Rd",
            beginNearbyPlace: "Sacramento",
            beginLongitude: "-121.510706",
            beginLatitude: "38.540665",
            beginRoute: "I-5",
          },
          end: {
            endLocationName: "Broadway",
            endLongitude: "-121.512286",
            endLatitude: "38.566949",
            endRoute: "I-5",
          },
        },
        closure: {
          closureID: "C5BB",
          typeOfClosure: "Full Closure",
          typeOfWork: "Emergency Work",
          lanesClosed: "All",
        },
      },
    },
  ],
};

const MT_EVENTS_FIXTURE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "1034604",
      geometry: { type: "Point", coordinates: ["-113.30272202865", "46.2363225859792"] },
      properties: {
        enhanced_report:
          "<b>MT-1  at MP 30.0</b><br>Rock Fall Warning<br><p><b>Additional Information:</b><br>Rocks on Roadway. Proceed with caution.</p>",
        last_update: 1771731145,
        dir: "B",
        label: "MT-1<br />at MP 30.0",
        location_description: "MT-1 at MP 30.0",
        category: "warn",
        report:
          "Travelers can expect the following: Rock Fall Warning until further notice.<br />Rocks on Roadway. Proceed with caution.",
        route: "MT-1",
        mrm: 30,
        event_id: "1034604",
        headline: "Warning",
      },
    },
  ],
};

const MT_RESTRICTIONS_FIXTURE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "1101080",
      geometry: { type: "Point", coordinates: ["-111.166409411173", "46.338436345624"] },
      properties: {
        headline: "Restrictions: Width Limit (ft)",
        event_id: "1101080",
        report:
          "Restrictions include: height limit 15 ft, length limit 130 ft, and width limit 12 ft until further notice.",
        route: "US-12",
        mrm: 17.84,
        location_description: "US-12 from MP 2.4 to 33.3",
        category: "restr",
        last_update: 1784742981,
        dir: "B",
      },
    },
  ],
};

const ID_WZDX_FIXTURE = {
  feed_info: {
    update_date: "2026-10-30T15:09:01.003515+00:00",
    publisher: "Arcadis",
    version: "4.1",
  },
  type: "FeatureCollection",
  features: [
    {
      id: "+EkFOHTsK9zCTbry+oavSEUqztM=",
      type: "Feature",
      properties: {
        core_details: {
          event_type: "work-zone",
          data_source_id: "ERS",
          road_names: ["W Chinden Blvd"],
          direction: "eastbound",
          description: " Road construction on W Chinden Blvd Both Directions At N McDermott Rd. ",
          update_date: "2026-09-29T03:27:14Z",
        },
        road_event_id: "+EkFOHTsK9zCTbry+oavSEUqztM=",
        start_date: "2026-10-30T06:00:00Z",
        end_date: "2026-10-30T11:59:59Z",
        vehicle_impact: "all-lanes-open",
      },
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [-116.470326468808, 43.6628385661889],
          [-116.46, 43.66],
        ],
      },
    },
  ],
};

describe("parsePacificTimestamp", () => {
  it("converts a Pacific-local timestamp to epoch ms (PDT = UTC-7)", () => {
    const ts = parsePacificTimestamp("2026-10-30", "08:04:02");
    expect(ts).toBe(Date.UTC(2026, 9, 30, 15, 4, 2));
  });
  it("rejects malformed input", () => {
    expect(parsePacificTimestamp("30/10/2026", "08:04:02")).toBeNull();
  });
});

describe("normaliseCaChainControl", () => {
  it("keeps only active (non-R-0) controls and maps the event shape", () => {
    const { events, feedUpdatedTs } = normaliseCaChainControl(CA_CC_FIXTURE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.state).toBe("CA");
    expect(e.category).toBe("chain");
    expect(e.route).toBe("US-50");
    expect(e.lat).toBeCloseTo(38.813);
    expect(e.lon).toBeCloseTo(-120.066);
    expect(e.statusText).toContain("R-1");
    expect(e.sourceId).toBe("ca-cc:3-ED-50-40.1-E-999");
    // Feed clock comes from recordTimestamp even for R-0 records.
    expect(feedUpdatedTs).toBe(Date.UTC(2026, 9, 30, 15, 4, 2));
  });
  it("throws on a schema-breaking payload", () => {
    expect(() => normaliseCaChainControl({ nope: true })).toThrow();
  });
});

describe("normaliseCaLaneClosures", () => {
  it("maps a full closure with begin-point geometry", () => {
    const { events, feedUpdatedTs } = normaliseCaLaneClosures(CA_LCS_FIXTURE);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("closure");
    expect(events[0].route).toBe("I-5");
    expect(events[0].statusText).toContain("Full Closure");
    expect(events[0].lat).toBeCloseTo(38.540665);
    expect(feedUpdatedTs).toBe(1793372582 * 1000);
  });
});

describe("normaliseMtGeoJson", () => {
  it("parses string coordinates and strips HTML from reports", () => {
    const { events } = normaliseMtGeoJson(MT_EVENTS_FIXTURE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.state).toBe("MT");
    expect(e.category).toBe("incident");
    expect(e.route).toBe("MT-1");
    expect(e.lat).toBeCloseTo(46.2363, 3);
    expect(e.lon).toBeCloseTo(-113.3027, 3);
    expect(e.description).not.toContain("<");
    expect(e.description).toContain("Rock Fall Warning");
    expect(e.updatedTs).toBe(1771731145 * 1000);
  });
  it("maps restrictions category", () => {
    const { events } = normaliseMtGeoJson(MT_RESTRICTIONS_FIXTURE);
    expect(events[0].category).toBe("restriction");
  });
  it("throws on a schema-breaking payload", () => {
    expect(() => normaliseMtGeoJson({ features: "nope" })).toThrow();
  });
});

describe("normaliseIdWzdx", () => {
  it("maps work zones only, first MultiPoint coordinate, feed clock from feed_info", () => {
    const { events, feedUpdatedTs } = normaliseIdWzdx(ID_WZDX_FIXTURE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.state).toBe("ID");
    expect(e.category).toBe("workzone");
    expect(e.route).toBe("W Chinden Blvd");
    expect(e.lat).toBeCloseTo(43.6628, 3);
    expect(e.lon).toBeCloseTo(-116.4703, 3);
    expect(feedUpdatedTs).toBe(Date.parse("2026-10-30T15:09:01.003515+00:00"));
  });
  it("throws on a schema-breaking payload", () => {
    expect(() => normaliseIdWzdx({})).toThrow();
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<b>MT-1</b><br />Rocks<br>on road")).toBe("MT-1 Rocks on road");
  });
});

describe("isStaleFeed", () => {
  it("flags feed clocks older than 30 minutes, never a missing clock", () => {
    const now = 1_000_000_000_000;
    expect(isStaleFeed(now - 31 * 60 * 1000, now)).toBe(true);
    expect(isStaleFeed(now - 5 * 60 * 1000, now)).toBe(false);
    expect(isStaleFeed(null, now)).toBe(false);
  });
});

/** A straight east-west route along latitude 39.0, lng -120 → -119. */
const ROUTE: [number, number][] = [
  [-120, 39],
  [-119.5, 39],
  [-119, 39],
];

function ev(lat: number, lon: number, id: string): RoadEvent {
  return {
    state: "CA",
    source: "test",
    sourceId: id,
    category: "chain",
    route: "SR-89",
    description: "d",
    statusText: "s",
    lat,
    lon,
    updatedTs: 0,
  };
}

describe("corridor matching", () => {
  it("measures point-to-polyline distance", () => {
    // ~0.05° north of the line ≈ 3.4 miles away.
    const far = pointToPolylineMiles(39.05, -119.5, ROUTE);
    expect(far.miles).toBeGreaterThan(3);
    expect(far.miles).toBeLessThan(4);
    const on = pointToPolylineMiles(39.001, -119.5, ROUTE);
    expect(on.miles).toBeLessThan(0.2);
  });
  it("matches only events within the 2-mile corridor, in driving order", () => {
    const matched = matchEventsToRoute(
      [ev(39.001, -119.1, "b"), ev(39.05, -119.5, "far"), ev(39.0, -119.9, "a")],
      ROUTE,
    );
    expect(matched.map((m) => m.event.sourceId)).toEqual(["a", "b"]);
  });
});

describe("statesForRoute", () => {
  it("identifies a Tahoe-area route as CA", () => {
    expect(
      statesForRoute([
        [-120.2, 39.3],
        [-119.98, 39.1],
      ]),
    ).toContain("CA");
  });
  it("identifies a Park City route as UT (an uncovered state)", () => {
    const states = statesForRoute([
      [-111.5, 40.7],
      [-111.65, 40.65],
    ]);
    expect(states).toContain("UT");
    expect(states).not.toContain("CA");
  });
});
