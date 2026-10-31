/**
 * SDK cleanup pins (map bundle item 7, 2026-10-31).
 *
 * The globe's SDK link layers for the AIR and INTEL domains were
 * dead surfaces: the sdk-links source only ever carries SEA
 * features (submarine cables), so their domain filters could never
 * match, and the panel never exposed toggles for them. They were
 * removed; sdk-sea is the whole SDK layer. These source-text pins
 * (the cluster-anchor-lint pattern) keep them from creeping back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { KNOWN_LAYERS } from "@/lib/vip/layers";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const osirisMap = read("src/components/OsirisMap.tsx");
const dashboard = read("src/components/Dashboard.tsx");

describe("SDK cleanup — AIR/INTEL surfaces removed, sdk-sea kept", () => {
  it("OsirisMap defines no AIR or INTEL sdk link layers", () => {
    expect(osirisMap).not.toContain("sdk-air");
    expect(osirisMap).not.toContain("sdk-intel");
    expect(osirisMap).not.toContain("'AIR'");
    expect(osirisMap).not.toContain("'INTEL'");
  });

  it("OsirisMap keeps the sdk-sea layer on the SEA domain", () => {
    expect(osirisMap).toContain("id: 'sdk-sea'");
    expect(osirisMap).toContain("['==',['get','domain'],'SEA']");
  });

  it("Dashboard carries no sdk_air / sdk_naval layer state", () => {
    expect(dashboard).not.toContain("sdk_air");
    expect(dashboard).not.toContain("sdk_naval");
    expect(dashboard).toContain("sdk_sea: true");
  });

  it("the saved-view layer catalogue keeps Sea (SDK) only", () => {
    expect(KNOWN_LAYERS.sdk_sea).toBe("Sea (SDK)");
    expect(KNOWN_LAYERS).not.toHaveProperty("sdk_air");
    expect(KNOWN_LAYERS).not.toHaveProperty("sdk_naval");
  });
});
