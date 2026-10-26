import { describe, it, expect } from "vitest";
import {
  cameraAlertWatchable,
  cameraRecordStill,
  interpretAlertsGet,
  interpretCreateResult,
  interpretDeleteResult,
  ruleForCamera,
  type AlertRuleLike,
} from "./viewer";
import { CAP_MESSAGE } from "./logic";

describe("cameraRecordStill (mirrors stillOf in lib/vision/frames)", () => {
  it("returns the feed for a jpg camera", () => {
    expect(cameraRecordStill({ stream_type: "jpg", feed_url: "https://cam.example/x.jpg" })).toBe(
      "https://cam.example/x.jpg",
    );
  });
  it("treats a missing stream_type as jpg", () => {
    expect(cameraRecordStill({ feed_url: "https://cam.example/x.jpg" })).toBe(
      "https://cam.example/x.jpg",
    );
  });
  it("refuses stream-only cameras — the checker could never see a still", () => {
    expect(cameraRecordStill({ stream_type: "hls", stream_url: "https://cam.example/x.m3u8" })).toBeNull();
    expect(cameraRecordStill({ stream_type: "mp4", feed_url: "https://cam.example/x.mp4" })).toBeNull();
    expect(cameraRecordStill({ stream_type: "iframe", feed_url: "https://cam.example/page" })).toBeNull();
  });
  it("refuses a jpg record with no feed, and non-http feeds", () => {
    expect(cameraRecordStill({ stream_type: "jpg" })).toBeNull();
    expect(cameraRecordStill({ stream_type: "jpg", feed_url: "" })).toBeNull();
    expect(cameraRecordStill({ stream_type: "jpg", feed_url: "/api/cctv/faa-image/9" })).toBeNull();
  });
  it("ignores stream_url — stillOf reads feed_url only", () => {
    expect(cameraRecordStill({ stream_type: "jpg", stream_url: "https://cam.example/x.jpg" })).toBeNull();
  });
  it("unwraps a camera-proxy feed to its inner URL", () => {
    const proxied = `/api/cctv/proxy?url=${encodeURIComponent("https://cam.example/x.jpg")}`;
    expect(cameraRecordStill({ stream_type: "jpg", feed_url: proxied })).toBe(
      "https://cam.example/x.jpg",
    );
  });
  it("handles null and junk input", () => {
    expect(cameraRecordStill(null)).toBeNull();
    expect(cameraRecordStill(undefined)).toBeNull();
    expect(cameraAlertWatchable({ stream_type: "jpg", feed_url: "https://a.b/c.jpg" })).toBe(true);
    expect(cameraAlertWatchable({ stream_type: "hls", stream_url: "https://a.b/c.m3u8" })).toBe(false);
  });
});

const rule = (over: Partial<AlertRuleLike> = {}): AlertRuleLike => ({
  id: "r1",
  cameraId: "cam-1",
  condition: "snow on the road",
  active: true,
  emailEnabled: true,
  inAppEnabled: true,
  ...over,
});

describe("ruleForCamera (the globe button's dedupe)", () => {
  it("finds the member's rule for the open camera", () => {
    expect(ruleForCamera([rule({ cameraId: "cam-2" }), rule()], "cam-1")?.id).toBe("r1");
  });
  it("matches numeric catalogue ids against the rule's string id", () => {
    expect(ruleForCamera([rule({ cameraId: "42" })], 42)?.id).toBe("r1");
  });
  it("counts a paused rule as existing — no duplicates", () => {
    expect(ruleForCamera([rule({ active: false })], "cam-1")?.active).toBe(false);
  });
  it("returns null when there is no rule, no rules, or no camera id", () => {
    expect(ruleForCamera([rule({ cameraId: "cam-2" })], "cam-1")).toBeNull();
    expect(ruleForCamera([], "cam-1")).toBeNull();
    expect(ruleForCamera(null, "cam-1")).toBeNull();
    expect(ruleForCamera([rule()], "")).toBeNull();
    expect(ruleForCamera([rule()], undefined)).toBeNull();
  });
});

