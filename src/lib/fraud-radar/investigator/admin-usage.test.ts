import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 7 Payload P7-D — admin aggregate usage tests
 * (PHASE7 §3.5): the read model behind the /admin/fraud-radar
 * investigator section. Aggregates only — the module's queries
 * are counts / sums / group-bys plus one date-only read, and
 * this suite pins both the arithmetic (tier rollups, validator
 * fallback rate, model-down events) and the privacy shape:
 * no query this module issues ever selects a text column.
 */

const aggregateMock = vi.fn();
const ledgerGroupByMock = vi.fn();
const messageGroupByMock = vi.fn();
const findManyMock = vi.fn();
const queryLog: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    frInvestigatorUsageLedger: {
      aggregate: (args: unknown) => {
        queryLog.push(args);
        return aggregateMock();
      },
      groupBy: (args: unknown) => {
        queryLog.push(args);
        return ledgerGroupByMock(args);
      },
      findMany: (args: unknown) => {
        queryLog.push(args);
        return findManyMock();
      },
    },
    frInvestigatorMessage: {
      groupBy: (args: unknown) => {
        queryLog.push(args);
        return messageGroupByMock();
      },
    },
  },
}));

import { bucketTurnsByDay, getInvestigatorAdminUsage } from "./admin-usage";

const NOW = new Date("2026-10-31T12:00:00.000Z");

beforeEach(() => {
  queryLog.length = 0;
  aggregateMock.mockReset();
  ledgerGroupByMock.mockReset();
  messageGroupByMock.mockReset();
  findManyMock.mockReset();
  aggregateMock.mockResolvedValue({
    _count: { _all: 10 },
    _sum: { inputTokens: 1000, outputTokens: 400, toolCallCount: 17, estimatedCostUsd: 0.26 },
  });
  ledgerGroupByMock.mockImplementation((args: { by: string[] }) => {
    if (args.by.includes("tier")) {
      return Promise.resolve([
        { tier: "free", status: "charged", _count: { _all: 4 }, _sum: { estimatedCostUsd: 0.04 } },
        { tier: "free", status: "refunded", _count: { _all: 2 }, _sum: { estimatedCostUsd: 0.01 } },
        { tier: "pro", status: "charged", _count: { _all: 3 }, _sum: { estimatedCostUsd: 0.21 } },
        { tier: "pro", status: "failed_free", _count: { _all: 1 }, _sum: { estimatedCostUsd: 0 } },
      ]);
    }
    return Promise.resolve([
      { validatorVerdict: "pass", _count: { _all: 5 } },
      { validatorVerdict: "regenerated", _count: { _all: 1 } },
      { validatorVerdict: "fallback", _count: { _all: 1 } },
      { validatorVerdict: null, _count: { _all: 3 } },
    ]);
  });
  messageGroupByMock.mockResolvedValue([
    { errorCode: "PROVIDER_UNAVAILABLE", _count: { _all: 2 } },
    { errorCode: "SAFETY_BLOCKED", _count: { _all: 1 } },
    { errorCode: null, _count: { _all: 9 } },
  ]);
  findManyMock.mockResolvedValue([
    { createdAt: new Date("2026-10-31T01:00:00.000Z") },
    { createdAt: new Date("2026-10-31T02:00:00.000Z") },
    { createdAt: new Date("2026-10-30T02:00:00.000Z") },
  ]);
});

describe("getInvestigatorAdminUsage — aggregates", () => {
  it("rolls the ledger up into totals, per-tier ops, validator outcomes and error events", async () => {
    const usage = await getInvestigatorAdminUsage(NOW);
    expect(usage.available).toBe(true);
    expect(usage.totals).toEqual({
      turns: 10,
      chargedOps: 7,
      refundedOps: 2,
      failedFreeOps: 1,
      inputTokens: 1000,
      outputTokens: 400,
      toolCalls: 17,
      estimatedCostUsd: 0.26,
    });
    expect(usage.byTier).toEqual([
      { tier: "free", turns: 6, chargedOps: 4, estimatedCostUsd: 0.05 },
      { tier: "pro", turns: 4, chargedOps: 3, estimatedCostUsd: 0.21 },
    ]);
    expect(usage.validator.pass).toBe(5);
    expect(usage.validator.regenerated).toBe(1);
    expect(usage.validator.fallback).toBe(1);
    expect(usage.validator.fallbackRate).toBeCloseTo(1 / 7);
    expect(usage.errorsByCode).toEqual([
      { code: "PROVIDER_UNAVAILABLE", count: 2 },
      { code: "SAFETY_BLOCKED", count: 1 },
    ]);
    // Model-down = not-configured + provider-down + bad key only.
    expect(usage.modelDownEvents).toBe(2);
    const byDay = new Map(usage.turnsByDay.map((d) => [d.day, d.turns]));
    expect(byDay.get("2026-10-31")).toBe(2);
    expect(byDay.get("2026-10-30")).toBe(1);
    expect(usage.turnsByDay).toHaveLength(30);
  });

  it("fails soft to the not-available state when the tables cannot be read", async () => {
    aggregateMock.mockRejectedValue(new Error("table does not exist"));
    const usage = await getInvestigatorAdminUsage(NOW);
    expect(usage.available).toBe(false);
    expect(usage.totals.turns).toBe(0);
    expect(usage.validator.fallbackRate).toBeNull();
  });

  it("never selects a text column — aggregates and dates only (§3.5)", async () => {
    await getInvestigatorAdminUsage(NOW);
    const serialized = JSON.stringify(queryLog);
    expect(serialized).not.toContain("content");
    expect(serialized).not.toContain("title");
    // The only findMany in the module reads creation dates alone.
    const findManyArgs = queryLog.find(
      (a) => a !== null && typeof a === "object" && "select" in (a as object),
    ) as { select: Record<string, unknown> } | undefined;
    expect(findManyArgs?.select).toEqual({ createdAt: true });
    // And the module source carries no message-text access at all.
    const src = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "admin-usage.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/content\s*:/);
    expect(src).not.toContain("listMessages");
  });
});

describe("bucketTurnsByDay", () => {
  it("buckets instants into a fixed 30-day UTC window ending today", () => {
    const rows = bucketTurnsByDay(
      [
        new Date("2026-10-31T23:59:00.000Z"),
        new Date("2026-10-02T00:01:00.000Z"),
        new Date("2026-09-01T00:01:00.000Z"), // outside the window
      ],
      NOW,
    );
    expect(rows).toHaveLength(30);
    expect(rows[29]).toEqual({ day: "2026-10-31", turns: 1 });
    expect(rows[0]).toEqual({ day: "2026-10-02", turns: 1 });
    expect(rows.reduce((s, r) => s + r.turns, 0)).toBe(2);
  });
});
