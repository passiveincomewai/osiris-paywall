import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Admin preview access (2026-11-10): while FRAUD_RADAR_ENABLED is off,
 * the Fraud Radar gates admit a signed-in admin — the same
 * ADMIN_EMAILS allowlist that gates /admin — so the owner can test
 * before launch, and nobody else. Every gate composes:
 *
 *   fraudRadarEnabled() || (await fraudRadarAdminPreview())
 *
 * These tests pin both legs of that expression: the flag leg is the
 * pre-existing kill switch (also pinned in flag.test.ts); the preview
 * leg is this payload. Auth and the allowlist are mocked, following
 * the /admin/fraud-radar page-test pattern.
 */
const authMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/affiliate/admin", () => ({
  adminEmails: () => ["admin@example.com", "owner@example.com"],
}));

import { fraudRadarEnabled } from "./flag";
import { fraudRadarAdminPreview } from "./access";

/** The gate expression every Fraud Radar page/route evaluates. */
async function gateAllows(): Promise<boolean> {
  return fraudRadarEnabled() || (await fraudRadarAdminPreview());
}

beforeEach(() => {
  authMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fraud radar gate — flag on", () => {
  it("allows everyone, signed in or not (today's behaviour, unchanged)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    authMock.mockResolvedValue(null);
    expect(await gateAllows()).toBe(true);
  });

  it("the preview leg stays out of the way while the flag is on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });
    expect(await fraudRadarAdminPreview()).toBe(false);
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe("fraud radar gate — flag off (dark, preview mode)", () => {
  beforeEach(() => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
  });

  it("allows a signed-in admin", async () => {
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });
    expect(await gateAllows()).toBe(true);
  });

  it("allows an admin regardless of email case", async () => {
    authMock.mockResolvedValue({ user: { email: "Owner@Example.COM" } });
    expect(await gateAllows()).toBe(true);
  });

  it("denies a signed-in non-admin", async () => {
    authMock.mockResolvedValue({ user: { email: "someone@example.com" } });
    expect(await gateAllows()).toBe(false);
  });

  it("denies a signed-out visitor", async () => {
    authMock.mockResolvedValue(null);
    expect(await gateAllows()).toBe(false);
  });

  it("denies when the session cannot be read (fail-closed)", async () => {
    authMock.mockRejectedValue(new Error("no request context"));
    expect(await gateAllows()).toBe(false);
  });
});
