import { describe, it, expect } from "vitest";
import {
  sourceLabel,
  resolveSessions,
  buildFunnel,
  classifyPayments,
  buildSegments,
  type PvRowLite,
  type MoneyEvent,
} from "./conversion-analytics";

const T0 = new Date("2026-10-20T12:00:00.000Z").getTime();
const at = (sec: number) => new Date(T0 + sec * 1000);

let seq = 0;
function pv(partial: Partial<PvRowLite> & { sessionId: string }): PvRowLite {
  seq += 1;
  return {
    userId: null,
    path: "/",
    event: null,
    referrer: null,
    utmSource: null,
    device: null,
    createdAt: at(seq),
    ...partial,
  };
}

/** One full-funnel session: lands, reaches globe, opens camera, sees pricing. */
function fullSession(sid: string, extra: Partial<PvRowLite> = {}, baseSec = 0) {
  return [
    pv({ sessionId: sid, path: "/", createdAt: at(baseSec + 1), ...extra }),
    pv({ sessionId: sid, path: "/", event: "globe_reached", createdAt: at(baseSec + 2) }),
    pv({ sessionId: sid, path: "/", event: "camera_open", createdAt: at(baseSec + 3) }),
    pv({ sessionId: sid, path: "/pricing", createdAt: at(baseSec + 4) }),
  ];
}

