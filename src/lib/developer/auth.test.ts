// Auth pins: the public door takes scope "public" keys only, counts
// each accepted request against the key's UTC-day quota window, and
// never counts (or blocks on quota for) the usage check itself.
import { describe, it, expect, vi, beforeEach } from "vitest";

interface KeyRow {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scope: string;
  hits: number;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  rateWindowStart: Date | null;
  rateWindowCount: number;
  createdAt: Date;
}

const mocks = vi.hoisted(() => ({
  findKey: vi.fn(async () => null as KeyRow | null),
  updateKey: vi.fn(async (_args: unknown) => ({})),
  findSub: vi.fn(async () => null as null | {
    status: string;
    currentPeriodEnd: Date;
    stripePriceId: string;
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    enterpriseApiKey: { findUnique: mocks.findKey, update: mocks.updateKey },
    subscription: { findUnique: mocks.findSub },
  },
}));

import { authenticateApiKey, utcDayStart } from "./auth";
import { generateApiKey, hashSecret } from "@/lib/enterprise/tokens";
import { API_TIER_LIMITS } from "./limits";

const FREE_DAILY = API_TIER_LIMITS.free.dailyRequests;

function makeKeyRow(overrides: Partial<KeyRow> = {}): { row: KeyRow; plaintext: string } {
  const { key, prefix } = generateApiKey();
  return {
    plaintext: key,
    row: {
      id: `key-${Math.random().toString(36).slice(2, 10)}`,
      userId: "user-1",
      name: "Test key",
      keyPrefix: prefix,
      keyHash: hashSecret(key),
      scope: "public",
      hits: 0,
      lastUsedAt: null,
      revokedAt: null,
      rateWindowStart: null,
      rateWindowCount: 0,
      createdAt: new Date(),
      ...overrides,
    },
  };
}

function reqWith(key?: string): Request {
  return new Request("https://worldeye.app/api/v1/cameras", {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findKey.mockResolvedValue(null);
  mocks.updateKey.mockResolvedValue({});
  mocks.findSub.mockResolvedValue(null); // no subscription → free tier
});

describe("authenticateApiKey", () => {
  it("401s when no key is presented", async () => {
    const result = await authenticateApiKey(reqWith());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("api_key_required");
    }
  });

  it("401s for an unknown key", async () => {
    const result = await authenticateApiKey(reqWith("wek_unknown_key_value"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("api_key_invalid");
  });

  it("401s for a revoked key", async () => {
    const { row, plaintext } = makeKeyRow({ revokedAt: new Date() });
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("api_key_invalid");
  });

  it("403s an enterprise-scope key at the public door", async () => {
    const { row, plaintext } = makeKeyRow({ scope: "enterprise" });
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("wrong_key_scope");
    }
    expect(mocks.updateKey).not.toHaveBeenCalled();
  });

  it("accepts a public key and counts the request in today's window", async () => {
    const { row, plaintext } = makeKeyRow();
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.tier).toBe("free");
      expect(result.auth.usedToday).toBe(1);
      expect(result.auth.remainingToday).toBe(FREE_DAILY - 1);
    }
    expect(mocks.updateKey).toHaveBeenCalledTimes(1);
    const arg = mocks.updateKey.mock.calls[0][0] as unknown as {
      data: { rateWindowCount: number; rateWindowStart: Date };
    };
    expect(arg.data.rateWindowCount).toBe(1);
    expect(arg.data.rateWindowStart.getTime()).toBe(utcDayStart(new Date()).getTime());
  });

  it("429s when the daily quota is used up, without counting", async () => {
    const { row, plaintext } = makeKeyRow({
      rateWindowStart: utcDayStart(new Date()),
      rateWindowCount: FREE_DAILY,
    });
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.code).toBe("daily_quota_exceeded");
    }
    expect(mocks.updateKey).not.toHaveBeenCalled();
  });

  it("treats a stale (yesterday) window as a fresh day", async () => {
    const yesterday = new Date(utcDayStart(new Date()).getTime() - 86_400_000);
    const { row, plaintext } = makeKeyRow({
      rateWindowStart: yesterday,
      rateWindowCount: FREE_DAILY,
    });
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.auth.usedToday).toBe(1);
  });

  it("the usage check (countRequest: false) neither counts nor quota-blocks", async () => {
    const { row, plaintext } = makeKeyRow({
      rateWindowStart: utcDayStart(new Date()),
      rateWindowCount: FREE_DAILY,
    });
    mocks.findKey.mockResolvedValue(row);
    const result = await authenticateApiKey(reqWith(plaintext), { countRequest: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.usedToday).toBe(FREE_DAILY);
      expect(result.auth.remainingToday).toBe(0);
    }
    expect(mocks.updateKey).not.toHaveBeenCalled();
  });
});
