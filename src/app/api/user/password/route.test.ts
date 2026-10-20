// Route tests for POST /api/user/password (change / set password).
// Pins the end-to-end behavior the settings form relies on:
//  - signed-out callers get 401 and nothing is written;
//  - a wrong current password is a clear 400 and the stored hash is untouched;
//  - the correct current password updates the hash so the NEW password
//    verifies (real bcrypt via lib/password-auth) and the old one doesn't;
//  - OAuth accounts with no password yet can set one with no current password;
//  - a too-short new password is rejected before any write.
// db + auth are mocked with vi.hoisted, same pattern as the checkout route tests.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findUser: vi.fn(async () => null as { passwordHash: string | null } | null),
  updateUser: vi.fn(async () => ({})),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.findUser,
      update: mocks.updateUser,
    },
  },
}));

import { POST } from "./route";
import { hashPassword, verifyPassword } from "@/lib/password-auth";

let ipSeq = 0;
/** Unique XFF per call so the route's per-IP rate limiter never trips mid-suite. */
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/user/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": `10.0.0.${++ipSeq}`,
      },
      body: JSON.stringify(body),
    }),
  );

const OLD_PW = "old-password-1";
const NEW_PW = "new-password-2";

describe("POST /api/user/password", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findUser.mockResolvedValue({ passwordHash: await hashPassword(OLD_PW) });
    mocks.updateUser.mockResolvedValue({});
  });

  it("rejects signed-out callers with 401 and writes nothing", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ currentPassword: OLD_PW, newPassword: NEW_PW });
    expect(res.status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password with a clear error and writes nothing", async () => {
    const res = await post({ currentPassword: "not-the-password", newPassword: NEW_PW });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/current password is incorrect/i);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects a missing current password when one is set", async () => {
    const res = await post({ newPassword: NEW_PW });
    expect(res.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("correct current password: stores a hash the NEW password verifies against", async () => {
    const res = await post({ currentPassword: OLD_PW, newPassword: NEW_PW });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    const arg = (mocks.updateUser.mock.calls as any)[0][0];
    expect(arg.where).toEqual({ id: "user-1" });
    const storedHash: string = arg.data.passwordHash;
    expect(typeof storedHash).toBe("string");
    // The new password is the one that signs in now; the old one no longer does.
    expect(await verifyPassword(NEW_PW, storedHash)).toBe(true);
    expect(await verifyPassword(OLD_PW, storedHash)).toBe(false);
  });

  it("OAuth account with no password yet: sets one without a current password", async () => {
    mocks.findUser.mockResolvedValue({ passwordHash: null });
    const res = await post({ newPassword: NEW_PW });
    expect(res.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    const storedHash: string = (mocks.updateUser.mock.calls as any)[0][0].data.passwordHash;
    expect(await verifyPassword(NEW_PW, storedHash)).toBe(true);
  });

  it("rejects a too-short new password before any write", async () => {
    const res = await post({ currentPassword: OLD_PW, newPassword: "short" });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toMatch(/at least 8 characters/i);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
