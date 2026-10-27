import { describe, expect, it } from "vitest";
import type { CountryCamera } from "@/lib/country-cameras";
import type { PlaceWeather } from "@/lib/place-weather";
import {
  breakdownFaqs,
  cityStatusRows,
  computeCameraKindMix,
  computeCityAreaSplit,
  computeNamedViewpoints,
  computePassBorderCameras,
  computePlaceBreakdown,
  computePlaceFacts,
  operatorKind,
  operatorRows,
  parseCorridor,
  stateCorridorFaq,
  stateFreewayFaq,
  stateHubForCity,
  stateStatusRows,
  statusFaqs,
  type StatusRow,
} from "@/lib/place-breakdown";

describe("parseCorridor", () => {
  it("parses spaced and dashed designations", () => {
    expect(parseCorridor("I-5 at MP 172.4: NE 103rd Express Lanes Ramp")).toBe("I-5");
    expect(parseCorridor("SR-202 @Santan Village Pkwy")).toBe("SR 202");
    expect(parseCorridor("US 83 @ SL 517")).toBe("US 83");
    expect(parseCorridor("SH 359 and Loop 20 Interchange")).toBe("SH 359");
  });

  it("parses compact TxDOT forms", () => {
    expect(parseCorridor("IH35W @ Vickery")).toBe("I-35W");
    expect(parseCorridor("SH121 @ Bedford Euless EB (NTE)")).toBe("SH 121");
    expect(parseCorridor("LP20EB @ McPherson")).toBe("Loop 20");
    expect(parseCorridor("WWD IH820 @ Marine Creek S WB")).toBe("I-820");
  });

  it("takes the road named first (the host road at a junction)", () => {
    expect(parseCorridor("SH121 @ IH635 MH SB")).toBe("SH 121");
    expect(parseCorridor("LP20 at IH35 DC5")).toBe("Loop 20");
    expect(parseCorridor("FM731 @ FM1187")).toBe("FM 731");
  });

  it("parses UK A/M roads only with a capitalised word after", () => {
    expect(parseCorridor("A406 North Circular Rd")).toBe("A406");
    expect(parseCorridor("A3 Clapham Rd SW4")).toBe("A3");
    expect(parseCorridor("M25 Junction 10")).toBe("M25");
    expect(parseCorridor("Unit A3 storage bay")).toBeNull();
    expect(parseCorridor("Camera 12 at 5th Ave")).toBeNull();
  });

  it("falls back to designations embedded in the camera id", () => {
    expect(parseCorridor("HIGHWAY CAMERA", "LRD-LRD-US83 @ SL517")).toBe("US 83");
    expect(parseCorridor("HIGHWAY CAMERA", "LRD-LRD-BI35 @ Commerce")).toBe("Business I-35");
    expect(parseCorridor("HIGHWAY CAMERA", "some-feed-42")).toBeNull();
    expect(parseCorridor("HIGHWAY CAMERA")).toBeNull();
  });
});

function fixtureRecords(): CountryCamera[] {
  const recs: CountryCamera[] = [];
  const push = (n: number, name: string, lat: number, lng: number, source = "TxDOT") => {
    for (let i = 0; i < n; i++) {
      recs.push({ id: `${name}-${i}`, name: `${name} cam ${i}`, city: "Testville", lat, lng, source });
    }
  };
  push(18, "IH35", 30.3, -97.7); // I-35 — NE of centre
  push(12, "US 183", 30.1, -97.9); // US 183 — SW
  push(8, "SH 130", 30.2, -97.6); // SH 130 — SE-ish
  push(6, "Downtown intersection", 30.25, -97.75, "City of Testville"); // unnamed
  return recs;
}

