import { describe, it, expect, beforeAll } from "vitest";
import {
  decryptStreamKey,
  encryptStreamKey,
  hashRelayToken,
  newRelayToken,
  relayTokenMatches,
} from "./stream-key-crypto";

beforeAll(() => {
  process.env.AMBIENT_KEY_SECRET = "test-secret-for-ambient-stream-keys";
});

describe("stream key encryption", () => {
  it("round-trips a YouTube stream key", () => {
    const key = "abcd-1234-wxyz-9876-example";
    const stored = encryptStreamKey(key);
    expect(stored).not.toContain(key);
    expect(decryptStreamKey(stored)).toBe(key);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptStreamKey("same-key-value")).not.toBe(encryptStreamKey("same-key-value"));
  });

  it("rejects tampered ciphertext", () => {
    const stored = encryptStreamKey("abcd-1234-wxyz-9876");
    const parts = stored.split(".");
    const tampered = [parts[0], parts[1], Buffer.from("forged").toString("base64")].join(".");
    expect(() => decryptStreamKey(tampered)).toThrow();
  });
});

describe("relay tokens", () => {
  it("matches only the token that produced the hash", () => {
    const token = newRelayToken();
    const hash = hashRelayToken(token);
    expect(relayTokenMatches(token, hash)).toBe(true);
    expect(relayTokenMatches(newRelayToken(), hash)).toBe(false);
    expect(relayTokenMatches("not-a-token", hash)).toBe(false);
  });
});
