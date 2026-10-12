import { describe, it, expect } from "vitest";
import { matchWakeWord, normalizeTranscript, WAKE_PHRASES } from "./wake";

describe("normalizeTranscript", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTranscript("Hey, WorldEye!")).toBe("hey worldeye");
    expect(normalizeTranscript("  OK   WorldEye... ")).toBe("ok worldeye");
  });

  it("collapses tabs/newlines and mixed separators", () => {
    expect(normalizeTranscript("hey\tworld\neye")).toBe("hey world eye");
    expect(normalizeTranscript("hey-world-eye")).toBe("hey world eye");
  });

  it("keeps digits and words intact", () => {
    expect(normalizeTranscript("channel 9 news")).toBe("channel 9 news");
  });

  it("handles empty input", () => {
    expect(normalizeTranscript("")).toBe("");
    expect(normalizeTranscript("!!!")).toBe("");
  });
});

describe("matchWakeWord", () => {
  it("accepts each documented wake phrase", () => {
    for (const p of WAKE_PHRASES) expect(matchWakeWord(p)).toBe(true);
    expect(matchWakeWord("hey worldeye")).toBe(true);
    expect(matchWakeWord("hey world eye")).toBe(true);
    expect(matchWakeWord("ok worldeye")).toBe(true);
  });

  it("is case- and punctuation-insensitive", () => {
    expect(matchWakeWord("Hey WorldEye")).toBe(true);
    expect(matchWakeWord("HEY WORLDEYE!")).toBe(true);
    expect(matchWakeWord("Ok, WorldEye.")).toBe(true);
    expect(matchWakeWord("hey, world eye?")).toBe(true);
  });

  it("matches the phrase inside a longer utterance", () => {
    expect(matchWakeWord("um hey worldeye show me tokyo")).toBe(true);
    expect(matchWakeWord("please say hey world eye for me")).toBe(true);
  });

  it("rejects near-misses and substrings of larger words", () => {
    expect(matchWakeWord("hey worldeyes")).toBe(false); // trailing 's' — not a whole-word match
    expect(matchWakeWord("hey world")).toBe(false); // deliberately NOT a wake phrase (too collision-prone)
    expect(matchWakeWord("hey eye")).toBe(false);
    expect(matchWakeWord("ok world")).toBe(false);
    expect(matchWakeWord("worldeye")).toBe(false); // no greeting word
    expect(matchWakeWord("hey")).toBe(false);
  });

  it("rejects ordinary speech and empty input", () => {
    expect(matchWakeWord("take me to tokyo")).toBe(false);
    expect(matchWakeWord("the weather in world cities is nice")).toBe(false);
    expect(matchWakeWord("")).toBe(false);
    expect(matchWakeWord("   ")).toBe(false);
    expect(matchWakeWord("?!…")).toBe(false);
  });
});
