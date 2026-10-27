// World Remote → Recon merge pins (owner ask, 2026-10-26): the REMOTE
// bottom-nav tab and the desktop rail popover are gone; the Marauder BLE
// engine lives on as a Recon tool in the Geoint group, placing captured
// devices on the globe through the same scan-target path as before.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import OsintPanel from "./OsintPanel";

const src = (rel: string) => readFileSync(join(process.cwd(), "src", rel), "utf8");

describe("World Remote lives inside Recon", () => {
  it("the board renders a World Remote tile in the Geoint group, beside IP Sweep", () => {
    const html = renderToString(createElement(OsintPanel, {}));
    const geoint = html.indexOf("Geoint &amp; Location Analysis");
    expect(geoint).toBeGreaterThan(-1);
    // Both Geoint sweep tools render as tiles under that heading.
    const sweepTile = html.indexOf("Sweep", geoint);
    const remoteTile = html.search(/World\s+Remote/);
    expect(sweepTile).toBeGreaterThan(geoint);
    expect(remoteTile).toBeGreaterThan(geoint);
  });

  it("OsintPanel files the tool under 'geoint' and renders the engine on its tab", () => {
    const panel = src("components/OsintPanel.tsx");
    expect(panel).toContain("id: 'remote', label: 'WORLD REMOTE'");
    expect(panel).toContain("group: 'geoint', tile: 'World\\nRemote'");
    // Self-contained tool render (fingerprint/donbot pattern), fed by the
    // panel's place-on-map prop — never a parallel flow.
    expect(panel).toContain(
      "activeTab === 'remote' && <WorldRemote onPlaceOnMap={onPlaceDevicesOnMap} />",
    );
    // The shared scan bar stays out of its way.
    expect(panel).toContain("activeTab !== 'donbot' && activeTab !== 'remote'");
  });

  it("the panel's props carry the place-on-map plumbing, mirroring onSweepVisualize", () => {
    const panel = src("components/OsintPanel.tsx");
    expect(panel).toContain("onPlaceDevicesOnMap?: (devs:");
  });
});

describe("the standalone Remote entries are gone from page.tsx", () => {
  const page = src("components/Dashboard.tsx");

  it("the mobile bottom nav has five tabs and no REMOTE", () => {
    const navStart = page.indexOf("{ id: 'layers' as const");
    const navEnd = page.indexOf("].map(tab =>", navStart);
    expect(navStart).toBeGreaterThan(-1);
    expect(navEnd).toBeGreaterThan(navStart);
    const nav = page.slice(navStart, navEnd);
    // Five after two owner merges landed together (2026-10-26): SEARCH
    // and ROUTE became one SEARCH & ROUTE tab, and REMOTE left the bar
    // for the Recon panel — 7 tabs became 5.
    expect(nav.match(/\{ id: '/g)).toHaveLength(5);
    expect(nav).not.toContain("remote");
    expect(nav).not.toContain("REMOTE");
    // The remaining tabs' identities: the merged SEARCH & ROUTE tab and
    // OI keep their labels; there is no standalone ROUTE tab anymore.
    expect(nav).toContain("{ id: 'search' as const, icon: Search, label: 'SEARCH & ROUTE' }");
    expect(nav).not.toContain("{ id: 'route' as const");
    expect(nav).toContain("{ id: 'oi' as const, icon: Orbit, label: 'OI' }");
  });

  it("no 'remote' mobile panel state, mount or drawer title remains", () => {
    expect(page).not.toContain("mobilePanel === 'remote'");
    expect(page).not.toContain("'recon'|'remote'|'oi'");
    expect(page).not.toContain("WORLD REMOTE");
  });

  it("no desktop rail popover state or mount remains", () => {
    expect(page).not.toContain("showRemote");
    expect(page).not.toContain("import('@/components/WorldRemote')");
  });

  it("both OsintPanel mounts receive the place-on-map handler", () => {
    expect(page.match(/onPlaceDevicesOnMap=\{handlePlaceDevicesOnMap\}/g)).toHaveLength(2);
    // The handler is the old inline body, named: BLE scan targets,
    // deduped, capped at 20, fly to the first device.
    expect(page).toContain("const handlePlaceDevicesOnMap = (devs:");
    expect(page).toContain("source: 'BLE'");
    expect(page).toContain("return next.slice(0, 20);");
  });
});
