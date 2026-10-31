import { describe, expect, it } from "vitest";
import { buildEventSchema } from "./event-schema";

describe("buildEventSchema (R67 standard)", () => {
  it("classifies a sporting event as SportsEvent with start, end and location", () => {
    const ld = buildEventSchema({
      sport: true,
      name: "Example Marathon 2027",
      startDate: "2027-04-19",
      endDate: "2027-04-19",
      locationName: "Copley Square, Boston",
      url: "https://worldeye.app/example-marathon",
    });
    expect(ld["@type"]).toBe("SportsEvent");
    expect(ld.startDate).toBe("2027-04-19");
    expect(ld.endDate).toBe("2027-04-19");
    expect(ld.location).toMatchObject({ "@type": "Place", name: "Copley Square, Boston" });
    expect(ld.url).toBe("https://worldeye.app/example-marathon");
  });

  it("classifies a non-sport event as Event", () => {
    const ld = buildEventSchema({
      sport: false,
      name: "Example Parade 2026",
      startDate: "2026-11-26",
      endDate: "2026-11-26",
      locationName: "Herald Square, New York City",
      url: "https://worldeye.app/example-parade",
    });
    expect(ld["@type"]).toBe("Event");
  });

  it("carries the optional address, geo, sameAs and description when supplied", () => {
    const ld = buildEventSchema({
      sport: false,
      name: "Example Festival 2026",
      startDate: "2026-09-19",
      endDate: "2026-10-04",
      locationName: "Theresienwiese, Munich, Germany",
      locationAddress: "Theresienwiese, 80336 Munich, Germany",
      locationSameAs: "https://example.test/venue",
      locationGeo: { latitude: 48.1319, longitude: 11.5497 },
      url: "https://worldeye.app/example-festival",
      description: "An example festival.",
    });
    expect(ld.location).toMatchObject({
      address: "Theresienwiese, 80336 Munich, Germany",
      sameAs: "https://example.test/venue",
      geo: { "@type": "GeoCoordinates", latitude: 48.1319, longitude: 11.5497 },
    });
    expect(ld.description).toBe("An example festival.");
  });

  it("omits description when none is supplied", () => {
    const ld = buildEventSchema({
      sport: true,
      name: "Example Race",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      locationName: "New York City",
      url: "https://worldeye.app/example-race",
    });
    expect("description" in ld).toBe(false);
  });
});
