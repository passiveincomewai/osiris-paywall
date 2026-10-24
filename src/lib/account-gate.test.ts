import { describe, expect, it } from "vitest";
import {
  GATE_ACCOUNT_BENEFIT,
  gateAuthHref,
  gateBody,
  gateTitle,
  identityIsGated,
} from "./account-gate";

describe("account gate copy", () => {
  it("titles name the gated action", () => {
    expect(gateTitle("save-camera")).toBe("Create a free account to save cameras to My Cameras");
    expect(gateTitle("map-theme")).toContain("exclusive map themes");
  });

  it("body always carries the +10 opens ladder benefit", () => {
    expect(gateBody("spotlight-view")).toContain(GATE_ACCOUNT_BENEFIT);
    expect(GATE_ACCOUNT_BENEFIT).toContain("10 more camera opens");
  });
});

describe("gateAuthHref", () => {
  it("carries a same-origin callback", () => {
    expect(gateAuthHref("signup", "/?camera=abc")).toBe(
      "/signup?callbackUrl=%2F%3Fcamera%3Dabc",
    );
    expect(gateAuthHref("signin", "/pricing")).toBe("/signin?callbackUrl=%2Fpricing");
  });

  it("falls back to the globe root for unusable callbacks", () => {
    expect(gateAuthHref("signup", "https://evil.example")).toBe("/signup?callbackUrl=%2F");
    expect(gateAuthHref("signup", null)).toBe("/signup?callbackUrl=%2F");
    expect(gateAuthHref("signup", undefined)).toBe("/signup?callbackUrl=%2F");
  });
});

describe("identityIsGated", () => {
  it("gates only the definitively anonymous", () => {
    expect(identityIsGated("anonymous")).toBe(true);
    expect(identityIsGated("free")).toBe(false);
    expect(identityIsGated("premium")).toBe(false);
    expect(identityIsGated("unknown")).toBe(false);
  });
});
