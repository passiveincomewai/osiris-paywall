// Design-pass pins for the shared email shell (2026-11): table-based
// layout, standard footer with the CAN-SPAM postal line, the optional
// why-line, and the derived plain-text alternative. If any of these
// regress, every automated email regresses with them.
import { describe, it, expect } from "vitest";
import { shell, htmlToText, verificationEmail } from "./email";

describe("shell (shared branded layout)", () => {
  const html = shell("Hello", "preheader text", "<p>Body copy.</p>", {
    label: "Click me",
    href: "https://worldeye.app/pricing",
  });
  it("is table-based at 600px with explicit dark colours", () => {
    expect(html).toContain('role="presentation"');
    expect(html).toContain('width="600"');
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain("background:#050508");
  });
  it("carries the wordmark and the one button style", () => {
    expect(html).toContain(">World</span>");
    expect(html).toContain("#D4AF37");
    expect(html).toContain("Click me");
  });
  it("always carries the standard footer with the CAN-SPAM postal line", () => {
    expect(html).toContain("WorldEye — see the world live.");
    expect(html).toContain("WorldEye · 555 E 3200 N, North Ogden, UT 84414");
  });
  it("renders the why-line only when the template provides one", () => {
    expect(html).not.toContain("because you have a paid");
    const withWhy = shell("T", "p", "<p>x</p>", null, {
      why: "You're receiving this because you have a paid WorldEye subscription.",
    });
    expect(withWhy).toContain("because you have a paid WorldEye subscription.");
  });
  it("keeps the preheader hidden", () => {
    expect(html).toContain("display:none");
    expect(html).toContain("preheader text");
  });
});

describe("htmlToText", () => {
  it("produces a faithful text alternative: no tags, no preheader, entities decoded", () => {
    const { html } = verificationEmail("Ada & Co", "https://worldeye.app/verify?token=abc");
    const text = htmlToText(html);
    expect(text).not.toContain("<");
    expect(text).not.toContain("One click to activate"); // preheader dropped
    expect(text).toContain("Confirm your email");
    expect(text).toContain("Verify my email");
    expect(text).toContain("https://worldeye.app/verify?token=abc");
    expect(text).toContain("555 E 3200 N, North Ogden, UT 84414");
  });
});
