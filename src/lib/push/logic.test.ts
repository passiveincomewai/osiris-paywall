import { describe, expect, it } from "vitest";
import {
  buildPushPayload,
  isDeadSubscriptionStatus,
  validateSubscriptionInput,
} from "./logic";

const good = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "B".repeat(88), auth: "a".repeat(22) },
};

describe("validateSubscriptionInput", () => {
  it("accepts a browser-shaped subscription", () => {
    const r = validateSubscriptionInput(good);
    expect(r).toEqual({
      ok: true,
      value: { endpoint: good.endpoint, p256dh: good.keys.p256dh, auth: good.keys.auth },
    });
  });

  it("rejects non-objects and missing keys", () => {
    expect(validateSubscriptionInput(null).ok).toBe(false);
    expect(validateSubscriptionInput("x").ok).toBe(false);
    expect(validateSubscriptionInput({ endpoint: good.endpoint }).ok).toBe(false);
    expect(validateSubscriptionInput({ keys: good.keys }).ok).toBe(false);
  });

  it("rejects non-https and malformed endpoints", () => {
    expect(validateSubscriptionInput({ ...good, endpoint: "http://example.com/x" }).ok).toBe(false);
    expect(validateSubscriptionInput({ ...good, endpoint: "not a url" }).ok).toBe(false);
  });

  it("rejects oversized fields", () => {
    expect(validateSubscriptionInput({ ...good, endpoint: `https://e.com/${"x".repeat(1100)}` }).ok).toBe(false);
    expect(
      validateSubscriptionInput({ ...good, keys: { p256dh: "x".repeat(121), auth: "a" } }).ok,
    ).toBe(false);
    expect(
      validateSubscriptionInput({ ...good, keys: { p256dh: "x", auth: "a".repeat(65) } }).ok,
    ).toBe(false);
  });
});

describe("buildPushPayload", () => {
  it("shapes title/body/url/tag as JSON", () => {
    const parsed = JSON.parse(
      buildPushPayload({ title: "T", body: "B", url: "/settings/alerts", tag: "x" }),
    );
    expect(parsed).toEqual({ title: "T", body: "B", url: "/settings/alerts", tag: "x" });
  });

  it("defaults the url to same-origin root and drops off-origin urls", () => {
    expect(JSON.parse(buildPushPayload({ title: "T", body: "B" })).url).toBe("/");
    expect(
      JSON.parse(buildPushPayload({ title: "T", body: "B", url: "https://evil.example/" })).url,
    ).toBe("/");
  });

  it("truncates very long bodies and defaults an empty title", () => {
    const parsed = JSON.parse(buildPushPayload({ title: "", body: "x".repeat(500) }));
    expect(parsed.title).toBe("WorldEye");
    expect(parsed.body.length).toBe(240);
    expect(parsed.body.endsWith("…")).toBe(true);
  });
});

describe("isDeadSubscriptionStatus", () => {
  it("treats 404 and 410 as dead, everything else as transient", () => {
    expect(isDeadSubscriptionStatus(404)).toBe(true);
    expect(isDeadSubscriptionStatus(410)).toBe(true);
    expect(isDeadSubscriptionStatus(500)).toBe(false);
    expect(isDeadSubscriptionStatus(429)).toBe(false);
    expect(isDeadSubscriptionStatus(undefined)).toBe(false);
  });
});
