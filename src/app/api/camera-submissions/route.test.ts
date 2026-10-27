// POST /api/camera-submissions pins:
//  - a valid submission is stored as pending with its intake probe
//    result, the receipt email is attempted and its send stamped, and
//    the response reports the intake checks in `checks`;
//  - an exact duplicate — of a catalogue feed or of a submission
//    already pending — is refused 409 naming what it duplicates, and
//    stores nothing; a possible duplicate is stored with the reviewer
//    flag on probeDetail and reported in `checks`;
//  - a filled honeypot gets a success-shaped answer and stores nothing;
//  - SSRF-blocked or malformed URLs are 400s and store nothing;
//  - the per-IP rate limit (shared helper with the contact/auth routes)
//    trips after 5 submissions in an hour and answers 429.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (arg: { data: Record<string, unknown> }) => ({ id: "sub_1", ...arg.data })),
  update: vi.fn(async () => ({})),
  findMany: vi.fn(async () => [] as unknown[]),
  directory: new Map<string, unknown>(),
  safeFetch: vi.fn(),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cameraSubmission: {
      create: mocks.create,
      update: mocks.update,
      findMany: mocks.findMany,
    },
  },
}));
vi.mock("@/lib/camera-directory-lookup", () => ({
  loadDirectoryIndex: async () => mocks.directory,
}));
vi.mock("@/lib/ssrf-guard", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return { ...actual, safeFetch: mocks.safeFetch };
});
vi.mock("@/lib/email", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return { ...actual, sendEmail: mocks.sendEmail };
});

import { POST } from "./route";

let ip = 200;
const post = (body: unknown, fromIp?: string) =>
  POST(
    new Request("http://localhost/api/camera-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": fromIp ?? `10.2.0.${++ip}`,
      },
      body: JSON.stringify(body),
    }),
  );

// A public literal-IP host: validateHost's literal path approves it with
// no DNS lookup, and safeFetch is stubbed, so the test never touches the
// network.
const GOOD = {
  kind: "suggest",
  cameraName: "Harbor Entrance Cam",
  url: "http://8.8.8.8/harbor.m3u8",
  category: "harbor",
  city: "Friday Harbor",
  country: "United States",
  lat: "",
  lng: "",
  submitterName: "Jane Smith",
  submitterEmail: "jane@example.com",
  declaration: true,
  notes: "",
  website: "",
};

beforeEach(() => {
  mocks.create.mockClear();
  mocks.update.mockClear();
  mocks.findMany.mockReset();
  mocks.findMany.mockImplementation(async () => []);
  mocks.directory.clear();
  mocks.sendEmail.mockClear();
  mocks.sendEmail.mockImplementation(async () => true);
  mocks.safeFetch.mockReset();
  mocks.safeFetch.mockImplementation(async () => new Response("frame", { status: 200 }));
});

describe("POST /api/camera-submissions", () => {
  it("stores a valid submission as pending with the probe result and emails a receipt", async () => {
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual({
      ok: true,
      id: "sub_1",
      checks: {
        urlSafety: "passed",
        reachability: "reachable",
        duplicate: "none",
        receiptEmailed: true,
      },
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      kind: "suggest",
      cameraName: "Harbor Entrance Cam",
      url: "http://8.8.8.8/harbor.m3u8",
      submitterEmail: "jane@example.com",
      declaration: true,
      probeStatus: "reachable",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "jane@example.com",
      expect.stringContaining("Harbor Entrance Cam"),
      expect.any(String),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: { receiptEmailedAt: expect.any(Date) },
    });
  });

  it("silently drops a honeypot submission — success shape, nothing stored", async () => {
    const res = await post({ ...GOOD, website: "http://spam.example/cheap" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects SSRF-target URLs with 400 and stores nothing", async () => {
    for (const url of [
      "http://192.168.1.10/cam",
      "http://127.0.0.1:8080/admin",
      "http://169.254.169.254/latest/meta-data",
      "http://localhost/cam",
    ]) {
      const res = await post({ ...GOOD, url });
      expect(res.status, url).toBe(400);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects malformed input with 400 and stores nothing", async () => {
    expect((await post({ ...GOOD, url: "ftp://example.com/cam" })).status).toBe(400);
    expect((await post({ ...GOOD, url: "https://user:pass@example.com/cam" })).status).toBe(400);
    expect((await post({ ...GOOD, submitterEmail: "nope" })).status).toBe(400);
    expect((await post({ ...GOOD, declaration: false })).status).toBe(400);
    expect((await post({ ...GOOD, lat: "48.5" })).status).toBe(400); // lat without lng
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("still stores the submission when the probe cannot reach the feed", async () => {
    mocks.safeFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ probeStatus: "unknown" });
    const j = await res.json();
    expect(j.checks.reachability).toBe("unknown");
    expect(j.checks.duplicate).toBe("none");
  });

  it("reports receiptEmailed false when the receipt send fails", async () => {
    mocks.sendEmail.mockImplementation(async () => false);
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.checks.receiptEmailed).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("refuses an exact catalogue duplicate with 409 naming the listed camera", async () => {
    mocks.directory.set("cam1", {
      id: "cam1",
      name: "Harbor Entrance Cam",
      city: "Friday Harbor",
      country: "United States",
      lat: 48.5,
      lng: -123.0,
      feed_url: "http://8.8.8.8/harbor.m3u8",
    });
    const res = await post(GOOD);
    expect(res.status).toBe(409);
    const j = await res.json();
    expect(j.error).toContain("already on WorldEye as “Harbor Entrance Cam”");
    expect(j.checks).toEqual({ urlSafety: "passed", duplicate: "exact" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("catches an exact duplicate hiding behind cosmetic URL differences", async () => {
    mocks.directory.set("cam2", {
      id: "cam2",
      name: "Harbor Entrance Cam (East)",
      city: "Friday Harbor",
      country: "United States",
      // A stream address (not the feed address) with another scheme, a
      // trailing slash and a tracking parameter still exact-matches.
      stream_url: "https://8.8.8.8/harbor.m3u8/?utm_source=partner",
    });
    const res = await post(GOOD);
    expect(res.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses a feed already submitted and pending review", async () => {
    mocks.findMany.mockImplementation(async () => [
      {
        id: "sub_0",
        cameraName: "Harbor Entrance Cam",
        url: "http://8.8.8.8/harbor.m3u8",
        city: "Friday Harbor",
        country: "United States",
        lat: null,
        lng: null,
      },
    ]);
    const res = await post(GOOD);
    expect(res.status).toBe(409);
    const j = await res.json();
    expect(j.error).toContain("already been submitted as “Harbor Entrance Cam”");
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "pending" } }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("stores a possible duplicate with the reviewer flag on probeDetail", async () => {
    mocks.directory.set("cam9", {
      id: "cam9",
      name: "Harbor Entrance Cam",
      city: "Friday Harbor",
      country: "United States",
      feed_url: "http://9.9.9.9/different-feed.m3u8",
    });
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.checks.duplicate).toBe("possible");
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const stored = mocks.create.mock.calls[0][0].data;
    expect(stored.probeStatus).toBe("reachable");
    expect(String(stored.probeDetail)).toContain(
      "Possible duplicate of “Harbor Entrance Cam” (Friday Harbor, United States)",
    );
  });

  it("rate-limits the 6th submission from one IP within the hour", async () => {
    const from = "10.9.8.7";
    for (let i = 0; i < 5; i++) {
      expect((await post(GOOD, from)).status).toBe(200);
    }
    const sixth = await post(GOOD, from);
    expect(sixth.status).toBe(429);
    expect(mocks.create).toHaveBeenCalledTimes(5);
  });
});
