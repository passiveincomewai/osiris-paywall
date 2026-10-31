import { describe, expect, it } from "vitest";
import {
  AZDOT_SOURCE,
  ITD_MAIN_SOURCE,
  UDOT_SOURCE,
  configuredCoveredStates,
  decodeEncodedPolyline,
  isStaleFeed,
  matchEventsToRoute,
  normaliseCaChainControl,
  normaliseCaLaneClosures,
  normaliseIbi511Alerts,
  normaliseIbi511Events,
  normaliseIbi511RoadConditions,
  normaliseIdWinterRoads,
  normaliseIdWzdx,
  normaliseMtGeoJson,
  normaliseOdotIncidents,
  normaliseOdotRwReports,
  normaliseWsdotHighwayAlerts,
  normaliseWsdotPassConditions,
  parsePacificTimestamp,
  parseWcfDateTime,
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

/* ------------------------------------------------------------------ */
/* Keyed feeds (DOT wiring build). These fixtures are trimmed copies   */
/* of the sample payloads published in each DOT's OWN developer docs   */
/* (fetched 2026-10-30: UDOT/ITD/AZ511 endpoint help pages, WSDOT      */
/* class references, ODOT TripCheck XSDs) — same field names, same     */
/* types, same quirks (WCF dates, space-containing keys). No live key  */
/* existed at build time, so NO fixture comes from a live keyed call.  */
/* ------------------------------------------------------------------ */

const GOOGLE_POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"; // canonical doc example

describe("decodeEncodedPolyline", () => {
  it("decodes the canonical example polyline", () => {
    const pts = decodeEncodedPolyline(GOOGLE_POLYLINE);
    expect(pts).toHaveLength(3);
    expect(pts[0][0]).toBeCloseTo(38.5, 3);
    expect(pts[0][1]).toBeCloseTo(-120.2, 3);
    expect(pts[1][0]).toBeCloseTo(40.7, 3);
    expect(pts[1][1]).toBeCloseTo(-120.95, 3);
    expect(pts[2][0]).toBeCloseTo(43.252, 3);
    expect(pts[2][1]).toBeCloseTo(-126.453, 3);
  });
});

const IB511_EVENTS_FIXTURE = [
  {
    ID: 123456,
    SourceId: "123456",
    Organization: "UDOT",
    RoadwayName: "I-15",
    DirectionOfTravel: "Both Directions",
    Description: "Construction, I-15, Shepard Lane",
    Reported: 1760000000,
    LastUpdated: 1760100000,
    Latitude: 40.9872735,
    Longitude: -111.9129525,
    EventType: "roadwork",
    EventSubType: "Construction",
    IsFullClosure: false,
    EventCategory: "Construction",
  },
  {
    ID: 654321,
    SourceId: "654321",
    Organization: "UDOT",
    RoadwayName: "I-215",
    Description: "Road closed due to a crash",
    Reported: 1760050000,
    LastUpdated: 1760200000,
    Latitude: 40.7,
    Longitude: -111.9,
    EventType: "closures",
    EventSubType: "Road Closure",
    IsFullClosure: true,
    EventCategory: "Full Closure",
  },
];

describe("normaliseIbi511Events", () => {
  it("maps roadwork and full-closure events with unix-second clocks", () => {
    const r = normaliseIbi511Events(
      IB511_EVENTS_FIXTURE,
      "UT",
      UDOT_SOURCE,
      "utah-event",
    );
    expect(r.events).toHaveLength(2);
    expect(r.events[0].category).toBe("workzone");
    expect(r.events[0].state).toBe("UT");
    expect(r.events[0].sourceId).toBe("utah-event:123456");
    expect(r.events[0].updatedTs).toBe(1760100000 * 1000);
    expect(r.events[1].category).toBe("closure");
    expect(r.events[1].statusText).toContain("full closure");
    expect(r.feedUpdatedTs).toBe(1760200000 * 1000);
  });
  it("maps Idaho restrictionClass events to restrictions", () => {
    const r = normaliseIbi511Events(
      [
        {
          ...IB511_EVENTS_FIXTURE[0],
          EventType: "restrictionClass",
          EventSubType: "restrictions",
          Comment: "Vehicles over 10,000 restricted to 30mph",
        },
      ],
      "ID",
      ITD_MAIN_SOURCE,
      "id-restr",
    );
    expect(r.events[0].category).toBe("restriction");
    expect(r.events[0].state).toBe("ID");
  });
  it("throws on a non-array payload (schema failure -> unavailable)", () => {
    expect(() =>
      normaliseIbi511Events({ nope: true }, "UT", UDOT_SOURCE, "utah-event"),
    ).toThrow();
  });
});

const UDOT_RC_FIXTURE = [
  {
    Id: 1,
    SourceId: "1",
    RoadCondition: "Dry",
    WeatherCondition: "Fair",
    Restriction: "none",
    RoadwayName: "I-15 Idaho Stateline to Tremonton",
    EncodedPolyline: ["_p~iF~ps|U"],
    LastUpdated: 1760100000,
  },
  {
    Id: 2,
    SourceId: "2",
    RoadCondition: "Snow Covered",
    WeatherCondition: "Snowing",
    Restriction: "Chains Required",
    RoadwayName: "SR-190 Big Cottonwood Canyon",
    EncodedPolyline: [GOOGLE_POLYLINE],
    LastUpdated: 1760200000,
  },
];

describe("normaliseIbi511RoadConditions", () => {
  it("skips benign segments and places restricted ones at the polyline midpoint", () => {
    const r = normaliseIbi511RoadConditions(
      UDOT_RC_FIXTURE,
      "UT",
      UDOT_SOURCE,
      "utah-rc",
    );
    expect(r.events).toHaveLength(1);
    const e = r.events[0];
    expect(e.category).toBe("chain");
    expect(e.statusText).toBe("Chains Required");
    expect(e.route).toBe("SR-190 Big Cottonwood Canyon");
    // midpoint of the canonical 3-point polyline is its middle point
    expect(e.lat).toBeCloseTo(40.7, 3);
    expect(e.lon).toBeCloseTo(-120.95, 3);
    expect(r.feedUpdatedTs).toBe(1760200000 * 1000);
  });
  it("throws on a non-array payload", () => {
    expect(() =>
      normaliseIbi511RoadConditions("nope", "UT", UDOT_SOURCE, "utah-rc"),
    ).toThrow();
  });
});

const ID_WINTER_FIXTURE = [
  {
    Id: 11,
    LocationDescription:
      "ID-44, between ID-16 (near Star) and Riverside Drive (Garden City)",
    "Overall Status": "Dry",
    "Weather Conditions": "Fair",
    "Special Conditions": null,
    AreaName: "Boise",
    RoadwayName: "ID-44",
    EncodedPolyline: "_p~iF~ps|U",
    LastUpdated: 1760100000,
  },
  {
    Id: 12,
    LocationDescription: "US-20, Targhee Pass",
    "Overall Status": "Snow Covered",
    "Weather Conditions": "Snowing",
    "Special Conditions": "Chains required beyond milepost 402",
    AreaName: "Island Park",
    RoadwayName: "US-20",
    EncodedPolyline: "_p~iF~ps|U",
    LastUpdated: 1760200000,
  },
];

describe("normaliseIdWinterRoads", () => {
  it("reads the space-containing keys and skips dry segments", () => {
    const r = normaliseIdWinterRoads(ID_WINTER_FIXTURE);
    expect(r.events).toHaveLength(1);
    const e = r.events[0];
    expect(e.state).toBe("ID");
    expect(e.source).toBe(ITD_MAIN_SOURCE);
    expect(e.sourceId).toBe("id-winter:12");
    expect(e.category).toBe("chain");
    expect(e.lat).toBeCloseTo(38.5, 3);
    expect(e.lon).toBeCloseTo(-120.2, 3);
    expect(r.feedUpdatedTs).toBe(1760200000 * 1000);
  });
});

describe("normaliseIbi511Alerts", () => {
  it("never invents a location: coord-less alerts advance only the feed clock", () => {
    const r = normaliseIbi511Alerts(
      [
        {
          Id: 42,
          Message:
            "I-10 westbound: right lane closed between Baseline and Elliot roads.",
          Notes: "",
          StartTime: 1760000000,
          EndTime: 0,
          LastUpdated: 1760100000,
          Regions: ["Maricopa"],
          HighImportance: true,
        },
      ],
      "AZ",
      AZDOT_SOURCE,
      "az-alert",
    );
    expect(r.events).toHaveLength(0);
    expect(r.feedUpdatedTs).toBe(1760100000 * 1000);
  });
  it("emits an incident when a payload does carry coordinates", () => {
    const r = normaliseIbi511Alerts(
      [
        {
          Id: 43,
          Message: "SR-87 closed at Bush Highway.",
          LastUpdated: 1760100000,
          Latitude: 33.62,
          Longitude: -111.51,
          HighImportance: true,
        },
      ],
      "AZ",
      AZDOT_SOURCE,
      "az-alert",
    );
    expect(r.events).toHaveLength(1);
    expect(r.events[0].category).toBe("incident");
    expect(r.events[0].statusText).toBe("High-importance alert");
  });
});

describe("parseWcfDateTime", () => {
  it("parses WCF /Date(ms-offset)/ strings", () => {
    expect(parseWcfDateTime("/Date(1388623238000-0800)/")).toBe(1388623238000);
  });
  it("parses ISO strings and rejects garbage", () => {
    expect(parseWcfDateTime("2014-01-01T16:40:38.317")).toBe(
      Date.parse("2014-01-01T16:40:38.317"),
    );
    expect(parseWcfDateTime("not a date")).toBeNull();
    expect(parseWcfDateTime(null)).toBeNull();
  });
});

const WSDOT_PASS_FIXTURE = [
  {
    MountainPassId: 11,
    MountainPassName: "Snoqualmie Pass",
    Latitude: 47.3925,
    Longitude: -121.4008,
    DateUpdated: "/Date(1760100000000-0700)/",
    TemperatureInFahrenheit: 30,
    ElevationInFeet: 3022,
    WeatherCondition: "Snow",
    RoadCondition: "Snow and slush on roadway",
    TravelAdvisoryActive: true,
    RestrictionOne: {
      TravelDirection: "All",
      RestrictionText: "Chains required on all vehicles except all wheel drive",
    },
    RestrictionTwo: { TravelDirection: "All", RestrictionText: "No restrictions" },
  },
  {
    MountainPassId: 12,
    MountainPassName: "Stevens Pass",
    Latitude: 47.7438,
    Longitude: -121.0889,
    DateUpdated: "/Date(1760200000000-0700)/",
    WeatherCondition: "Overcast",
    RoadCondition: "Bare and wet",
    TravelAdvisoryActive: false,
    RestrictionOne: {
      TravelDirection: "All",
      RestrictionText: "Traction Tires Required",
    },
    RestrictionTwo: { TravelDirection: "All", RestrictionText: "No restrictions" },
  },
  {
    MountainPassId: 13,
    MountainPassName: "White Pass",
    Latitude: 46.6393,
    Longitude: -121.3882,
    DateUpdated: "/Date(1760050000000-0700)/",
    WeatherCondition: "Clear",
    RoadCondition: "Bare and dry",
    TravelAdvisoryActive: false,
    RestrictionOne: { TravelDirection: "All", RestrictionText: "No restrictions" },
    RestrictionTwo: { TravelDirection: "All", RestrictionText: "No restrictions" },
  },
];

describe("normaliseWsdotPassConditions", () => {
  it("emits chain/restriction events only for passes with real restrictions", () => {
    const r = normaliseWsdotPassConditions(WSDOT_PASS_FIXTURE);
    expect(r.events).toHaveLength(2);
    expect(r.events[0].sourceId).toBe("wa-pass:11");
    expect(r.events[0].category).toBe("chain");
    expect(r.events[1].sourceId).toBe("wa-pass:12");
    expect(r.events[1].category).toBe("restriction");
    expect(r.feedUpdatedTs).toBe(1760200000000);
  });
  it("throws on a non-array payload", () => {
    expect(() => normaliseWsdotPassConditions({})).toThrow();
  });
});

const WSDOT_ALERT_FIXTURE = [
  {
    AlertID: 555001,
    StartRoadwayLocation: {
      Description: "I-90, milepost 34",
      Direction: "E",
      Latitude: 47.4503,
      Longitude: -121.7069,
      MilePost: 34,
      RoadName: "I-90",
    },
    Region: "NW",
    County: "King",
    StartTime: "/Date(1760100000000-0700)/",
    EndTime: null,
    EventCategory: "Road Closure",
    HeadlineDescription: "I-90 eastbound closed at milepost 34",
    ExtendedDescription: "<p>Closed due to avalanche control.</p>",
    EventStatus: "Open",
    LastUpdatedTime: "/Date(1760150000000-0700)/",
    Priority: "Highest",
  },
  {
    AlertID: 555002,
    StartRoadwayLocation: {
      Latitude: 47.5,
      Longitude: -121.7,
      RoadName: "I-90",
    },
    EventCategory: "Collision",
    HeadlineDescription: "Old collision",
    EventStatus: "Closed",
    LastUpdatedTime: "/Date(1760140000000-0700)/",
  },
];

describe("normaliseWsdotHighwayAlerts", () => {
  it("maps open closures, strips HTML, and skips closed alerts", () => {
    const r = normaliseWsdotHighwayAlerts(WSDOT_ALERT_FIXTURE);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].category).toBe("closure");
    expect(r.events[0].route).toBe("I-90");
    expect(r.events[0].description).toBe("Closed due to avalanche control.");
    expect(r.feedUpdatedTs).toBe(1760150000000);
  });
  it("throws on a non-array payload", () => {
    expect(() => normaliseWsdotHighwayAlerts("nope")).toThrow();
  });
});

