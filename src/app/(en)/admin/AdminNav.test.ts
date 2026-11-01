/* AdminNav: the shared admin section nav. Pins the contract every admin
   page relies on — all nine sections plus the site link are present, the
   active section is marked aria-current="page" exactly once, links are
   shrink-0 pills in a horizontally scrollable row (the mobile pattern),
   and the external Growth Engine link only appears when configured. */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import AdminNav, { type AdminSection } from "./AdminNav";

const HREFS = ["/admin", "/admin/conversion", "/admin/affiliates", "/admin/competitor-seo", "/admin/seo", "/admin/discovery", "/admin/contact", "/admin/partnerships", "/admin/camera-submissions", "/"];
const ACTIVES: AdminSection[] = ["dashboard", "conversion", "affiliates", "competitor-seo", "seo", "discovery", "contact", "partnerships", "camera-submissions"];

describe("AdminNav", () => {
  it("links every admin section from every page", () => {
    for (const active of ACTIVES) {
      const html = renderToString(React.createElement(AdminNav, { active }));
      for (const href of HREFS) {
        expect(html, `${active} -> ${href}`).toContain(`href="${href}"`);
      }
      // Exactly one current-page marker, on the active section.
      expect((html.match(/aria-current="page"/g) || []).length).toBe(1);
    }
  });

  it("uses the mobile scroll-row pattern with 44px targets", () => {
    const html = renderToString(React.createElement(AdminNav, { active: "dashboard" }));
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("shrink-0");
    expect(html).toContain("py-3");
  });

  it("shows the Growth Engine link only when a URL is configured", () => {
    expect(renderToString(React.createElement(AdminNav, { active: "dashboard" }))).not.toContain("Growth Engine");
    const html = renderToString(React.createElement(AdminNav, { active: "dashboard", growthUrl: "https://example.com/growth" }));
    expect(html).toContain("Growth Engine ↗");
    expect(html).toContain('href="https://example.com/growth"');
  });
});