describe("computePlaceBreakdown", () => {
  it("sums exactly to the record total", () => {
    const b = computePlaceBreakdown(fixtureRecords());
    expect(b.total).toBe(44);
    const shown = b.corridors.reduce((s, r) => s + r.count, 0);
    expect(shown + b.moreCorridors + b.unnamed).toBe(b.total);
    expect(b.unnamed).toBe(6);
  });

  it("ranks corridors and counts freeway designations", () => {
    const b = computePlaceBreakdown(fixtureRecords());
    expect(b.corridors[0]).toEqual({ name: "I-35", count: 18 });
    expect(b.freewayCount).toBe(30); // I-35 (18) + US 183 (12); SH 130 is not
  });

  it("splits placed records into quadrants that sum to placed", () => {
    const b = computePlaceBreakdown(fixtureRecords());
    expect(b.placed).toBe(44);
    const q = b.quadrants;
    expect(q).not.toBeNull();
    expect(q!.northEast + q!.northWest + q!.southEast + q!.southWest).toBe(44);
  });

  it("degrades: no quadrant split for tiny sets, sources still counted", () => {
    const small: CountryCamera[] = [
      { id: "a", name: "I-5 north", lat: 47.6, lng: -122.3, source: "WSDOT" },
      { id: "b", name: "I-5 south", lat: 47.5, lng: -122.4, source: "WSDOT" },
    ];
    const b = computePlaceBreakdown(small);
    expect(b.quadrants).toBeNull();
    expect(b.sources).toEqual([{ name: "WSDOT", count: 2 }]);
    expect(b.total).toBe(2);
  });
});

const snowWeather: PlaceWeather = {
  weather: {
    location: { name: "Laredo", region: "Texas", country: "USA", lat: 27.5, lng: -99.5, localtime: null },
    current: {
      tempC: -1, tempF: 30, feelsLikeC: -4, condition: { text: "Light snow", code: 1213 },
      windKph: 18, humidity: 81, uv: 1, lastUpdated: "2026-01-15 08:00",
    },
    forecast: [],
    alerts: [],
    airQuality: null,
    fetchedAt: 0,
    stale: false,
  },
  airQuality: null,
};

const noWeather: PlaceWeather = { weather: null, airQuality: null };

describe("cityStatusRows honesty", () => {
  it("with no weather feed, refuses to guess and never asserts conditions", () => {
    const rows = cityStatusRows({
      name: "Laredo", isUS: true, pageCount: 120, stills: 118, streams: 0,
      breakdown: computePlaceBreakdown(fixtureRecords()), weather: noWeather,
    });
    const snow = rows.find((r) => r.q.includes("snowing"));
    expect(snow?.a).toContain("won't guess");
    const all = rows.map((r) => r.a).join(" ");
    expect(all).not.toMatch(/snow is falling|roads are clear|sunny today/i);
  });

  it("with a snow snapshot, answers yes from the condition text", () => {
    const rows = cityStatusRows({
      name: "Laredo", isUS: true, pageCount: 120, stills: 118, streams: 0,
      breakdown: null, weather: snowWeather,
    });
    const snow = rows.find((r) => r.q.includes("snowing"));
    expect(snow?.a).toContain("Yes");
    expect(snow?.a).toContain("Light snow");
  });

  it("traffic row never scores congestion, with or without a breakdown", () => {
    for (const breakdown of [null, computePlaceBreakdown(fixtureRecords())]) {
      const rows = cityStatusRows({
        name: "Laredo", isUS: true, pageCount: 120, breakdown, weather: noWeather,
      });
      const traffic = rows.find((r) => r.q.includes("traffic"));
      expect(traffic?.a).toContain("can't honestly score congestion");
      expect(traffic?.a).not.toMatch(/jammed|gridlock|flowing freely|moving well/i);
    }
  });
});

describe("stateStatusRows + stateFreewayFaq", () => {
  const areas = [
    { name: "Houston", count: 1172 },
    { name: "Dallas", count: 843 },
    { name: "Fort Worth", count: 489 },
  ];
  it("traffic row spends only the measured count and largest cluster", () => {
    const rows = stateStatusRows({ stateName: "Texas", count: 4963, areas, weather: noWeather });
    const traffic = rows.find((r) => r.q.includes("traffic"));
    expect(traffic?.a).toContain("4,963");
    expect(traffic?.a).toContain("Houston");
    expect(traffic?.a).toContain("freeway");
  });
  it("freeway FAQ carries the measured numbers", () => {
    const faq = stateFreewayFaq({ stateName: "Texas", count: 4963, areas });
    expect(faq.q).toBe("Does Texas have freeway cameras?");
    expect(faq.a).toContain("4,963");
    expect(faq.a).toContain("1,172");
  });
});

