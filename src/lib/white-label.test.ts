import { describe, it, expect } from "vitest";
import {
  parseWhiteLabelDemoSubmission,
  composeWhiteLabelDemoMessage,
  whiteLabelTopicIsRegistered,
  WHITE_LABEL_DEMO_TOPIC,
} from "./white-label";
import { CONTACT_MESSAGE_MAX } from "@/lib/contact";

const GOOD = {
  name: "Jane Smith",
  email: "Jane@SkiExample.com",
  company: "Example Resorts Group",
  website: "https://example-resorts.com",
  orgType: "ski-resort",
  scale: "regional",
  message: "We want our slope and village cameras on our own site, under our brand.",
};

describe("parseWhiteLabelDemoSubmission", () => {
  it("accepts a complete submission and normalizes the email", () => {
    const r = parseWhiteLabelDemoSubmission(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe("jane@skiexample.com");
      expect(r.data.orgType).toBe("ski-resort");
      expect(r.data.scale).toBe("regional");
    }
  });

  it("allows a blank website", () => {
    const r = parseWhiteLabelDemoSubmission({ ...GOOD, website: "" });
    expect(r.ok).toBe(true);
  });

  it("rejects a malformed website", () => {
    const r = parseWhiteLabelDemoSubmission({ ...GOOD, website: "not a url" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing name, company, bad org type, bad scale, short message", () => {
    for (const bad of [
      { ...GOOD, name: " " },
      { ...GOOD, company: "" },
      { ...GOOD, email: "not-an-email" },
      { ...GOOD, orgType: "partner" },
      { ...GOOD, scale: "huge" },
      { ...GOOD, message: "short" },
    ]) {
      expect(parseWhiteLabelDemoSubmission(bad).ok).toBe(false);
    }
  });

  it("rejects a null body", () => {
    expect(parseWhiteLabelDemoSubmission(null).ok).toBe(false);
  });
});

describe("composeWhiteLabelDemoMessage", () => {
  it("carries every field as labelled lines and fits the contact cap", () => {
    const r = parseWhiteLabelDemoSubmission(GOOD);
    if (!r.ok) throw new Error("fixture should parse");
    const msg = composeWhiteLabelDemoMessage(r.data);
    expect(msg).toContain("Company: Example Resorts Group");
    expect(msg).toContain("Organisation type: Ski resort");
    expect(msg).toContain("Expected scale: A region or network (10+)");
    expect(msg).toContain("Website: https://example-resorts.com");
    expect(msg).toContain(GOOD.message);
    expect(msg.length).toBeLessThanOrEqual(CONTACT_MESSAGE_MAX);
  });

  it("omits the website line when blank", () => {
    const r = parseWhiteLabelDemoSubmission({ ...GOOD, website: "" });
    if (!r.ok) throw new Error("fixture should parse");
    expect(composeWhiteLabelDemoMessage(r.data)).not.toContain("Website:");
  });

  it("carries the generator's qualification fields and preview link", () => {
    const r = parseWhiteLabelDemoSubmission({
      ...GOOD,
      locations: "Park City and Deer Valley",
      cameraInterests: "Slopes and village streets, about a dozen cameras",
      previewPath: "/white-label/demo/abc234def567ghjk",
    });
    if (!r.ok) throw new Error("fixture should parse");
    const msg = composeWhiteLabelDemoMessage(r.data);
    expect(msg).toContain("via the demo generator");
    expect(msg).toContain("Locations of interest: Park City and Deer Valley");
    expect(msg).toContain("Camera interests: Slopes and village streets");
    expect(msg).toContain(
      "Their illustrative preview: https://worldeye.app/white-label/demo/abc234def567ghjk",
    );
    expect(msg.length).toBeLessThanOrEqual(CONTACT_MESSAGE_MAX);
  });

  it("drops a preview path that is not a same-site demo path", () => {
    const r = parseWhiteLabelDemoSubmission({
      ...GOOD,
      previewPath: "https://evil.example.com/phish",
    });
    if (!r.ok) throw new Error("fixture should parse");
    expect(r.data.previewPath).toBe("");
    expect(composeWhiteLabelDemoMessage(r.data)).not.toContain("evil.example");
  });
});

describe("topic registration", () => {
  it("the demo topic is a registered contact topic", () => {
    expect(WHITE_LABEL_DEMO_TOPIC).toBe("white-label-demo");
    expect(whiteLabelTopicIsRegistered()).toBe(true);
  });
});
