// Unsubscribe token tests: the HMAC link in every marketing footer is
// the only credential on the unsubscribe route, so it must verify for
// exactly the user it was minted for — and nothing else.
import { describe, it, expect } from "vitest";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
} from "./unsubscribe";

const SECRET = "test-secret-value";

describe("unsubscribe tokens", () => {
  it("round-trips: a minted token verifies for its user", () => {
    const token = signUnsubscribeToken("user_123", SECRET);
    expect(verifyUnsubscribeToken("user_123", token, SECRET)).toBe(true);
  });

  it("rejects a token minted for a different user", () => {
    const token = signUnsubscribeToken("user_123", SECRET);
    expect(verifyUnsubscribeToken("user_999", token, SECRET)).toBe(false);
  });

  it("rejects tampered tokens, wrong secrets, and missing values", () => {
    const token = signUnsubscribeToken("user_123", SECRET);
    const tampered = (token.startsWith("A") ? "B" : "A") + token.slice(1);
    expect(verifyUnsubscribeToken("user_123", tampered, SECRET)).toBe(false);
    expect(verifyUnsubscribeToken("user_123", token, "another-secret")).toBe(false);
    expect(verifyUnsubscribeToken("user_123", null, SECRET)).toBe(false);
    expect(verifyUnsubscribeToken("user_123", "", SECRET)).toBe(false);
  });

  it("no secret configured → nothing verifies and no URL is built", () => {
    const token = signUnsubscribeToken("user_123", SECRET);
    expect(verifyUnsubscribeToken("user_123", token, null)).toBe(false);
    expect(buildUnsubscribeUrl("https://worldeye.app", "user_123", null)).toBeNull();
  });

  it("builds the route URL with the token embedded", () => {
    const url = buildUnsubscribeUrl("https://worldeye.app", "user_123", SECRET);
    expect(url).toMatch(/^https:\/\/worldeye\.app\/api\/email\/unsubscribe\?u=user_123&t=.+/);
  });
});