describe("breakdownFaqs gates", () => {
  it("emits all three FAQs for a rich US breakdown, with matching numbers", () => {
    const faqs = breakdownFaqs({
      name: "Testville", isUS: true, breakdown: computePlaceBreakdown(fixtureRecords()),
    });
    expect(faqs.map((f) => f.q)).toEqual([
      "Which roads in Testville have the most cameras?",
      "Does Testville have freeway cameras?",
      "How are Testville's cameras spread across the city?",
    ]);
    expect(faqs[1].a).toContain("30 of the 44");
  });

  it("emits nothing for a thin breakdown", () => {
    const thin = computePlaceBreakdown([
      { id: "a", name: "Harbour view", source: "Port" },
      { id: "b", name: "Pier view", source: "Port" },
    ]);
    expect(breakdownFaqs({ name: "Porttown", isUS: false, breakdown: thin })).toEqual([]);
  });
});

describe("stateHubForCity", () => {
  it("resolves by camera centroid", () => {
    expect(stateHubForCity("united-states", "Laredo", { lat: 27.51, lng: -99.51 })?.slug).toBe("texas");
  });
  it("resolves by unique area-name match without a centroid", () => {
    expect(stateHubForCity("united-states", "Fort Worth", null)?.slug).toBe("texas");
  });
  it("never guesses: non-US or unknown city → null", () => {
    expect(stateHubForCity("united-kingdom", "London", { lat: 51.5, lng: -0.12 })).toBeNull();
    expect(stateHubForCity("united-states", "Nowhereville", null)).toBeNull();
  });
});

describe("statusFaqs", () => {
  const pageFaqs = [
    { q: "How many live cameras are there in Laredo?", a: "120." },
    { q: "Is it snowing in Laredo right now?", a: "Template FAQ answer." },
  ];
  const rows: StatusRow[] = [
    {
      q: "Is it snowing in Laredo right now?",
      a: "WorldEye has no live weather feed wired for Laredo, so this page won't guess.",
      href: "/live-traffic-cameras",
      linkLabel: "Open the live cameras",
    },
    {
      q: "How bad is traffic in Laredo right now?",
      a: "A camera index can't honestly score congestion.",
      href: "/live-traffic-cameras",
      linkLabel: "All US live traffic cameras",
    },
  ];

  it("appends the visible status rows after the page's own FAQs", () => {
    const out = statusFaqs(pageFaqs.slice(0, 1), rows);
    expect(out.map((f) => f.q)).toEqual([
      "How many live cameras are there in Laredo?",
      "Is it snowing in Laredo right now?",
      "How bad is traffic in Laredo right now?",
    ]);
  });

  it("carries the same render's rows end-to-end (cityStatusRows → schema set)", () => {
    const live = cityStatusRows({
      name: "Laredo", isUS: true, pageCount: 120, stills: 118, streams: 0,
      breakdown: computePlaceBreakdown(fixtureRecords()), weather: noWeather,
    });
    const out = statusFaqs([], live);
    expect(out).toEqual(live.map((r) => ({ q: r.q, a: r.a })));
    // The honest no-feed wording survives into the schema verbatim.
    expect(out[0].a).toContain("won't guess");
  });

  it("the page's own FAQ wins a collision (§3 normalized dedupe)", () => {
    const out = statusFaqs(pageFaqs, rows);
    const snow = out.filter((f) => f.q.startsWith("Is it snowing"));
    expect(snow).toHaveLength(1);
    expect(snow[0].a).toBe("Template FAQ answer.");
    // Case/punctuation variants of a template question also collide.
    const variant: StatusRow[] = [
      { q: "HOW MANY LIVE CAMERAS ARE THERE IN LAREDO", a: "row answer" },
    ];
    expect(statusFaqs(pageFaqs, variant)).toHaveLength(pageFaqs.length);
  });

  it("dedupes within the rows themselves", () => {
    const dup: StatusRow[] = [rows[1], { ...rows[1] }];
    expect(statusFaqs([], dup)).toHaveLength(1);
  });

  it("href/linkLabel never enter the schema entries", () => {
    const out = statusFaqs([], rows);
    for (const f of out) {
      expect(Object.keys(f).sort()).toEqual(["a", "q"]);
    }
  });

  it("empty rows return the FAQ set unchanged; inputs are not mutated", () => {
    const faqs = pageFaqs.map((f) => ({ ...f }));
    const snapshot = JSON.stringify(faqs);
    expect(statusFaqs(faqs, [])).toEqual(faqs);
    expect(JSON.stringify(faqs)).toBe(snapshot);
    const out = statusFaqs(faqs, rows);
    expect(out).not.toBe(faqs);
    expect(JSON.stringify(faqs)).toBe(snapshot);
  });
});

