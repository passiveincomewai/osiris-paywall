// Guard tests: the compliance gate every lifecycle send passes through.
// The properties that matter — owner/test inboxes are unreachable,
// opt-outs are absolute for marketing, the 48h cap is real, and
// transactional account mail is exempt from marketing rules but never
// from the exclusion list or the once-only rule.
import { describe, it, expect } from "vitest";
import { evaluateGuards, type GuardInput } from "./guards";

const base: GuardInput = {
  email: "someone@example.com",
  kind: "marketing",
  emailOptOut: false,
  alreadySent: false,
  marketingSendsInWindow: 0,
};

/** The block reason for an input, or null when the send is allowed. */
const reasonOf = (input: GuardInput) => {
  const r = evaluateGuards(input);
  return r.allow ? null : r.reason;
};

describe("evaluateGuards", () => {
  it("allows a clean marketing send", () => {
    expect(evaluateGuards(base).allow).toBe(true);
  });

  it("blocks every owner/test inbox, for marketing AND transactional mail", () => {
    for (const email of [
      "jamesonlythgoe@gmail.com",
      "passiveincomewai@gmail.com",
      "xfueltests@gmail.com",
      "xfuelmarketing@gmail.com",
      "theboodirectory@gmail.com",
      "  PassiveIncomeWai@Gmail.com ", // case/space-insensitive
    ]) {
      expect(reasonOf({ ...base, email })).toBe("excluded_recipient");
      expect(reasonOf({ ...base, email, kind: "transactional" })).toBe("excluded_recipient");
    }
  });

  it("blocks a missing address", () => {
    expect(reasonOf({ ...base, email: null })).toBe("no_email");
    expect(reasonOf({ ...base, email: "  " })).toBe("no_email");
  });

  it("enforces the once-only rule for both kinds", () => {
    expect(reasonOf({ ...base, alreadySent: true })).toBe("already_sent");
    expect(reasonOf({ ...base, kind: "transactional", alreadySent: true })).toBe("already_sent");
  });

  it("opt-out is absolute for marketing, ignored for transactional", () => {
    expect(reasonOf({ ...base, emailOptOut: true })).toBe("opted_out");
    expect(evaluateGuards({ ...base, kind: "transactional", emailOptOut: true }).allow).toBe(true);
  });

  it("caps marketing at one send per 48h window; transactional is exempt", () => {
    expect(reasonOf({ ...base, marketingSendsInWindow: 1 })).toBe("marketing_cap");
    expect(reasonOf({ ...base, marketingSendsInWindow: 5 })).toBe("marketing_cap");
    expect(
      evaluateGuards({ ...base, kind: "transactional", marketingSendsInWindow: 5 }).allow,
    ).toBe(true);
  });

  it("exclusion beats every other rule (checked first)", () => {
    expect(
      reasonOf({
        ...base,
        email: "jamesonlythgoe@gmail.com",
        alreadySent: true,
        emailOptOut: true,
        marketingSendsInWindow: 9,
      }),
    ).toBe("excluded_recipient");
  });
});
