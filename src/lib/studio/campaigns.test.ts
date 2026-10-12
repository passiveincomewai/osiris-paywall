// Studio campaigns unit tests: the pure helpers only — campaign keys,
// tracked-link shape, and the completion gate matrix (incl. replay, bad
// URL, draft). DB-backed paths (atomic claim, XP/credit grants) are
// exercised against staging; these tests pin the rules that guard the
// exactly-once rewards.
import { describe, it, expect } from "vitest";
import {
  campaignKeyFor,
  campaignTrackedLink,
  evaluateCompletion,
  type CompletionCampaign,
  type CompletionParticipation,
} from "./campaigns";

const STARTS = new Date("2026-10-01T00:00:00.000Z");
const ENDS = new Date("2026-10-31T23:59:59.000Z");
const NOW = new Date("2026-10-12T12:00:00.000Z");

function campaign(patch: Partial<CompletionCampaign> = {}): CompletionCampaign {
  return { status: "active", endsAt: ENDS, ...patch };
}

function participation(
  patch: Partial<CompletionParticipation> = {},
): CompletionParticipation {
  return { joinedAt: STARTS, completedAt: null, ...patch };
}

describe("campaignKeyFor", () => {
  it("prefixes and truncates the id to 8 characters", () => {
    expect(campaignKeyFor("clxyz123456789")).toBe("we-campaign-clxyz123");
    expect(campaignKeyFor("abc")).toBe("we-campaign-abc");
  });
});

describe("campaignTrackedLink", () => {
  it("is the referral link plus the affiliate/social UTM triple", () => {
    expect(campaignTrackedLink("JAMESON", "clxyz123456789")).toBe(
      "https://worldeye.app/ref/JAMESON" +
        "?utm_source=affiliate&utm_medium=social&utm_campaign=we-campaign-clxyz123",
    );
  });

  it("tracks different campaigns for the same code distinctly", () => {
    const a = campaignTrackedLink("CODE", "aaaaaaaa1111");
    const b = campaignTrackedLink("CODE", "bbbbbbbb2222");
    expect(a).not.toBe(b);
    expect(a).toContain("utm_campaign=we-campaign-aaaaaaaa");
    expect(b).toContain("utm_campaign=we-campaign-bbbbbbbb");
  });
});

describe("evaluateCompletion", () => {
  it("accepts a joined, uncompleted participation on a live campaign with a valid post URL", () => {
    expect(
      evaluateCompletion(participation(), campaign(), "https://instagram.com/p/abc123", NOW),
    ).toEqual({ ok: true });
    expect(
      evaluateCompletion(participation(), campaign(), "http://example.com/post", NOW),
    ).toEqual({ ok: true });
  });

  it("accepts a completion on an ended (non-draft) campaign when the affiliate joined in time", () => {
    expect(
      evaluateCompletion(participation(), campaign({ status: "ended" }), "https://x.com/u/status/1", NOW),
    ).toEqual({ ok: true });
  });

  it("rejects when there is no participation (never joined)", () => {
    expect(evaluateCompletion(null, campaign(), "https://example.com/p", NOW)).toEqual({
      ok: false,
      reason: "not_joined",
    });
    expect(evaluateCompletion(undefined, campaign(), "https://example.com/p", NOW).ok).toBe(false);
  });

  it("rejects a replay: an already-completed participation", () => {
    const done = participation({ completedAt: new Date("2026-10-10T00:00:00.000Z") });
    expect(evaluateCompletion(done, campaign(), "https://example.com/p", NOW)).toEqual({
      ok: false,
      reason: "already_completed",
    });
  });

  it("rejects a draft campaign", () => {
    expect(
      evaluateCompletion(participation(), campaign({ status: "draft" }), "https://example.com/p", NOW),
    ).toEqual({ ok: false, reason: "campaign_draft" });
  });

  it("rejects bad post URLs", () => {
    for (const bad of ["", "   ", "not a url", "example.com/post", "ftp://example.com/p", 42, null, undefined]) {
      const r = evaluateCompletion(participation(), campaign(), bad, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid_post_url");
    }
  });

  it("rejects when the affiliate joined after the campaign ended", () => {
    const late = participation({ joinedAt: new Date("2026-11-01T00:00:01.000Z") });
    expect(evaluateCompletion(late, campaign(), "https://example.com/p", NOW)).toEqual({
      ok: false,
      reason: "joined_after_campaign_end",
    });
  });

  it("accepts joining exactly at the campaign end", () => {
    const atEnd = participation({ joinedAt: ENDS });
    expect(evaluateCompletion(atEnd, campaign(), "https://example.com/p", NOW)).toEqual({
      ok: true,
    });
  });
});