describe("computeCameraKindMix (C6)", () => {
  const rec = (name: string): CountryCamera => ({ id: name, name, source: "X" });
  it("partitions records under the first kind their name matches", () => {
    const mix = computeCameraKindMix([
      rec("Denver Airport terminal"), rec("Airport approach"), rec("Airport parking"),
      rec("Harbour pier"), rec("Pier 39 marina"),
      rec("Ski lift summit"), rec("Gondola station base"),
      rec("River bridge overlook"),
      rec("I-35 downtown"), rec("I-35 at the junction"), rec("Motorway interchange"), rec("Freeway toll plaza"),
      rec("Old town square"),
      rec("Untitled feed 12"),
    ]);
    const byLabel = new Map(mix.map((r) => [r.name, r.count]));
    // "Gondola station base" names both mountains (gondola) and transport
    // (station) — transport is the more specific kind and wins the record.
    expect(byLabel.get("Airports & stations")).toBe(4);
    expect(byLabel.get("Coast & harbour")).toBe(2);
    expect(byLabel.get("Mountains & ski")).toBe(1);
    expect(byLabel.get("Rivers & nature")).toBe(1); // river beats bridge (city)
    expect(byLabel.get("Roads & traffic")).toBe(4);
    expect(byLabel.get("City views & landmarks")).toBe(1);
    // A partition: matched rows sum to the matched records, never beyond.
    expect(mix.reduce((s, r) => s + r.count, 0)).toBe(13);
    expect(mix[0].count).toBe(4);
  });

  it("is part of the place breakdown, from the same records", () => {
    const b = computePlaceBreakdown(fixtureRecords());
    const matched = b.mix.reduce((s, r) => s + r.count, 0);
    expect(matched).toBeLessThanOrEqual(b.total);
    for (const row of b.mix) expect(row.count).toBeGreaterThan(0);
  });
});

describe("operatorKind + operatorRows (C6)", () => {
  it("classifies the families the catalogue actually carries", () => {
    expect(operatorKind("TxDOT").kind).toBe("Road agency");
    expect(operatorKind("OpenCCTV / wsdot").kind).toBe("Road agency");
    expect(operatorKind("Oklahoma DOT").kind).toBe("Road agency");
    expect(operatorKind("Caltrans").kind).toBe("Road agency");
    expect(operatorKind("DGT").kind).toBe("Road agency");
    expect(operatorKind("THB Highway Bureau").kind).toBe("Road agency");
    expect(operatorKind("OpenCCTV / ny511").kind).toBe("511 traveller information");
    expect(operatorKind("Quebec 511").kind).toBe("511 traveller information");
    expect(operatorKind("OpenCCTV / socrata").kind).toBe("Open data");
    expect(operatorKind("OpenCCTV / arcgis_cams").kind).toBe("Open data");
    expect(operatorKind("SkylineWebcams").kind).toBe("Webcam network");
  });

  it("never guesses an identity for an unrecognised name", () => {
    const info = operatorKind("OpenCCTV / rivergojp");
    expect(info.kind).toBe("Public network");
    expect(info.note).toContain("own name");
  });

  it("rows keep the caller's order, honour the limit, carry kind + note", () => {
    const rows = operatorRows(
      [
        { name: "TxDOT", count: 100 },
        { name: "OpenCCTV / socrata", count: 50 },
        { name: "Some Local Feed", count: 3 },
      ],
      2,
    );
    expect(rows.map((r) => r.name)).toEqual(["TxDOT", "OpenCCTV / socrata"]);
    expect(rows[0].kind).toBe("Road agency");
    expect(rows[1].kind).toBe("Open data");
    expect(rows.every((r) => r.note.length > 0)).toBe(true);
  });
});

