// Rename pins (scope H2): the annual plan is sold as VIP Pro everywhere
// the plan is NAMED. "Annual" may survive only as cadence ("billed
// annually") — never as a plan name — in the canonical copy, the picker,
// the checkout strip, and the pricing page.
//
// Phase C addendum (Pricing Redesign, 2026-10-30): the pricing PAGE
// moved to the 3-tier grid — the tiers are Lite / Pro / Ultra, annual
// carries the VIP branding on every tier, and the old VIP-only extras
// are Ultra's. The "pricing page source" pins below were updated to
// that naming (ultraHeader, ULTRA EXTRAS heading, 4-column compare
// booleans). The canonical-copy / picker / strip pins are UNCHANGED:
// the shared picker still sells the Pro grid under its historical
// names until the Phase D 9-option rewrite.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TRIAL_PLAN_OPTIONS } from "./trial-checkout";
import TrialPicker from "@/components/TrialPicker";
import { CheckoutPlanStrip } from "@/components/CheckoutPlanStrip";
import { checkoutPlanSummary } from "./trial-checkout";

const normalize = (html: string) => html.replace(/<!-- -->/g, "");

describe("canonical plan copy", () => {
  it("plan names are Weekly / Monthly / VIP Pro — no plan named Annual", () => {
    expect(TRIAL_PLAN_OPTIONS.map((o) => o.name)).toEqual(["Weekly", "Monthly", "VIP Pro"]);
    for (const o of TRIAL_PLAN_OPTIONS) {
      expect(o.name).not.toBe("Annual");
      expect(o.cta).not.toContain("Annual");
      // Cadence is allowed: the annual note says "billed annually".
      if (o.plan === "annual") expect(o.note).toContain("billed annually");
    }
  });
});

describe("picker + strip renders", () => {
  it("the picker names VIP Pro and, when emphasized, marks the VIP pick", () => {
    const html = normalize(
      renderToString(createElement(TrialPicker, { emphasizePlan: "annual" })),
    );
    expect(html).toContain("VIP Pro");
    expect(html).toContain("VIP pick");
    expect(html).not.toContain(">Annual<");
  });

  it("without emphasis there is no VIP pick marker", () => {
    const html = normalize(renderToString(createElement(TrialPicker)));
    expect(html).not.toContain("VIP pick");
  });

  it("the checkout strip renders 'VIP Pro' — never 'VIP Pro Pro' or 'Annual Pro'", () => {
    const html = normalize(
      renderToString(
        createElement(CheckoutPlanStrip, { summary: checkoutPlanSummary("annual")! }),
      ),
    );
    expect(html).toContain("VIP Pro");
    expect(html).not.toContain("VIP Pro Pro");
    expect(html).not.toContain("Annual Pro");
  });
});

describe("pricing page source", () => {
  // Since the multilingual conversion (2026-10-26) the pricing page's
  // copy lives in the English pricing dictionary (src/i18n); the
  // client keeps structure + the comparison checkmarks, in dictionary
  // row order. These pins read both halves.
  const dictionary = readFileSync(
    join(process.cwd(), "src/i18n/dictionaries/en/pricing.ts"),
    "utf8",
  );
  const pricing = readFileSync(
    join(process.cwd(), "src/app/(en)/pricing/PricingClient.tsx"),
    "utf8",
  );

  it("names the annual plan VIP Pro and gives the top tier its extras block", () => {
    expect(dictionary).toContain('name: "VIP Pro"');
    expect(dictionary).toContain("vipFeatures: [");
    expect(pricing).toContain("vipFeatures");
    expect(dictionary).toContain('vipOnlyHeading: "ULTRA EXTRAS"');
    expect(dictionary).not.toContain('name: "Annual"');
  });

  it("the compare table has Lite + Ultra columns and gates intel + timelapse to Ultra", () => {
    expect(dictionary).toContain('liteHeader: "LITE"');
    expect(dictionary).toContain('ultraHeader: "ULTRA"');
    const rowsBlock = dictionary.slice(dictionary.indexOf("rows: ["));
    const rows = [
      ...rowsBlock.slice(0, rowsBlock.indexOf("]")).matchAll(/"([^"]+)"/g),
    ].map((m) => m[1]);
    const booleansBlock = pricing.slice(
      pricing.indexOf("const COMPARE_BOOLEANS"),
    );
    const booleans = [
      ...booleansBlock
        .slice(0, booleansBlock.indexOf("];"))
        .matchAll(/\{ free: (true|false), lite: (true|false), pro: (true|false), ultra: (true|false) \}/g),
    ].map((m) => ({
      free: m[1] === "true",
      lite: m[2] === "true",
      pro: m[3] === "true",
      ultra: m[4] === "true",
    }));
    expect(booleans).toHaveLength(rows.length);
    for (const label of [
      "Premium intel feeds (cyber, GDELT, maritime, live news)",
      "Camera timelapse",
    ]) {
      const i = rows.indexOf(label);
      expect(i, label).toBeGreaterThan(-1);
      expect(booleans[i], label).toEqual({ free: false, lite: false, pro: false, ultra: true });
    }
  });
});
