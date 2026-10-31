import { describe, expect, it } from "vitest";
import type { CountryCamera } from "@/lib/country-cameras";
import { buildCityRoster, buildStateRoster, cityRecords, globeId, rosterIsComplete, shortId, UNNAMED_AREA_LABEL } from "./city-roster";

const cam = (partial: Partial<CountryCamera> & { id: string }): CountryCamera => ({
  name: "Unnamed",
  city: "McAlester",
  ...partial,
});

describe("cityRecords", () => {
  it("matches the cleaned city value exactly — state values are not cities", () => {
    const records = [
      cam({ id: "a", city: "McAlester" }),
      cam({ id: "b", city: "  McAlester " }),
      cam({ id: "c", city: "Oklahoma" }),
      cam({ id: "d", city: "Pittsburg County" }),
      cam({ id: "e", city: "McAlester City" }),
    ];
    expect(cityRecords(records, "McAlester").map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("buildCityRoster", () => {
  it("renders the named test case: McAlester's single camera, unqualified", () => {
    const roster = buildCityRoster([
      cam({
        id: "occ-ok-1690894724543",
        name: "US-69 & C Tree NE",
        city: "McAlester",
        source: "OpenCCTV / oktraffic",
      }),
    ]);
    expect(roster).toEqual([
      {
        // The link id is the globe-served okdot- form (see globeId):
        // the chunk's occ-ok- copy resolves by id but its snapshot
        // stream playlist 404s; the okdot- copy plays.
        id: "okdot-1690894724543",
        name: "US-69 & C Tree NE",
        city: "McAlester",
        qualifier: null,
      },
    ]);
  });

  it("keeps every record, sorted by name then id, names exact", () => {
    const roster = buildCityRoster([
      cam({ id: "x2", name: "B Road" }),
      cam({ id: "x1", name: "A Road" }),
      cam({ id: "x3", name: "B Road", source: "SDOT" }),
    ]);
    expect(roster.map((r) => r.id)).toEqual(["x1", "x2", "x3"]);
    expect(roster.map((r) => r.name)).toEqual(["A Road", "B Road", "B Road"]);
  });

  it("qualifies a repeated name by source when sources distinguish it", () => {
    const roster = buildCityRoster([
      cam({ id: "g1", name: "I-75 at Main St", source: "GDOT" }),
      cam({ id: "g2", name: "I-75 at Main St", source: "City of Atlanta" }),
      cam({ id: "g3", name: "Unique Name", source: "GDOT" }),
    ]);
    const dups = roster.filter((r) => r.name === "I-75 at Main St");
    expect(dups.map((r) => r.qualifier)).toEqual(["GDOT", "City of Atlanta"]);
    expect(roster.find((r) => r.name === "Unique Name")?.qualifier).toBeNull();
  });

  it("falls back to the catalogue short-id when one source repeats the name", () => {
    const roster = buildCityRoster([
      cam({ id: "gdot-13532", name: "I-285 at Tunnel", source: "GDOT" }),
      cam({ id: "gdot-13530", name: "I-285 at Tunnel", source: "GDOT" }),
    ]);
    expect(roster.map((r) => r.qualifier)).toEqual(["13530", "13532"]);
  });

  it("drops records that cannot be named or linked", () => {
    const roster = buildCityRoster([
      cam({ id: "ok", name: "Real Camera" }),
      cam({ id: "noname", name: "   " }),
      { name: "No Id Camera", city: "McAlester" } as CountryCamera,
    ]);
    expect(roster.map((r) => r.id)).toEqual(["ok"]);
  });
});

describe("globeId", () => {
  it("translates the superseded oktraffic family to the okdot- id", () => {
    expect(
      globeId(cam({ id: "occ-ok-1690894724543", source: "OpenCCTV / oktraffic" })),
    ).toBe("okdot-1690894724543");
  });

  it("leaves every other record's id untouched", () => {
    expect(globeId(cam({ id: "occ-wsdot-1195", source: "OpenCCTV / wsdot" }))).toBe(
      "occ-wsdot-1195",
    );
    expect(globeId(cam({ id: "occ-ok-1690894724543", source: "Some other source" }))).toBe(
      "occ-ok-1690894724543",
    );
    expect(globeId(cam({ id: "gdot-13532", source: "GDOT" }))).toBe("gdot-13532");
  });
});

describe("shortId", () => {
  it("takes the final dash segment, or the id itself", () => {
    expect(shortId("occ-ok-1690894724543")).toBe("1690894724543");
    expect(shortId("gdot-13532")).toBe("13532");
    expect(shortId("plainid")).toBe("plainid");
  });
});

describe("buildStateRoster", () => {
  it("groups by the cleaned city value verbatim — state and county values stay honest group labels", () => {
    const groups = buildStateRoster([
      cam({ id: "g1", name: "10th St at Fowler St (Atlanta)", city: "Georgia", source: "GDOT" }),
      cam({ id: "g2", name: "I-75 at Main St", city: "Georgia", source: "GDOT" }),
      cam({ id: "m1", name: "US-69 & C Tree NE", city: "McAlester", source: "OpenCCTV / oktraffic" }),
      cam({ id: "c1", name: "County Rd 1", city: "Jasper County", source: "GDOT" }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Georgia", "Jasper County", "McAlester"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["g1", "g2"]);
    // The oktraffic translation applies inside state rosters too.
    expect(groups[2].entries[0].id).toBe("m1");
  });

  it("carries the globeId translation and duplicate qualifiers into groups", () => {
    const groups = buildStateRoster([
      cam({ id: "occ-ok-1690894724543", name: "US-69 & C Tree NE", city: "McAlester", source: "OpenCCTV / oktraffic" }),
      cam({ id: "d1", name: "I-35 at 2nd St", city: "Edmond", source: "ODOT" }),
      cam({ id: "d2", name: "I-35 at 2nd St", city: "Norman", source: "ODOT" }),
    ]);
    const mcAlester = groups.find((g) => g.label === "McAlester");
    expect(mcAlester?.entries[0].id).toBe("okdot-1690894724543");
    // Same name in different cities still qualifies (source ties → short-id).
    const flat = groups.flatMap((g) => g.entries);
    expect(flat.find((e) => e.id === "d1")?.qualifier).toBe("d1".split("-").pop());
    expect(flat.find((e) => e.id === "d2")?.qualifier).toBe("d2".split("-").pop());
  });

  it("files records with no city value under the unnamed label and drops unusable records", () => {
    const groups = buildStateRoster([
      cam({ id: "u1", name: "Lonely Cam", city: "" }),
      cam({ id: "u2", name: "", city: "Nowhere" }),
      cam({ id: "", name: "No Id", city: "Nowhere" }),
    ]);
    expect(groups).toEqual([
      { label: UNNAMED_AREA_LABEL, entries: [{ id: "u1", name: "Lonely Cam", city: "", qualifier: null }] },
    ]);
  });

  it("keeps every usable record exactly once across groups", () => {
    const records = Array.from({ length: 50 }, (_, i) =>
      cam({ id: `r${i}`, name: `Cam ${i}`, city: i % 2 ? "Tulsa" : "Norman" }),
    );
    const groups = buildStateRoster(records);
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(50);
  });
});

describe("rosterIsComplete", () => {
  it("accepts the substance line and exact small-city resolutions", () => {
    expect(rosterIsComplete(499, 499)).toBe(true);
    expect(rosterIsComplete(112, 73)).toBe(true); // chunk set above the line
    expect(rosterIsComplete(1, 1)).toBe(true); // McAlester
    expect(rosterIsComplete(25, 900)).toBe(true);
  });

  it("rejects partial resolutions that would pose as complete", () => {
    expect(rosterIsComplete(0, 100)).toBe(false);
    expect(rosterIsComplete(1, 890)).toBe(false); // Sydney's system-code chunk
    expect(rosterIsComplete(24, 100)).toBe(false);
  });
});