describe("stateCorridorFaq (C6)", () => {
  it("spends the measured corridors with the state's coordinate framing", () => {
    const faq = stateCorridorFaq({
      stateName: "Texas",
      breakdown: computePlaceBreakdown(fixtureRecords()),
    });
    expect(faq?.q).toBe("Which roads in Texas have the most cameras?");
    expect(faq?.a).toContain("I-35 carries the most, with 18");
    expect(faq?.a).toContain("own coordinates place them in Texas");
  });

  it("is null when fewer than two corridors parse", () => {
    const thin = computePlaceBreakdown([
      { id: "a", name: "Harbour view", source: "Port" },
      { id: "b", name: "Pier view", source: "Port" },
    ]);
    expect(stateCorridorFaq({ stateName: "Maine", breakdown: thin })).toBeNull();
  });
});

describe("computePlaceFacts (§4.1.3)", () => {
  const spread = (n: number, dLat: number, dLng: number): CountryCamera[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      name: `Cam ${i}`,
      lat: 50 + (i % 5) * dLat,
      lng: -120 + (i % 7) * dLng,
      source: "X",
    }));

  it("computes the centroid (4dp mean) and the widest span", () => {
    const facts = computePlaceFacts(spread(35, 0.1, 0.1));
    expect(facts).not.toBeNull();
    expect(facts!.placed).toBe(35);
    expect(facts!.spanKm).toBeGreaterThanOrEqual(40);
    expect(facts!.centroid.lat).toBeCloseTo(50.2, 3);
  });

  it("is null for a thin placed set and for a single cluster", () => {
    expect(computePlaceFacts(spread(9, 0.5, 0.5))).toBeNull();
    expect(computePlaceFacts(spread(30, 0.0001, 0.0001))).toBeNull();
    expect(
      computePlaceFacts([{ id: "a", name: "No coords", source: "X" }]),
    ).toBeNull();
  });
});