describe("interpretAlertsGet (the button's gating state)", () => {
  it("401 is signed-out, never an error", () => {
    expect(interpretAlertsGet(401, { error: "signin" })).toEqual({ kind: "signed-out" });
  });
  it("a 200 payload becomes the ready view", () => {
    const s = interpretAlertsGet(200, {
      vip: true,
      maxActive: 10,
      activeCount: 3,
      rules: [rule()],
      events: [],
      unreadCount: 0,
    });
    expect(s.kind).toBe("ready");
    if (s.kind === "ready") {
      expect(s.view.vip).toBe(true);
      expect(s.view.activeCount).toBe(3);
      expect(s.view.maxActive).toBe(10);
      expect(s.view.rules).toHaveLength(1);
    }
  });
  it("a non-VIP member still gets their (paused) rules", () => {
    const s = interpretAlertsGet(200, { vip: false, rules: [rule()], activeCount: 1, maxActive: 10 });
    expect(s.kind).toBe("ready");
    if (s.kind === "ready") expect(s.view.vip).toBe(false);
  });
  it("carries the member's tier and their own cap (pro = 2)", () => {
    const s = interpretAlertsGet(200, {
      tier: "pro",
      vip: false,
      maxActive: 2,
      activeCount: 2,
      rules: [rule()],
    });
    expect(s.kind).toBe("ready");
    if (s.kind === "ready") {
      expect(s.view.tier).toBe("pro");
      expect(s.view.maxActive).toBe(2);
    }
  });
  it("derives the tier from the vip flag when an older payload omits it", () => {
    const s = interpretAlertsGet(200, { vip: true, maxActive: 10, activeCount: 0, rules: [] });
    expect(s.kind).toBe("ready");
    if (s.kind === "ready") expect(s.view.tier).toBe("vip");
  });
  it("malformed or failed payloads are an honest error state", () => {
    expect(interpretAlertsGet(500, {})).toEqual({ kind: "error" });
    expect(interpretAlertsGet(200, { vip: true })).toEqual({ kind: "error" });
    expect(interpretAlertsGet(200, null)).toEqual({ kind: "error" });
  });
});

describe("interpretCreateResult", () => {
  it("201 carries the created rule", () => {
    const o = interpretCreateResult(201, { rule: rule() });
    expect(o.kind).toBe("created");
    if (o.kind === "created") expect(o.rule.cameraId).toBe("cam-1");
  });
  it("401 and 403 map to the sign-in and plan states, not errors", () => {
    expect(interpretCreateResult(401, { error: "signin" })).toEqual({ kind: "signin" });
    expect(
      interpretCreateResult(403, { error: "plan", message: "Camera alerts start with Pro." }),
    ).toEqual({ kind: "plan" });
  });
  it("the cap refusal passes through verbatim (409)", () => {
    const o = interpretCreateResult(409, { error: CAP_MESSAGE });
    expect(o).toEqual({ kind: "error", message: CAP_MESSAGE });
  });
  it("service refusals pass through verbatim (400)", () => {
    const msg = "That camera is a live stream without still images — alerts need a still photo to check, so pick another camera.";
    expect(interpretCreateResult(400, { error: msg })).toEqual({ kind: "error", message: msg });
  });
  it("an unreadable body falls back to a plain message", () => {
    expect(interpretCreateResult(500, null)).toEqual({
      kind: "error",
      message: "Couldn't create that alert.",
    });
  });
});

describe("interpretDeleteResult", () => {
  it("200 is deleted", () => {
    expect(interpretDeleteResult(200, { ok: true })).toEqual({ kind: "deleted" });
  });
  it("failures surface the service's message", () => {
    expect(interpretDeleteResult(404, { error: "Alert not found." })).toEqual({
      kind: "error",
      message: "Alert not found.",
    });
    expect(interpretDeleteResult(401, { error: "signin" })).toEqual({
      kind: "error",
      message: "Couldn't remove that alert.",
    });
  });
});
