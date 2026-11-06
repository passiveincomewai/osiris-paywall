// POST /api/camera-requests pins:
//  - a valid request is stored with status "new" and the session's
//    user id (never a body-supplied one);
//  - anonymous requests store userId null;
//  - a filled honeypot gets a success-shaped answer and stores nothing;
//  - invalid bodies are 400s and store nothing;
//  - the per-IP rate limit (shared helper with the partners/contact
//    routes) trips after 5 requests in an hour and answers 429.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (arg: { data: Record<string, unknown> }) => ({ id: "req_1", ...arg.data })),
  session: null as { user?: { id?: string } } | null,
}));

vi.mock("@/lib/db", () => ({
  db: { cameraRequest: { create: mocks.create } },
}));
vi.mock("@/auth", () => ({
  auth: async () => mocks.session,
}));

import { POST } from "./route";

let ip = 100;
const post = (body: unknown, fromIp?: string) =>
  POST(
    new Request("http://localhost/api/camera-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": fromIp ?? `10.3.0.${++ip}`,
      },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  mocks.create.mockClear();
  mocks.session = null;
});

describe("POST /api/camera-requests", () => {
  it("stores a valid anonymous request as new", async () => {
    const res = await post({ placeText: "Banff", query: "banff cameras" });
    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const data = mocks.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ placeText: "Banff", query: "banff cameras", userId: null, status: "new" });
  });

  it("attaches the signed-in user id from the session, not the body", async () => {
    mocks.session = { user: { id: "user_9" } };
    const res = await post({ placeText: "Banff", userId: "forged" });
    expect(res.status).toBe(200);
    expect(mocks.create.mock.calls[0][0].data.userId).toBe("user_9");
  });

  it("answers a honeypot like a success and stores nothing", async () => {
    const res = await post({ placeText: "Banff", website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with 400 and stores nothing", async () => {
    const res = await post({ placeText: "" });
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rate-limits the sixth request from one IP in an hour", async () => {
    const from = "10.3.9.9";
    for (let i = 0; i < 5; i++) {
      expect((await post({ placeText: "Banff" }, from)).status).toBe(200);
    }
    expect((await post({ placeText: "Banff" }, from)).status).toBe(429);
  });
});