const ODOT_RW_FIXTURE = [
  {
    "station-id": 101,
    "entry-time": "2026-10-30T08:00:00",
    location: {
      "location-name": "Government Camp",
      "route-id": "US26",
      direction: "EB",
      "start-location": { "start-lat": 45.349, "start-long": -121.774 },
    },
    "weather-conditions": { "weather-id": 4 },
    "road-conditions": { "road-cond-id": 3 },
    "commercial-vehicle-restriction": [],
    "driving-restriction": [{ "restriction-id": "B" }],
    comments: "Carry chains",
  },
  {
    "station-id": 102,
    "entry-time": "2026-10-30T08:05:00",
    location: {
      "location-name": "Sandy",
      "route-id": "US26",
      "start-location": { "start-lat": 45.397, "start-long": -122.26 },
    },
    "commercial-vehicle-restriction": [],
    "driving-restriction": [{ "restriction-id": "0" }],
    comments: "",
  },
];

describe("normaliseOdotRwReports", () => {
  it("treats an active driving restriction as a chain-law event", () => {
    const r = normaliseOdotRwReports(ODOT_RW_FIXTURE);
    expect(r.events).toHaveLength(1);
    const e = r.events[0];
    expect(e.state).toBe("OR");
    expect(e.category).toBe("chain");
    expect(e.statusText).toContain("Chain law class B");
    expect(e.lat).toBeCloseTo(45.349, 3);
    expect(e.lon).toBeCloseTo(-121.774, 3);
    expect(r.feedUpdatedTs).toBe(Date.parse("2026-10-30T08:05:00"));
  });
  it("throws on an unrecognised payload root", () => {
    expect(() => normaliseOdotRwReports({ nope: true })).toThrow();
  });
  it("reads the live envelope key and parses records inside it", () => {
    const r = normaliseOdotRwReports({
      "organization-information": {
        "organization-id": "us.or..dot",
        "organization-name": "ODOT",
        "last-update-time": "2026-10-31T07:12:22.921Z",
      },
      "road-weather-reports": ODOT_RW_FIXTURE,
    });
    expect(r.events).toHaveLength(1);
    expect(r.events[0].category).toBe("chain");
    expect(r.feedUpdatedTs).toBe(Date.parse("2026-10-30T08:05:00"));
  });
  it("takes the feed clock from the envelope when the live set is empty", () => {
    // Verbatim shape of the live RW response on 2026-10-31: the feed
    // was up and current but had no reports to publish.
    const r = normaliseOdotRwReports({
      "organization-information": {
        "organization-id": "us.or..dot",
        "organization-name": "ODOT",
        "last-update-time": "2026-10-31T07:12:22.921Z",
      },
      "road-weather-reports": [],
    });
    expect(r.events).toEqual([]);
    expect(r.feedUpdatedTs).toBe(Date.parse("2026-10-31T07:12:22.921Z"));
  });
});

