// Route tests for GET /api/auth/change-email/confirm.
// Pins the security-critical half of the flow:
//  - a valid, unexpired token moves User.email to the pending address,
//    stamps emailVerified (the confirmation IS the verification),
//    consumes the token, and emails a security notice to the OLD
//    address — landing on /settings?emailChange=done;
//  - expired tokens land on emailChange=expired and write nothing;
//  - unknown / mismatched / foreign-flow tokens land on
//    emailChange=invalid;
//  - an address registered by someone else while the link sat in the
//    inbox lands on emailChange=taken and the account is untouched.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(
    async (_arg: { where: { id?: string; email?: string } }) => null as unknown,
  ),
  userUpdate: vi.fn(async (_arg: unknown) => ({})),
  tokenFindUnique: vi.fn(async () => null as unknown),
  tokenDelete: vi.fn(async () => ({})),
  tokenDeleteMany: vi.fn(async () => ({})),
  transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  sendEmail: vi.fn(async (_to: string, _subject: string, _html: string) => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    verificationToken: {
      findUnique: mocks.tokenFindUnique,
      delete: mocks.tokenDelete,
      deleteMany: mocks.tokenDeleteMany,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  emailConfigured: () => true,
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));

import { GET } from "./route";
import { changeEmailIdentifier } from "../token";

const TOKEN = "a".repeat(64);
const NEW = "new@example.com";
const OLD = "old@example.com";

const row = (over: Record<string, unknown> = {}) => ({
  identifier: changeEmailIdentifier("user-1", NEW),
  token: TOKEN,
  expires: new Date(Date.now() + 3600 * 1000),
  ...over,
});

const get = (qs: string) =>
  GET(new Request(`http://localhost/api/auth/change-email/confirm?${qs}`));
const confirmQs = `token=${TOKEN}&email=${encodeURIComponent(NEW)}`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tokenFindUnique.mockResolvedValue(row());
  mocks.userFindUnique.mockImplementation(async (arg: { where: { id?: string; email?: string } }) => {
    if (arg.where.id) {
      return arg.where.id === "user-1" ? { id: "user-1", email: OLD, name: "Ada" } : null;
    }
    return null; // nobody owns the new address
  });
  mocks.sendEmail.mockResolvedValue(true);
});

describe("GET /api/auth/change-email/confirm", () => {
  it("happy path: applies the change, verifies the address, notifies the old inbox", async () => {
    const res = await get(confirmQs);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=done");

    expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
    const upd = mocks.userUpdate.mock.calls[0]![0] as {
      where: { id: string };
      data: { email: string; emailVerified: Date };
    };
    expect(upd.where).toEqual({ id: "user-1" });
    expect(upd.data.email).toBe(NEW);
    expect(upd.data.emailVerified).toBeInstanceOf(Date);

    // Token consumed inside the same transaction as the update.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tokenDelete).toHaveBeenCalledWith({ where: { token: TOKEN } });

    // Security notice goes to the OLD address, naming the new one.
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = mocks.sendEmail.mock.calls[0]!;
    expect(to).toBe(OLD);
    expect(subject).toContain("email was changed");
    expect(html).toContain(NEW);
    expect(html).toContain("passiveincomewai@gmail.com");
  });

  it("expired token: lands on expired, writes nothing, token cleaned up", async () => {
    mocks.tokenFindUnique.mockResolvedValue(row({ expires: new Date(Date.now() - 1000) }));
    const res = await get(confirmQs);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=expired");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.tokenDelete).toHaveBeenCalledWith({ where: { token: TOKEN } });
  });

  it("unknown token: lands on invalid", async () => {
    mocks.tokenFindUnique.mockResolvedValue(null);
    const res = await get(confirmQs);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=invalid");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("email param doesn't match the pending change: lands on invalid", async () => {
    const res = await get(`token=${TOKEN}&email=${encodeURIComponent("other@example.com")}`);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=invalid");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("a token from another flow (signup verify) is not honored", async () => {
    mocks.tokenFindUnique.mockResolvedValue(row({ identifier: `verify-email:${NEW}` }));
    const res = await get(confirmQs);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=invalid");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("address taken while the link sat in the inbox: lands on taken, account untouched", async () => {
    mocks.userFindUnique.mockImplementation(async (arg: { where: { id?: string; email?: string } }) => {
      if (arg.where.id) return { id: "user-1", email: OLD, name: "Ada" };
      if (arg.where.email === NEW) return { id: "someone-else" };
      return null;
    });
    const res = await get(confirmQs);
    expect(res.headers.get("location")).toBe("https://worldeye.app/settings?emailChange=taken");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.tokenDelete).toHaveBeenCalledWith({ where: { token: TOKEN } });
  });
});
