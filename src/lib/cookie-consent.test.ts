import { describe, it, expect } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  clarityConsentV2Args,
  parseConsentCookie,
  serializeConsentClear,
  serializeConsentCookie,
} from "./cookie-consent";

describe("parseConsentCookie", () => {
  it("reads an accepted choice among other cookies", () => {
    expect(
      parseConsentCookie("we_vid=abc123; we_cookie_consent=accepted; theme=dark")
    ).toBe("accepted");
  });

  it("reads a declined choice", () => {
    expect(parseConsentCookie("we_cookie_consent=declined")).toBe("declined");
  });

  it("returns null when the cookie is absent", () => {
    expect(parseConsentCookie("we_vid=abc123; theme=dark")).toBeNull();
    expect(parseConsentCookie("")).toBeNull();
  });

  it("returns null for an unrecognised value", () => {
    expect(parseConsentCookie("we_cookie_consent=yes")).toBeNull();
    expect(parseConsentCookie("we_cookie_consent=")).toBeNull();
  });

  it("ignores similarly named cookies", () => {
    expect(parseConsentCookie("we_cookie_consent_extra=accepted")).toBeNull();
    expect(parseConsentCookie("xwe_cookie_consent=accepted")).toBeNull();
  });
});

describe("serializeConsentCookie", () => {
  it("stores the choice for 12 months at the root path", () => {
    expect(CONSENT_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 365);
    expect(serializeConsentCookie("accepted")).toBe(
      `${CONSENT_COOKIE_NAME}=accepted; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
    );
    expect(serializeConsentCookie("declined")).toBe(
      `${CONSENT_COOKIE_NAME}=declined; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
    );
  });

  it("clearing expires the cookie immediately", () => {
    expect(serializeConsentClear()).toBe(
      `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
    );
  });
});

describe("clarityConsentV2Args", () => {
  it("grants both storages only on accepted", () => {
    expect(clarityConsentV2Args("accepted")).toEqual({
      ad_Storage: "granted",
      analytics_Storage: "granted",
    });
  });

  it("denies both on declined — and while no choice is stored", () => {
    const denied = { ad_Storage: "denied", analytics_Storage: "denied" };
    expect(clarityConsentV2Args("declined")).toEqual(denied);
    expect(clarityConsentV2Args(null)).toEqual(denied);
  });
});
