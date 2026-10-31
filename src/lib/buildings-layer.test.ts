/**
 * 3D buildings layer pins (map bundle item 5, 2026-10-31).
 *
 * The globe's basemap style is CARTO's Protomaps-based Dark Matter
 * build: its only vector source is `protomaps` (carto.streets v2
 * tiles) and buildings live in the `buildings` source-layer with
 * Protomaps-schema `height` / `min_height` properties — verified by
 * decoding a live z15 Manhattan tile (2,501 building features).
 * The layer previously named the OpenMapTiles pairing (source
 * `carto`, layer `building`, `render_height` / `render_min_height`),
 * none of which exists in the loaded style, so the extrusion could
 * never resolve. These pins read the OsirisMap source (the
 * cluster-anchor-lint pattern) so the pairing cannot silently rot
 * back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(
  join(process.cwd(), "src/components/OsirisMap.tsx"),
  "utf8",
);

function buildingsBlock(): string {
  const start = src.indexOf("osiris-3d-buildings");
  expect(start).toBeGreaterThan(-1);
  // The addLayer call for the extrusion: from its id to the end of
  // the paint object (the first `});` after the opacity entry).
  const end = src.indexOf("fill-extrusion-opacity", start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, src.indexOf("});", end));
}

describe("3D buildings layer — Protomaps pairing", () => {
  it("draws from the style's protomaps source, buildings layer", () => {
    const block = buildingsBlock();
    expect(block).toContain("source: 'protomaps'");
    expect(block).toContain("'source-layer': 'buildings'");
  });

  it("never names the retired OpenMapTiles pairing", () => {
    const block = buildingsBlock();
    expect(block).not.toContain("source: 'carto'");
    expect(block).not.toContain("'source-layer': 'building',");
    expect(block).not.toContain("render_height");
    expect(block).not.toContain("render_min_height");
  });

  it("extrudes from the Protomaps height properties, with fallbacks", () => {
    const block = buildingsBlock();
    expect(block).toContain("['coalesce', ['get', 'height'], 12]");
    expect(block).toContain("['coalesce', ['get', 'min_height'], 0]");
  });

  it("keeps at most one zoom expression per paint property", () => {
    const block = buildingsBlock();
    // Each paint property is a single-quoted key at line start in the
    // block; count ['zoom'] uses per property segment.
    const props = block.split(/'fill-extrusion-[a-z]+':/).slice(1);
    expect(props.length).toBe(4);
    for (const p of props) {
      const zooms = p.match(/\['zoom'\]/g) ?? [];
      expect(zooms.length).toBeLessThanOrEqual(1);
    }
  });
});
