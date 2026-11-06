import { describe, expect, it } from "vitest";
import {
  EONET_CATEGORY_IDS,
  EONET_EVENTS_URL,
  fetchNaturalEvents,
  geometryPoint,
  normalizeEonetEvents,
  parseEonetEvent,
} from "./eonet";

function event(overrides: Record<string, any> = {}): any {
  return {
    id: "EONET_1234",
    title: "Example Volcano, Chile",
    link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1234",
    closed: null,
    categories: [{ id: "volcanoes", title: "Volcanoes" }],
    sources: [{ id: "SIVolcano", url: "https://volcano.si.edu/" }],
    geometry: [
      { date: "2026-01-01T00:00:00Z", type: "Point", coordinates: [-71.4, -36.9] },
      { date: "2026-06-15T00:00:00Z", type: "Point", coordinates: [-71.378, -36.868] },
    ],
    ...overrides,
  };
}

describe("parseEonetEvent", () => {
  it("parses an in-scope event using its LATEST geometry", () => {
    const parsed = parseEonetEvent(event());
    expect(parsed).toMatchObject({
      id: "EONET_1234",
      title: "Example Volcano, Chile",
      category: "volcanoes",
      categoryLabel: "Volcanoes",
      lat: -36.868,
      lng: -71.378,
      date: "2026-06-15T00:00:00Z",
      url: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1234",
    });
  });

  it("excludes wildfires, earthquakes and drought (covered elsewhere / out of scope)", () => {
    for (const id of ["wildfires", "earthquakes", "drought"]) {
      expect(
        parseEonetEvent(event({ categories: [{ id, title: id }] })),
      ).toBeNull();
    }
  });

  it("picks the in-scope category when an event carries several", () => {
    const parsed = parseEonetEvent(
      event({
        categories: [
          { id: "wildfires", title: "Wildfires" },
          { id: "severeStorms", title: "Severe Storms" },
        ],
      }),
    );
    expect(parsed?.category).toBe("severeStorms");
    expect(parsed?.categoryLabel).toBe("Severe Storms");
  });

  it("rejects events without the id/title/geometry spine", () => {
    expect(parseEonetEvent(null)).toBeNull();
    expect(parseEonetEvent(event({ id: "" }))).toBeNull();
    expect(parseEonetEvent(event({ title: "  " }))).toBeNull();
    expect(parseEonetEvent(event({ geometry: [] }))).toBeNull();
    expect(parseEonetEvent(event({ geometry: [{ type: "Point", coordinates: [] }] }))).toBeNull();
    expect(
      parseEonetEvent(event({ geometry: [{ type: "Point", coordinates: [0, 0] }] })),
    ).toBeNull(); // no date — a pin must carry its reported date
  });

  it("falls back to the canonical event URL when link is missing", () => {
    const parsed = parseEonetEvent(event({ link: undefined }));
    expect(parsed?.url).toBe(
      "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1234",
    );
  });
});

describe("geometryPoint", () => {
  it("reads a Point", () => {
    expect(geometryPoint({ type: "Point", coordinates: [10, 20] })).toEqual({
      lat: 20,
      lng: 10,
    });
  });

  it("centroids a Polygon's outer ring", () => {
    const p = geometryPoint({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    });
    expect(p?.lat).toBeCloseTo(4);
    expect(p?.lng).toBeCloseTo(4);
  });

  it("returns null for unusable geometry", () => {
    expect(geometryPoint(null)).toBeNull();
    expect(geometryPoint({ type: "Point", coordinates: ["x", 1] })).toBeNull();
    expect(geometryPoint({ type: "LineString", coordinates: [[0, 0]] })).toBeNull();
  });
});

describe("normalizeEonetEvents", () => {
  it("dedupes by id and sorts newest first", () => {
    const out = normalizeEonetEvents({
      events: [
        event({ id: "EONET_1" }),
        event({
          id: "EONET_2",
          geometry: [{ date: "2026-07-01T00:00:00Z", type: "Point", coordinates: [1, 2] }],
        }),
        event({ id: "EONET_1" }),
        event({ id: "EONET_3", categories: [{ id: "wildfires", title: "Wildfires" }] }),
      ],
    });
    expect(out.map((e) => e.id)).toEqual(["EONET_2", "EONET_1"]);
  });

  it("tolerates a malformed payload", () => {
    expect(normalizeEonetEvents(null)).toEqual([]);
    expect(normalizeEonetEvents({})).toEqual([]);
    expect(normalizeEonetEvents({ events: "nope" })).toEqual([]);
  });
});

describe("fetchNaturalEvents", () => {
  it("reads the open-events feed and normalizes it", async () => {
    const fetchFn = async () =>
      ({
        ok: true,
        json: async () => ({ events: [event()] }),
      }) as any;
    const out = await fetchNaturalEvents(fetchFn as any);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("volcanoes");
  });

  it("throws on an upstream failure so the cache can fall back", async () => {
    const fetchFn = async () => ({ ok: false, status: 503 }) as any;
    await expect(fetchNaturalEvents(fetchFn as any)).rejects.toThrow(/503/);
  });

  it("asks the API for exactly the in-scope categories", async () => {
    // Load-bearing: the unfiltered feed is flooded with open wildfires,
    // so without the query filter the limit would cut off the volcanoes
    // and icebergs this layer exists to show (verified live 2026-11-05).
    let seenUrl = "";
    const fetchFn = async (url: string) => {
      seenUrl = String(url);
      return { ok: true, json: async () => ({ events: [] }) } as any;
    };
    await fetchNaturalEvents(fetchFn as any);
    expect(seenUrl).toBe(EONET_EVENTS_URL);
    const categoryParam = new URL(seenUrl).searchParams.get("category") ?? "";
    expect(categoryParam.split(",").sort()).toEqual(
      [...EONET_CATEGORY_IDS].sort(),
    );
    for (const excluded of ["wildfires", "earthquakes", "drought"]) {
      expect(categoryParam.split(",")).not.toContain(excluded);
    }
  });
});

describe("scope", () => {
  it("covers exactly the ten additive categories", () => {
    expect([...EONET_CATEGORY_IDS].sort()).toEqual(
      [
        "dustHaze",
        "floods",
        "landslides",
        "manmade",
        "seaLakeIce",
        "severeStorms",
        "snow",
        "tempExtremes",
        "volcanoes",
        "waterColor",
      ].sort(),
    );
  });
});
