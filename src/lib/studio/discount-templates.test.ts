// Discount seed templates: render all 6 with a synced affiliate ctx
// templates with a synced affiliate ctx and confirm PNG output + QR
// decode + coupon/pct substitution actually happened.
import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES } from "./templates-seed";
import { renderTemplate } from "./render";
import { decodeQr } from "./qr";
import type { StudioContext } from "./types";

const LINK = "https://worldeye.app/ref/jameson";

const ctx: StudioContext = {
  profileId: "prof_test",
  userId: "user_test",
  code: "jameson",
  link: LINK,
  couponCode: "JAMESON20",
  discountPct: 20,
  displayName: "Jameson",
  rankKey: "commander",
  rankName: "Commander",
  xp: 7500,
  commissionPct: 24,
};

const discountTemplates = SEED_TEMPLATES.filter((t) => t.category === "discount");

describe("discount seed templates", () => {
  it("seeds exactly 6 discount templates", () => {
    expect(discountTemplates).toHaveLength(6);
  });

  for (const t of discountTemplates) {
    it(`renders ${t.slug} with the real code/pct and a valid QR`, async () => {
      const out = await renderTemplate({
        template: { slug: t.slug, width: t.width, height: t.height, svgBody: t.svgBody, updatedAt: new Date("2026-10-12T00:00:00.000Z") },
        fields: t.editableFields,
        layers: t.layers,
        ctx,
        values: {},
      });
      expect(out.format).toBe("png");
      expect(out.width).toBe(t.width);
      expect(out.height).toBe(t.height);
      // The composited QR must decode to the affiliate's referral link.
      expect(await decodeQr(out.buffer)).toBe(LINK);
      // Personalization sanity: rendering the same template WITHOUT a
      // synced code must produce different pixels (coupon pill absent).
      const bare = await renderTemplate({
        template: { slug: t.slug, width: t.width, height: t.height, svgBody: t.svgBody, updatedAt: new Date("2026-10-12T00:00:00.000Z") },
        fields: t.editableFields,
        layers: t.layers,
        ctx: { ...ctx, couponCode: null, discountPct: null },
        values: {},
      });
      expect(bare.buffer.equals(out.buffer)).toBe(false);
    });
  }
});
