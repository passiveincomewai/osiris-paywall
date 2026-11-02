import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createGeoLoader,
  getGeoCounties,
  getGeoLayer,
  listGeoLayers,
  type GeoConfig,
} from "./geo-data";

/**
 * Phase 10 geo data-layer tests (§5.3): layers never blend,
 * withheld cells keep their withheld state with no numeric value,
 * no-records states stay distinct from zero.
 */
const FIXTURES = fileURLToPath(new URL("./__fixtures__/geo", import.meta.url));
const config: GeoConfig = { root: FIXTURES, version: "test", isHttp: false };
const loader = createGeoLoader(config);

describe("geo-data", () => {
  it("lists the published layers for an engine", async () => {
    const r = await listGeoLayers("grants", loader);
    expect(r!.layers).toEqual(["grants_recipient_state"]);
    expect(r!.coverageStatement).toContain("Coverage");
    expect(await listGeoLayers("bogus", loader)).toBeNull();
  });

  it("decodes state cells with semantics + coverage attached", async () => {
    const layer = await getGeoLayer("grants", "grants_recipient_state", loader);
    expect(layer!.geographyField).toBe("recipient_state_code");
    const ut = layer!.states.find((s) => s.stateCode === "UT")!;
    expect(ut.values.obligated_usd).toBe(100.25);
    expect(ut.values.award_count).toBe(7);
  });

  it("withheld small cells carry no numeric entity value", async () => {
    const layer = await getGeoLayer("grants", "grants_recipient_state", loader);
    const as = layer!.states.find((s) => s.stateCode === "AS")!;
    expect(as.withheld).toBe(true);
    expect(as.withheldReason).toContain("fewer than 5");
    expect(as.values.distinct_entities).toBe("fewer_than_5");
    expect(typeof as.values.obligated_usd).toBe("undefined");
  });

  it("no-published-records is a labelled state, not zero", async () => {
    const layer = await getGeoLayer("grants", "grants_recipient_state", loader);
    const wy = layer!.states.find((s) => s.stateCode === "WY")!;
    expect(wy.attribution).toBe("no_published_records");
    expect(wy.values).toEqual({});
  });

  it("county tables decode as name-keyed rows", async () => {
    const c = await getGeoCounties("ut", loader);
    expect(c!.stateName).toBe("Utah");
    expect(c!.layers[0].cells[0].countyName).toBe("SALT LAKE");
    expect(await getGeoCounties("U", loader)).toBeNull();
    expect(await getGeoCounties("ZZ", loader)).toBeNull();
  });
});
