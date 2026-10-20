// Rename pins (scope H2): the annual plan is sold as VIP Pro everywhere
// the plan is NAMED. "Annual" may survive only as cadence ("billed
// annually") — never as a plan name — in the canonical copy, the picker,
// the checkout strip, and the pricing page.
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
        createElement(CheckoutPlanStrip, { summary: checkoutPlanSummary("annual") }),
      ),
    );
    expect(html).toContain("VIP Pro");
    expect(html).not.toContain("VIP Pro Pro");
    expect(html).not.toContain("Annual Pro");
  });
});

describe("pricing page source", () => {
  const pricing = readFileSync(
    join(process.cwd(), "src/app/pricing/PricingClient.tsx"),
    "utf8",
  );

  it("names the annual plan VIP Pro and gives it a VIP-only feature block", () => {
    expect(pricing).toContain('name: "VIP Pro"');
    expect(pricing).toContain("VIP_FEATURES");
    expect(pricing).toContain("VIP PRO ONLY");
    expect(pricing).not.toContain('name: "Annual"');
  });

  it("the compare table has a VIP column and gates intel + timelapse to it", () => {
    expect(pricing).toContain("VIP PRO");
    expect(pricing).toContain(
      '{ feature: "Premium intel feeds (cyber, GDELT, maritime, live news)", free: false, pro: false, vip: true }',
    );
    expect(pricing).toContain(
      '{ feature: "Camera timelapse", free: false, pro: false, vip: true }',
    );
  });
});