describe("sourceLabel", () => {
  it("labels known utm sources", () => {
    expect(sourceLabel("chatgpt.com", null)).toBe("ChatGPT");
    expect(sourceLabel("ig", null)).toBe("Instagram");
    expect(sourceLabel("instagram", null)).toBe("Instagram");
    expect(sourceLabel("google", null)).toBe("Google");
    expect(sourceLabel("some-partner", null)).toBe("some-partner"); // unknown passes through
  });

  it("falls back to the referrer host", () => {
    expect(sourceLabel(null, "https://chatgpt.com/c/abc")).toBe("ChatGPT");
    expect(sourceLabel(null, "https://www.google.com/")).toBe("Google");
    expect(sourceLabel(null, "https://l.instagram.com/?u=x")).toBe("Instagram");
    expect(sourceLabel(null, "https://news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
  });

  it("treats internal referrers and empties as Direct", () => {
    expect(sourceLabel(null, "https://worldeye.app/pricing")).toBe("Direct");
    expect(sourceLabel(null, null)).toBe("Direct");
    expect(sourceLabel("", "")).toBe("Direct");
  });

  it("prefers utmSource over referrer", () => {
    expect(sourceLabel("chatgpt.com", "https://www.google.com/")).toBe("ChatGPT");
  });
});

describe("resolveSessions", () => {
  it("resolves one fact record per session with stage flags", () => {
    const rows = [
      ...fullSession("s1", { utmSource: "chatgpt.com", device: "mobile", userId: "u1" }),
      pv({ sessionId: "s2", path: "/cameras", createdAt: at(10) }), // view only
      pv({ sessionId: "s3", path: "/", event: "globe_reached", createdAt: at(11) }), // event only
    ];
    const sessions = resolveSessions(rows);
    expect(sessions).toHaveLength(3);
    const s1 = sessions.find((s) => s.sessionId === "s1")!;
    expect(s1).toMatchObject({
      userId: "u1", landingPath: "/", source: "ChatGPT", device: "mobile",
      hasView: true, globe: true, camera: true, pricing: true,
    });
    const s2 = sessions.find((s) => s.sessionId === "s2")!;
    expect(s2).toMatchObject({ hasView: true, globe: false, camera: false, pricing: false, source: "Direct", device: "unknown" });
    const s3 = sessions.find((s) => s.sessionId === "s3")!;
    expect(s3.hasView).toBe(false);
    expect(s3.globe).toBe(true);
  });

  it("takes source/device/userId from the first row that carries them", () => {
    const rows = [
      pv({ sessionId: "s1", path: "/", createdAt: at(1) }),
      pv({ sessionId: "s1", path: "/", event: "camera_open", createdAt: at(2) }),
      pv({ sessionId: "s1", path: "/pricing", referrer: "https://www.google.com/", device: "desktop", userId: "u9", createdAt: at(3) }),
    ];
    const [s] = resolveSessions(rows);
    expect(s.source).toBe("Google");
    expect(s.device).toBe("desktop");
    expect(s.userId).toBe("u9");
    expect(s.landingPath).toBe("/"); // earliest row, not the attributed row
  });

  it("handles unsorted input", () => {
    const rows = fullSession("s1").reverse();
    const [s] = resolveSessions(rows);
    expect(s.landingPath).toBe("/");
    expect(s.globe && s.camera && s.pricing).toBe(true);
  });
});

describe("buildFunnel", () => {
  it("computes counts, percentages and the biggest drop-off", () => {
    const { stages, biggestDropoff } = buildFunnel({
      landed: 100, globe: 60, camera: 40, pricing: 20, checkout: 10, trial: 6, first: 2, renewal: 1,
    });
    expect(stages.map((s) => s.count)).toEqual([100, 60, 40, 20, 10, 6, 2, 1]);
    expect(stages[1].pctOfPrev).toBeCloseTo(60);
    expect(stages[1].pctOfLanded).toBeCloseTo(60);
    expect(stages[4].pctOfPrev).toBeCloseTo(50); // checkout vs pricing
    expect(stages[0].pctOfPrev).toBeNull();
    expect(biggestDropoff?.key).toBe("globe"); // 100 -> 60 is the largest absolute drop
    expect(biggestDropoff?.dropFromPrev).toBe(40);
  });

  it("has no drop-off when counts only grow (money stages are not nested)", () => {
    const { biggestDropoff } = buildFunnel({
      landed: 10, globe: 10, camera: 10, pricing: 10, checkout: 10, trial: 10, first: 10, renewal: 12,
    });
    expect(biggestDropoff).toBeNull();
  });

  it("survives an empty window", () => {
    const { stages } = buildFunnel({
      landed: 0, globe: 0, camera: 0, pricing: 0, checkout: 0, trial: 0, first: 0, renewal: 0,
    });
    expect(stages[0].pctOfLanded).toBeNull();
    expect(stages[1].pctOfPrev).toBeNull();
  });
});

describe("classifyPayments", () => {
  const inv = (subscriptionId: string, createdSec: number, userId: string | null = null) => ({
    subscriptionId, createdSec, userId,
  });

  it("counts a first-ever payment in the window as a first payment", () => {
    const r = classifyPayments([inv("sub_a", 100, "u1")], new Set());
    expect(r.firstPayments).toBe(1);
    expect(r.renewals).toBe(0);
    expect(r.events).toEqual([{ kind: "first", userId: "u1", atSec: 100 }]);
  });

  it("counts a payment by a subscription that paid before the window as a renewal", () => {
    const r = classifyPayments([inv("sub_a", 100, "u1")], new Set(["sub_a"]));
    expect(r.firstPayments).toBe(0);
    expect(r.renewals).toBe(1);
    expect(r.events).toEqual([{ kind: "renewal", userId: "u1", atSec: 100 }]);
  });

  it("counts a weekly plan converted AND renewed inside the window in both stages", () => {
    const r = classifyPayments([inv("sub_w", 100, "u2"), inv("sub_w", 200, "u2")], new Set());
    expect(r.firstPayments).toBe(1);
    expect(r.renewals).toBe(1);
    expect(r.events.map((e) => e.kind)).toEqual(["first", "renewal"]);
  });

  it("counts subscriptions, not invoices", () => {
    const r = classifyPayments(
      [inv("sub_a", 100), inv("sub_a", 200), inv("sub_b", 150)],
      new Set(["sub_b"]),
    );
    expect(r.firstPayments).toBe(1); // sub_a only
    expect(r.renewals).toBe(2); // sub_a's 2nd invoice + sub_b
  });
});

describe("buildSegments", () => {
  const sessions = resolveSessions([
    ...fullSession("s1", { utmSource: "chatgpt.com", device: "mobile", userId: "u1" }, 0),
    ...fullSession("s2", { utmSource: "chatgpt.com", device: "desktop", userId: "u2" }, 100),
    pv({ sessionId: "s3", path: "/blog/x", referrer: "https://www.google.com/", device: "mobile", createdAt: at(300) }),
  ]);
  const events: MoneyEvent[] = [
    { kind: "trial", userId: "u1", atSec: 10 },
    { kind: "first", userId: "u1", atSec: 20 },
    { kind: "renewal", userId: "u2", atSec: 30 },
    { kind: "first", userId: "ghost", atSec: 40 }, // user with no session in window
    { kind: "trial", userId: null, atSec: 50 }, // no userId at all
  ];

  it("segments site stages by source and attributes money via the user's session", () => {
    const rows = buildSegments(sessions, events, "source");
    const chatgpt = rows.find((r) => r.label === "ChatGPT")!;
    expect(chatgpt).toMatchObject({ landed: 2, globe: 2, camera: 2, pricing: 2, trials: 1, paid: 2 });
    expect(chatgpt.endToEndPct).toBeCloseTo(100);
    const google = rows.find((r) => r.label === "Google")!;
    expect(google).toMatchObject({ landed: 1, globe: 0, trials: 0, paid: 0 });
    const unattr = rows.find((r) => r.key === "__unattributed")!;
    expect(unattr).toMatchObject({ trials: 1, paid: 1, landed: 0 });
  });

  it("segments by device", () => {
    const rows = buildSegments(sessions, events, "device");
    const mobile = rows.find((r) => r.label === "mobile")!;
    expect(mobile).toMatchObject({ landed: 2, trials: 1, paid: 1 }); // u1's session + s3
    const desktop = rows.find((r) => r.label === "desktop")!;
    expect(desktop).toMatchObject({ landed: 1, paid: 1 }); // u2's renewal
  });

  it("attributes money to the user's EARLIEST session in the window", () => {
    const two = resolveSessions([
      pv({ sessionId: "late", path: "/", device: "desktop", userId: "u1", createdAt: at(500) }),
      pv({ sessionId: "early", path: "/", device: "mobile", userId: "u1", createdAt: at(5) }),
    ]);
    const rows = buildSegments(two, [{ kind: "first", userId: "u1", atSec: 600 }], "device");
    expect(rows.find((r) => r.label === "mobile")!.paid).toBe(1);
    expect(rows.find((r) => r.label === "desktop")!.paid).toBe(0);
  });

  it("folds small sources into Other past the keep limit", () => {
    const many: PvRowLite[] = [];
    for (let i = 0; i < 10; i++) {
      // source i gets (10 - i) sessions so ranking is deterministic
      for (let j = 0; j < 10 - i; j++) {
        many.push(pv({ sessionId: `src${i}-s${j}`, path: "/", utmSource: `partner-${i}`, createdAt: at(i * 100 + j) }));
      }
    }
    const rows = buildSegments(resolveSessions(many), [], "source");
    expect(rows.filter((r) => r.key !== "__other")).toHaveLength(7);
    const other = rows.find((r) => r.key === "__other")!;
    expect(other.landed).toBe(3 + 2 + 1); // the three smallest sources fold
    expect(rows.reduce((a, r) => a + r.landed, 0)).toBe(55); // totals preserved
  });

  it("keeps only the top 12 landing pages and folds the rest", () => {
    const many: PvRowLite[] = [];
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15 - i; j++) {
        many.push(pv({ sessionId: `p${i}-s${j}`, path: `/page-${i}`, createdAt: at(i * 100 + j) }));
      }
    }
    const rows = buildSegments(resolveSessions(many), [], "landing");
    expect(rows).toHaveLength(13); // 12 + Other
    expect(rows.find((r) => r.key === "__other")!.landed).toBe(3 + 2 + 1);
  });

  it("omits the unattributed row when every money event joins a session", () => {
    const rows = buildSegments(sessions, [{ kind: "trial", userId: "u1", atSec: 1 }], "source");
    expect(rows.find((r) => r.key === "__unattributed")).toBeUndefined();
  });
});
