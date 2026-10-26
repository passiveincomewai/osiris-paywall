// POST /api/camera-submissions pins:
//  - a valid submission is stored as pending with its intake probe
//    result, the receipt email is attempted and its send stamped;
//  - a filled honeypot gets a success-shaped answer and stores nothing;
//  - SSRF-blocked or malformed URLs are 400s and store nothing;
//  - the per-IP rate limit (shared helper with the contact/auth routes)
//    trips after 5 submissions in an hour and answers 429.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (arg: { data: Record<string, unknown> }) => ({ id: "sub_1", ...arg.data })),
  update: vi.fn(async () => ({})),
  safeFetch: vi.fn(),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: { cameraSubmission: { create: mocks.create, update: mocks.update } },
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
  mocks.sendEmail.mockClear();
  mocks.safeFetch.mockReset();
  mocks.safeFetch.mockImplementation(async () => new Response("frame", { status: 200 }));
});

describe("POST /api/camera-submissions", () => {
  it("stores a valid submission as pending with the probe result and emails a receipt", async () => {
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual({ ok: true, id: "sub_1" });
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
