// Sizing pins for the header account dropdown (HeaderProfileMenu).
//
// On phones the full menu (profile header, upgrade block, invite
// block, 7 nav links, 4 account controls, footer) is taller than the
// screen. The dropdown used to have no height cap and no internal
// scroll, so it extended past the bottom of the viewport and the
// last items — Manage subscription and Sign out — were cut off and
// unreachable. These pins keep the fix in place:
//  - the panel caps its height to the visible viewport (dvh) with
//    room reserved for the header above and the bottom nav below;
//  - the contents scroll internally (overflow-y-auto) so every item
//    stays reachable at any viewport height;
//  - the width is capped relative to the viewport so the panel can
//    never overflow sideways on a narrow phone;
//  - menu rows tighten on small screens (py-1.5, restored to py-2 at
//    sm:) so the menu fits a typical phone with little scrolling.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const menu = readFileSync(join(process.cwd(), "src/components/HeaderProfileMenu.tsx"), "utf8");

describe("HeaderProfileMenu dropdown sizing", () => {
  it("caps the panel height to the visible viewport (dvh), tighter on mobile", () => {
    expect(menu).toContain("max-h-[calc(100dvh-9rem)]");
    expect(menu).toContain("sm:max-h-[calc(100dvh-5rem)]");
  });

  it("scrolls internally so the bottom items are always reachable", () => {
    expect(menu).toContain("overflow-y-auto");
    expect(menu).toContain("overscroll-contain");
  });

  it("caps the width relative to the viewport so it never overflows sideways", () => {
    expect(menu).toContain("w-[min(18rem,calc(100vw-1rem))]");
    expect(menu).toContain("right-0");
  });

  it("tightens menu rows on small screens and restores desktop spacing at sm:", () => {
    expect(menu).toContain("px-4 py-1.5 sm:py-2 text-sm");
    expect(menu).not.toContain("px-4 py-2 text-sm");
  });

  it("still ends with Manage subscription and Sign out (contents unchanged)", () => {
    // lastIndexOf: the rendered labels are the final mentions of each
    // string in the file (the explanatory comment near the top of the
    // dropdown names both items too).
    const sub = menu.lastIndexOf("Manage subscription");
    const out = menu.lastIndexOf("Sign out");
    expect(sub).toBeGreaterThan(-1);
    expect(out).toBeGreaterThan(sub);
  });
});