describe("computeNamedViewpoints (§4.1.4)", () => {
  const recs: CountryCamera[] = [
    { id: "1", name: "City Airport — Terminal 1", source: "Port Authority" },
    { id: "2", name: "Harbour Bridge", source: "City" },
    { id: "3", name: "Old Town Square", source: "City" },
    { id: "4", name: "Marina Pier", source: "Harbour Board" },
    { id: "5", name: "I-5 @ Main St", source: "DOT" },
    { id: "6", name: "Harbour Bridge", source: "City" }, // duplicate name
    { id: "7", name: "Castle Hill", source: "Webcams" },
  ];

  it("picks signal-named cameras, deduped, with operators", () => {
    const out = computeNamedViewpoints(recs, []);
    expect(out.map((v) => v.name)).toEqual([
      "City Airport — Terminal 1",
      "Harbour Bridge",
      "Marina Pier",
      "Castle Hill",
      "Old Town Square",
    ]);
    expect(out[0].source).toBe("Port Authority");
  });

  it("excludes the featured list and needs at least three", () => {
    expect(computeNamedViewpoints(recs, ["City Airport — Terminal 1", "Harbour Bridge", "Marina Pier", "Castle Hill"])).toEqual([]);
    const out = computeNamedViewpoints(recs, ["city airport — terminal 1"]);
    expect(out.map((v) => v.name)).not.toContain("City Airport — Terminal 1");
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("caps at the limit, signal priority first", () => {
    const many: CountryCamera[] = Array.from({ length: 9 }, (_, i) => ({
      id: `b${i}`,
      name: `Bridge ${String.fromCharCode(65 + i)}`,
      source: "DOT",
    }));
    many.push({ id: "a1", name: "The Airport", source: "Port" });
    const out = computeNamedViewpoints(many, [], 5);
    expect(out).toHaveLength(5);
    expect(out[0].name).toBe("The Airport");
  });
});

describe("computeCityAreaSplit (§4.1.5)", () => {
  const named = (names: string[]): CountryCamera[] =>
    names.map((name, i) => ({ id: `r${i}`, name, source: "X" }));

  it("splits by ward where the names carry wards", () => {
    const recs = named([
      ...Array(6).fill("River cam, Meguro Ward"),
      ...Array(5).fill("River cam, Ota Ward"),
      ...Array(7).fill("River cam, Adachi Ward"),
      ...Array(4).fill("Plain street cam"),
    ]);
    const split = computeCityAreaSplit(recs);
    expect(split?.kind).toBe("ward");
    expect(split?.rows.map((r) => r.name)).toEqual([
      "Adachi Ward",
      "Meguro Ward",
      "Ota Ward",
    ]);
    expect(split?.tail).toBe(4);
  });

  it("keeps a ward set below the per-area gate dark", () => {
    const recs = named([
      ...Array(4).fill("River cam, Meguro Ward"),
      ...Array(4).fill("River cam, Ota Ward"),
      ...Array(4).fill("River cam, Adachi Ward"),
      ...Array(9).fill("Plain street cam"),
    ]);
    expect(computeCityAreaSplit(recs)).toBeNull();
  });

  it("splits by quadrant when the quadrant system is systematic", () => {
    const recs = named([
      ...Array(30).fill("10 Avenue and 1 Street SW"),
      ...Array(25).fill("114 Ave / Stoney Tr SE"),
      ...Array(20).fill("64 Ave NE"),
      ...Array(10).fill("Centre St"),
    ]);
    const split = computeCityAreaSplit(recs);
    expect(split?.kind).toBe("quadrant");
    expect(split?.rows.map((r) => r.name)).toEqual([
      "South-west (SW)",
      "South-east (SE)",
      "North-east (NE)",
    ]);
    expect(split?.tail).toBe(10);
  });

  it("does not mistake street suffixes for a quadrant system", () => {
    // Seattle-shaped: trailing NE/SE/SW on ~14% of names, as street
    // suffixes — below the systematic share, so no split renders.
    const recs = named([
      ...Array(30).fill("I-405 at MP 25: 243rd St SE"),
      ...Array(25).fill("35th Ave SW @ Fauntleroy Way SW"),
      ...Array(15).fill("I-5 at MP 178: 236th St SW"),
      ...Array(430).fill("12th Ave NE & NE 50th St"),
    ]);
    expect(computeCityAreaSplit(recs)).toBeNull();
  });
});

describe("computePassBorderCameras (§4.2.3)", () => {
  const recs: CountryCamera[] = [
    { id: "1", name: "SR-150 RWIS EB @ Bald Mountain Pass / MP 29.2", source: "UDOT" },
    { id: "2", name: "US-6 @ Skull Rock Pass / MP 40.72", source: "UDOT" },
    { id: "3", name: "I-5 at CA Border (Siskiyou)", source: "ODOT" },
    { id: "4", name: "WSF Fauntleroy Ferry Holding", source: "WSDOT" },
    { id: "5", name: "Bolivar Ferry at 15th", source: "TxDOT" },
    { id: "6", name: "Ashford Dunwoody Rd at Johnson Ferry Rd", source: "GDOT" },
    { id: "7", name: "Atlanta Rd at Paces Ferry Rd", source: "GDOT" },
    { id: "8", name: "I-15 Overpass at 500 S", source: "UDOT" },
    { id: "9", name: "Bypass Rd @ Passaic Ave", source: "NJDOT" },
    { id: "10", name: "Downtown intersection", source: "City" },
    { id: "11", name: "SR-150 RWIS EB @ Bald Mountain Pass / MP 29.2", source: "UDOT" }, // dup name
  ];

  it("groups pass, border and ferry cameras by name evidence", () => {
    const groups = computePassBorderCameras(recs);
    expect(groups.map((g) => g.key)).toEqual(["passes", "border", "ferries"]);
    const passes = groups.find((g) => g.key === "passes")!;
    expect(passes.total).toBe(3); // the duplicate name still counts
    expect(passes.names).toHaveLength(2); // but is quoted once
    const ferries = groups.find((g) => g.key === "ferries")!;
    expect(ferries.total).toBe(2);
    expect(ferries.names).toContain("Bolivar Ferry at 15th");
  });

  it("never calls a Ferry Road a ferry, nor an overpass a pass", () => {
    const ferries = computePassBorderCameras(recs).find((g) => g.key === "ferries")!;
    expect(ferries.names.join(" ")).not.toMatch(/Johnson|Paces/);
    const passes = computePassBorderCameras(recs).find((g) => g.key === "passes")!;
    expect(passes.names.join(" ")).not.toMatch(/Overpass|Passaic/);
  });

  it("is empty without name evidence", () => {
    expect(
      computePassBorderCameras([{ id: "x", name: "Plain cam", source: "X" }]),
    ).toEqual([]);
  });
});
