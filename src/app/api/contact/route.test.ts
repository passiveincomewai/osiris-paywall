// POST /api/contact pins:
//  - a valid submission is stored via db.contactMessage.create with the
//    normalized fields and answered { ok: true };
//  - invalid input is a 400 and stores nothing;
//  - the per-IP rate limit (shared helper with the auth routes) trips
//    after 5 submissions in an hour and answers 429.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (arg: { data: Record<string, string> }) => ({ id: "msg_1", ...arg.data })),
}));

vi.mock("@/lib/db", () => ({
  db: { contactMessage: { create: mocks.create } },
}));

import { POST } from "./route";

let ip = 100;
const post = (body: unknown, fromIp?: string) =>
  POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": fromIp ?? `10.1.0.${++ip}`,
      },
      body: JSON.stringify(body),
    }),
  );

const GOOD = {
  name: "Jane Smith",
  email: "jane@example.com",
  topic: "camera-report",
  message: "The pier camera in Santa Monica has been offline for days.",
};

beforeEach(() => {
  mocks.create.mockClear();
});

describe("POST /api/contact", () => {
  it("stores a valid submission and confirms it", async () => {
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual({ ok: true, id: "msg_1" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      name: "Jane Smith",
      email: "jane@example.com",
      topic: "camera-report",
    });
  });

  it("rejects an invalid email with 400 and stores nothing", async () => {
    const res = await post({ ...GOOD, email: "nope" });
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown topic and a too-short message", async () => {
    expect((await post({ ...GOOD, topic: "unknown-topic" })).status).toBe(400);
    expect((await post({ ...GOOD, message: "hi" })).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rate-limits the 6th submission from one IP within the hour", async () => {
    const from = "10.9.9.9";
    for (let i = 0; i < 5; i++) {
      expect((await post(GOOD, from)).status).toBe(200);
    }
    const sixth = await post(GOOD, from);
    expect(sixth.status).toBe(429);
    expect(mocks.create).toHaveBeenCalledTimes(5);
  });
});
