/**
 * Pins the single authoritative PWA manifest (src/app/manifest.ts, F17):
 * identity fields, standalone display, dark theme colors, and — the part
 * that silently breaks installs — every referenced icon must exist in
 * public/ with EXACTLY the declared pixel dimensions (read from the PNG
 * IHDR header, not trusted from the filename).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

function pngDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  // PNG signature (8 bytes) + IHDR length (4) + "IHDR" (4), then
  // width/height as big-endian uint32 at offsets 16 and 20.
  expect(buffer.subarray(0, 4).toString("hex")).toBe("89504e47");
  expect(buffer.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("PWA manifest", () => {
  const value = manifest();

  it("carries the WorldEye identity and standalone display", () => {
    expect(value.name).toBe("WorldEye — Live 3D Globe");
    expect(value.short_name).toBe("WorldEye");
    expect(value.start_url).toBe("/");
    expect(value.scope).toBe("/");
    expect(value.display).toBe("standalone");
    expect(value.description).toContain("74,229");
  });

  it("uses the site's dark theme colors", () => {
    expect(value.theme_color).toBe("#06060C");
    expect(value.background_color).toBe("#06060C");
  });

  it("references only icons that exist at their declared size", () => {
    expect(value.icons?.length).toBeGreaterThanOrEqual(3);
    for (const icon of value.icons ?? []) {
      expect(icon.type).toBe("image/png");
      const [declaredWidth, declaredHeight] = (icon.sizes ?? "")
        .split("x")
        .map(Number);
      const actual = pngDimensions(
        join(process.cwd(), "public", icon.src.replace(/^\//, "")),
      );
      expect(actual).toEqual({ width: declaredWidth, height: declaredHeight });
    }
  });

  it("has a 192, a 512, and a maskable icon", () => {
    const icons = value.icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(
      icons.some((icon) => (icon.purpose ?? "").includes("maskable")),
    ).toBe(true);
  });

  it("has a valid apple touch icon at 180x180", () => {
    const actual = pngDimensions(
      join(process.cwd(), "public", "apple-touch-icon.png"),
    );
    expect(actual).toEqual({ width: 180, height: 180 });
  });
});
