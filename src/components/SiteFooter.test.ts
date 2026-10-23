// Pins for the footer's auth CTAs (Sign in / Sign up).
//
// Signed-in users kept seeing Sign in / Sign up buttons in the footer
// brand row — pointless chrome that also suggested the sign-in hadn't
// stuck. The buttons now live in FooterAuthButtons, which gates them
// on the same session-identity read the header's account slot uses
// (lib/premium-entitlement's readSessionIdentity): signed-in (free or
// premium) renders nothing; signed-out renders the buttons exactly as
// before. These pins keep SiteFooter from growing the unconditional
// buttons back and keep the gate wired to the shared identity read.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const footer = readFileSync(join(process.cwd(), "src/components/SiteFooter.tsx"), "utf8");
const buttons = readFileSync(join(process.cwd(), "src/components/FooterAuthButtons.tsx"), "utf8");

describe("SiteFooter auth CTAs", () => {
  it("delegates the auth buttons to the session-gated component", () => {
    expect(footer).toContain("<FooterAuthButtons />");
  });

  it("never renders Sign in / Sign up unconditionally", () => {
    expect(footer).not.toContain('href="/signin"');
    expect(footer).not.toContain('href="/signup"');
  });

  it("gates on the header's session-identity read", () => {
    expect(buttons).toContain('"use client"');
    expect(buttons).toContain("readSessionIdentity");
    expect(buttons).toContain("@/lib/premium-entitlement");
  });

  it("renders nothing for signed-in users of any plan", () => {
    expect(buttons).toContain('state === "free" || state === "premium"');
    expect(buttons).toContain("return null");
  });

  it("keeps the exact Sign in / Sign up buttons for signed-out visitors", () => {
    expect(buttons).toContain('href="/signin"');
    expect(buttons).toContain('href="/signup"');
    expect(buttons).toContain("Sign in");
    expect(buttons).toContain("Sign up");
  });
});
