// Marketing Studio render pipeline tests: real PNG output, QR decode-back
// validation (the rendered code must scan to the exact referral link),
// field validation, render-hash stability, and XML-escaping safety.
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { renderTemplate, validateValues, computeRenderHash, escapeXml } from "./render";
import { decodeQr } from "./qr";
import type { EditableField, StudioContext, TemplateLayer } from "./types";

const LINK = "https://worldeye.app/ref/testcode1";

const ctx: StudioContext = {
  profileId: "prof_test",
  userId: "user_test",
  code: "testcode1",
  link: LINK,
  couponCode: null,
  displayName: "Test Creator",
  rankKey: "explorer",
  rankName: "Explorer",
  xp: 0,
  commissionPct: 15,
};

const fields: EditableField[] = [
  { key: "headline", label: "Headline", type: "text", maxLen: 60, default: "Watch the world live", required: true },
  { key: "accent", label: "Accent", type: "color", default: "#22d3ee" },
  { key: "showBadge", label: "Show badge", type: "toggle", default: "" },
];

const svgBody = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" fill="#0a1628"/><text x="320" y="110" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="42" fill="#ffffff">{{HEADLINE}}</text><text x="320" y="155" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="20" fill="#94a3b8">{{REF_CODE}} · {{RANK_NAME}}</text><text x="320" y="610" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#64748b">{{DISCLOSURE}}</text></svg>`;

const layers: TemplateLayer[] = [
  { type: "qr", x: 170, y: 210, size: 300, pad: 16, logo: true },
];

function render(values: Record<string, string>) {
  return renderTemplate({
    template: { slug: "test-template", width: 640, height: 640, svgBody, updatedAt: new Date("2026-10-12T00:00:00.000Z") },
    fields,
    layers,
    ctx,
    values,
  });
}

describe("renderTemplate", () => {
  it("produces a real PNG with the template dimensions", async () => {
    const out = await render({ headline: "Watch the world live" });
    expect(out.format).toBe("png");
    // PNG magic bytes
    expect([...out.buffer.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(out.width).toBe(640);
    expect(out.height).toBe(640);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(640);
    expect(meta.height).toBe(640);
    expect(out.renderHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("renders a QR that decodes back to the exact referral link", async () => {
    const out = await render({ headline: "Scan to explore" });
    expect(await decodeQr(out.buffer)).toBe(LINK);
  });
});

describe("validateValues", () => {
  it("rejects unknown keys", () => {
    const r = validateValues(fields, { headline: "Hi", bogus: "x" });
    expect("error" in r).toBe(true);
  });

  it("rejects over-length text", () => {
    const r = validateValues(fields, { headline: "x".repeat(61) });
    expect("error" in r).toBe(true);
  });

  it("rejects a bad color", () => {
    expect("error" in validateValues(fields, { headline: "Hi", accent: "red" })).toBe(true);
    expect("error" in validateValues(fields, { headline: "Hi", accent: "#12345" })).toBe(true);
    const ok = validateValues(fields, { headline: "Hi", accent: "#22D3EE" });
    expect("values" in ok && ok.values.accent).toBe("#22D3EE");
  });

  it("rejects empty required text and non-string text", () => {
    expect("error" in validateValues(fields, { headline: "   " })).toBe(true);
    expect("error" in validateValues(fields, { headline: 42 })).toBe(true);
  });

  it("applies defaults for missing fields", () => {
    const r = validateValues(fields, {});
    expect("values" in r).toBe(true);
    if ("values" in r) {
      expect(r.values.headline).toBe("Watch the world live");
      expect(r.values.accent).toBe("#22d3ee");
    }
  });

  it("normalizes toggles to \"1\" or \"\"", () => {
    const on = validateValues(fields, { headline: "Hi", showBadge: true });
    const onStr = validateValues(fields, { headline: "Hi", showBadge: "on" });
    const off = validateValues(fields, { headline: "Hi", showBadge: false });
    if ("values" in on) expect(on.values.showBadge).toBe("1");
    if ("values" in onStr) expect(onStr.values.showBadge).toBe("1");
    if ("values" in off) expect(off.values.showBadge).toBe("");
    expect("error" in validateValues(fields, { headline: "Hi", showBadge: "maybe" })).toBe(true);
  });

  it("trims text values", () => {
    const r = validateValues(fields, { headline: "  Hello  " });
    if ("values" in r) expect(r.values.headline).toBe("Hello");
  });
});

describe("computeRenderHash", () => {
  it("is stable for identical inputs regardless of key order", () => {
    const a = computeRenderHash("2026-10-12T00:00:00.000Z", { headline: "Hi", accent: "#22d3ee" }, "testcode1");
    const b = computeRenderHash("2026-10-12T00:00:00.000Z", { accent: "#22d3ee", headline: "Hi" }, "testcode1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a value or the code changes", () => {
    const base = computeRenderHash("2026-10-12T00:00:00.000Z", { headline: "Hi" }, "testcode1");
    expect(computeRenderHash("2026-10-12T00:00:00.000Z", { headline: "Bye" }, "testcode1")).not.toBe(base);
    expect(computeRenderHash("2026-10-12T00:00:00.000Z", { headline: "Hi" }, "othercode")).not.toBe(base);
  });
});

describe("XML escaping", () => {
  it("escapes markup characters", () => {
    expect(escapeXml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&apos;");
    expect(escapeXml("plain text")).toBe("plain text");
  });

  it("renders a headline containing markup without throwing or injecting it", async () => {
    const out = await render({ headline: `<script>"&` });
    expect(out.buffer.length).toBeGreaterThan(0);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe("png");
    // The QR still validates inside renderTemplate and decodes cleanly.
    expect(await decodeQr(out.buffer)).toBe(LINK);
  });
});
