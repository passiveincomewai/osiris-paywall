// Login pre-check pins:
//  - an UNVERIFIED credentials account signs in (the 2026-10-29 rule
//    change: verification is a Settings step, not a login gate — it
//    used to 403 here);
//  - a wrong password still 401s identically (no oracle);
//  - an OAuth-only account still gets the no_password guidance.
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { hashPassword } from "@/lib/password-auth";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(async () => null as unknown),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.userFindUnique } },
}));

import { POST } from "./route";

let ipCounter = 0;
function makeReq(email: string, password: string) {
  ipCounter += 1;
  return new Request("https://worldeye.app/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `192.0.2.${ipCounter}`,
    },
    body: JSON.stringify({ email, password }),
  });
}

let passwordHash = "";
beforeAll(async () => {
  passwordHash = await hashPassword("correct-horse-9");
});

beforeEach(() => {
  mocks.userFindUnique.mockReset();
  mocks.userFindUnique.mockImplementation(async () => null);
});

describe("POST /api/auth/login", () => {
  it("allows an unverified credentials account with the right password", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "unverified@example.com",
      passwordHash,
      emailVerified: null, // the whole point: null must not block
      accounts: [],
    }));
    const res = await POST(makeReq("unverified@example.com", "correct-horse-9"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("still rejects a wrong password with the generic 401", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "unverified@example.com",
      passwordHash,
      emailVerified: null,
      accounts: [],
    }));
    const res = await POST(makeReq("unverified@example.com", "wrong-password-1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid email or password.");
  });

  it("still routes OAuth-only accounts to the no_password guidance", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "oauth@example.com",
      passwordHash: null,
      emailVerified: null,
      accounts: [{ provider: "google" }],
    }));
    const res = await POST(makeReq("oauth@example.com", "whatever-123"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("no_password");
  });

  it("unknown email → generic 401, no oracle", async () => {
    const res = await POST(makeReq("ghost@example.com", "whatever-123"));
    expect(res.status).toBe(401);
  });
});
