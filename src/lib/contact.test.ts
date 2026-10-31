// Contact-form validation pins: the public form, the POST route and the
// admin inbox share parseContactSubmission — these tests keep its rules
// (required name, real email, known topic, minimum message length) fixed.
import { describe, it, expect } from "vitest";
import {
  parseContactSubmission, CONTACT_TOPICS, CONTACT_MESSAGE_MIN, contactTopicLabel,
} from "./contact";

const GOOD = {
  name: "Jane Smith",
  email: "Jane@Example.com",
  topic: "billing",
  message: "I was charged twice for my monthly plan, please help.",
};

describe("parseContactSubmission", () => {
  it("accepts a valid submission and normalizes the email", () => {
    const r = parseContactSubmission(GOOD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual({
        name: "Jane Smith",
        email: "jane@example.com",
        topic: "billing",
        message: GOOD.message,
      });
    }
  });

  it("defaults the topic to general when none is given", () => {
    const { topic: _t, ...rest } = GOOD;
    const r = parseContactSubmission(rest);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.topic).toBe("general");
  });

  it("rejects a missing name, a bad email, an unknown topic and a too-short message", () => {
    expect(parseContactSubmission({ ...GOOD, name: "  " }).ok).toBe(false);
    expect(parseContactSubmission({ ...GOOD, email: "not-an-email" }).ok).toBe(false);
    expect(parseContactSubmission({ ...GOOD, topic: "spam-me" }).ok).toBe(false);
    expect(parseContactSubmission({ ...GOOD, message: "hi" }).ok).toBe(false);
    expect(parseContactSubmission(null).ok).toBe(false);
    expect(parseContactSubmission(undefined).ok).toBe(false);
  });

  it(`accepts a message of exactly ${CONTACT_MESSAGE_MIN} characters`, () => {
    const r = parseContactSubmission({ ...GOOD, message: "x".repeat(CONTACT_MESSAGE_MIN) });
    expect(r.ok).toBe(true);
  });

  it("every topic the form can send is accepted", () => {
    for (const t of CONTACT_TOPICS) {
      expect(parseContactSubmission({ ...GOOD, topic: t.value }).ok).toBe(true);
    }
  });

  it("offers the enterprise, research and affiliate topics (R28)", () => {
    expect(CONTACT_TOPICS).toHaveLength(11);
    for (const [value, label] of [
      ["enterprise", "Enterprise"],
      ["research", "Research access"],
      ["affiliate", "Affiliate programme"],
    ] as const) {
      expect(CONTACT_TOPICS).toContainEqual({ value, label });
      expect(contactTopicLabel(value)).toBe(label);
      expect(parseContactSubmission({ ...GOOD, topic: value }).ok).toBe(true);
    }
  });
});