describe("normaliseOdotIncidents", () => {
  it("maps a closure-worded incident to a closure event", () => {
    const r = normaliseOdotIncidents([
      {
        "incident-id": "INC-77",
        "entry-time": "2026-10-30T07:30:00",
        "last-update": "2026-10-30T07:45:00",
        location: {
          "location-name": "US-26 at Government Camp",
          "route-id": "US26",
          "start-location": { "start-lat": 45.35, "start-long": -121.77 },
        },
        comments: "Crash blocking — road closed to all traffic",
      },
    ]);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].category).toBe("closure");
    expect(r.events[0].updatedTs).toBe(Date.parse("2026-10-30T07:45:00"));
  });
  it("throws on an unrecognised payload root", () => {
    expect(() => normaliseOdotIncidents(42)).toThrow();
  });
  it("maps the live-verified 2026-10-31 payload shape", () => {
    // Sanitized fixture built from the real gateway response: field
    // names, nesting and value formats match the live payload exactly
    // (values are representative, not copied records).
    const r = normaliseOdotIncidents({
      "organization-information": {
        "organization-id": "us.or..dot",
        "organization-name": "ODOT",
        "last-update-time": "2026-10-31T07:13:55.805Z",
      },
      incidents: [
        {
          "incident-id": "828001",
          "event-id": "EV-1",
          "event-type-id": "OB",
          "event-subtype-id": "0",
          "update-time": "2026-10-31T00:11:02-07:00",
          "create-time": "2026-10-14T16:36:03.13-07:00",
          "is-active": "true",
          "impact-id": "5",
          "impact-desc": "Closure",
          headline:
            "A fire is in the area and has many forest service roads closed. Use caution.",
          comments:
            "Closure in place for Grasshopper Fire.\n<!--Links Start Here-->\n[Link to Additional Information](https://example.com/alerts/closure)",
          location: {
            "location-name": "MT. HOOD",
            "route-id": "OR35",
            "hwy-id": "0",
            direction: "Both",
            "start-location": {
              "location-desc": "",
              "start-lat": 45.4,
              "start-long": -121.6,
              "start-milepost": 64,
            },
            "end-location": {},
          },
          "travel-lanes": {},
          "off-hwy-lanes": {},
          schedule: {},
          "info-url": "",
          files: [],
        },
        {
          "incident-id": "828002",
          "event-id": "EV-2",
          "event-type-id": "OB",
          "event-subtype-id": "0",
          "update-time": "2026-10-30T14:21:12-07:00",
          "create-time": "2026-10-30T14:09:00-07:00",
          "is-active": "false",
          "impact-id": "1",
          "impact-desc": "No to Minimum Delay",
          headline: "A crash has been cleared.",
          comments: "",
          location: {
            "location-name": "CLACKAMAS",
            "route-id": "OR224",
            "start-location": {
              "start-lat": 45.35,
              "start-long": -122.4,
              "start-milepost": 12,
            },
          },
        },
        {
          "incident-id": "828003",
          "event-id": "EV-3",
          "event-type-id": "VH",
          "event-subtype-id": "0",
          "update-time": "2026-10-30T23:58:12-07:00",
          "create-time": "2026-10-30T23:50:00-07:00",
          "is-active": "true",
          "impact-id": "2",
          "impact-desc": "Estimated delay under 20 minutes",
          headline:
            "A hazardous materials cleanup is causing minimal delay to traffic. Use caution.",
          comments: "",
          location: {
            "location-name": "OLD OREGON TRAIL",
            "route-id": "I84",
            "start-location": {
              "start-lat": 45.7,
              "start-long": -119.3,
              "start-milepost": 180,
            },
          },
        },
      ],
    });
    // Only the two active records become events; the inactive one's
    // update still counts toward the feed clock (here an active one
    // is newer anyway).
    expect(r.events).toHaveLength(2);
    const e = r.events[0];
    expect(e.sourceId).toBe("or-inc:828001");
    expect(e.route).toBe("OR35");
    // Closure comes from ODOT's own impact-desc, not keyword guessing.
    expect(e.category).toBe("closure");
    expect(e.statusText).toBe("Closure");
    // Live comments markup (HTML comment + markdown link) is stripped.
    expect(e.description).toBe(
      "Closure in place for Grasshopper Fire. Link to Additional Information",
    );
    // Freshness comes from "update-time", not the XSD-era field names.
    expect(e.updatedTs).toBe(Date.parse("2026-10-31T00:11:02-07:00"));
    expect(r.feedUpdatedTs).toBe(Date.parse("2026-10-31T00:11:02-07:00"));
    expect(e.lat).toBeCloseTo(45.4, 3);
    expect(e.lon).toBeCloseTo(-121.6, 3);
    // With comments empty (true for ~40% of live records), the
    // always-populated headline carries the description.
    const third = r.events[1];
    expect(third.sourceId).toBe("or-inc:828003");
    expect(third.category).toBe("incident");
    expect(third.description).toContain("hazardous materials cleanup");
    expect(third.statusText).toBe("Estimated delay under 20 minutes");
  });
});

describe("configuredCoveredStates", () => {
  it("returns exactly the keyless states when no env var is set", () => {
    expect(configuredCoveredStates({})).toEqual(["CA", "MT", "ID"]);
  });
  it("adds a state only when its env var is set to a non-blank value", () => {
    expect(
      configuredCoveredStates({
        UDOT_API_KEY: "k",
        WSDOT_ACCESS_CODE: "c",
        AZ511_API_KEY: "   ",
      }),
    ).toEqual(["CA", "MT", "ID", "UT", "WA"]);
    expect(configuredCoveredStates({ ODOT_TRIPCHECK_API_KEY: "k" })).toEqual([
      "CA",
      "MT",
      "ID",
      "OR",
    ]);
  });
  it("does not duplicate ID when the ITD key is set (ID is already keyless)", () => {
    expect(configuredCoveredStates({ ITD511_API_KEY: "k" })).toEqual([
      "CA",
      "MT",
      "ID",
    ]);
  });
});
