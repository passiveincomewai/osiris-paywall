// Digest issue-key tests: the (email, issueKey) pair is the digest's
// never-double-send guarantee, so the key must be stable across the
// whole week, roll exactly at the ISO week boundary, and handle the
// year crossover the way ISO 8601 says (late-December days can belong
// to week 1 of the next year, and early-January days to week 52/53 of
// the previous one).
import { describe, it, expect } from "vitest";
import { digestIssueKey } from "./digest";

describe("digestIssueKey", () => {
  it("is stable across a whole week (Mon Oct 19 – Sun Oct 25 2026 → W43)", () => {
    for (const day of [19, 20, 21, 22, 23, 24, 25]) {
      expect(digestIssueKey(new Date(Date.UTC(2026, 9, day, 12)))).toBe("2026-W43");
    }
  });

  it("rolls to the next week on Monday", () => {
    expect(digestIssueKey(new Date(Date.UTC(2026, 9, 26, 0, 0)))).toBe("2026-W44");
  });

  it("handles the ISO year crossover (Mon Dec 28 2026 is 2026-W53; Mon Jan 4 2027 is 2027-W01)", () => {
    expect(digestIssueKey(new Date(Date.UTC(2026, 11, 28, 12)))).toBe("2026-W53");
    expect(digestIssueKey(new Date(Date.UTC(2027, 0, 4, 12)))).toBe("2027-W01");
  });

  it("pads single-digit weeks", () => {
    expect(digestIssueKey(new Date(Date.UTC(2026, 0, 12, 12)))).toBe("2026-W03");
  });
});
