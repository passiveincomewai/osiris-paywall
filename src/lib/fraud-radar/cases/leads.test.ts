import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  canonicalJson,
  captureLead,
  pinCandidateLeadAsAdmin,
  pinInvestigatorLead,
  pinLead,
  snapshotSha256,
  LeadCaptureError,
  type LeadCaptureDeps,
} from "./leads";
import { createInMemoryCaseStore, type CaseStore } from "./store";
import { CANDIDATE_STATUS } from "../signals-data";

/**
 * Phase 8 — lead capture (PHASE8 §1.3, §5.4.2): server-side
 * capture integrity (the stored snapshot IS the data-layer
 * record, hash-verifiable), snapshot immutability across a
 * dataset refresh (a re-pin creates a SECOND vintage row),
 * coalescing, S-06 confinement (public path refuses; the admin
 * queue path works and keeps the candidate status verbatim),
 * and the investigator pin's ownership check. The data layers
 * are fixture deps — the real functions have their own suites.
 */

const NPI = "1234567890";

function signalRecord(overrides: Record<string, unknown> = {}) {
  return {
    entityKey: NPI,
    entityKeyType: "NPI",
    code: "H-01",
    codeKind: "rule" as const,
    recordClass: null,
    recordKey: null,
    ruleLibraryVersion: "1.1.0",
    lead: true,
    status: "lead",
    measureName: "paid per provider",
    measureValue: 42000,
    peerGroupDefinition: "same specialty + state",
    peerGroupKey: "spec:ST",
    peerRung: "specialty-state",
    peerN: 120,
    peerMedian: 20000,
    peerP90: 38000,
    peerP99: 60000,
    percentileBand: "p90-p99",
    percentileWithinPeerGroup: 95,
    ratioToPeerMedian: 2.1,
    robustDistanceFromPeerMedian: 3.4,
    inputVersions: "2026-02-09",
    computedAt: "2026-10-06",
    caveatCodes: ["DERIVED_TOTALS"],
    detail: null,
    sourceTable: "signals",
    ...overrides,
  };
}

function candidateRecord() {
  return signalRecord({
    code: "S-06",
    codeKind: "record" as const,
    recordClass: "name-candidate",
    lead: false,
    status: CANDIDATE_STATUS,
  });
}

function profileFixture(paid: number) {
  return {
    npi: NPI,
    stub: null,
    summary: { paidExclOutliersUsd: paid },
    identity: { displayName: "Fixture Provider LLC" },
    hcpcs: [],
    leie: [],
    monthly: null,
  };
}

/** Mutable fixture world — the "dataset refresh" swaps profileV. */
function fixtureDeps(state: { profilePaid: number; version: string }): LeadCaptureDeps {
  const cast = <T,>(fn: T) => fn as never;
  return {
    getProviderProfile: cast(async () => profileFixture(state.profilePaid)),
    getDatasetMeta: cast(async () => ({ dataset: "medicaid-provider-aggregates", version: state.version })),
    getCareProviderProfile: cast(async () => null),
    getCareDatasetMeta: cast(async () => null),
    getGrantRecipientProfile: cast(async () => null),
    getGrantsDatasetMeta: cast(async () => null),
    getEntitySignals: cast(async () => ({
      entityKey: NPI,
      entityKeyType: "NPI",
      engine: "healthcare",
      leads: [signalRecord()],
      screeningRecords: [
        signalRecord({ code: "S-01", codeKind: "record", lead: false, status: "listed" }),
      ],
    })),
    getAdminCandidateQueue: cast(async () => ({
      version: state.version,
      recordCode: "S-06",
      recordClass: "name-candidate",
      statusConstant: CANDIDATE_STATUS,
      surface: "admin",
      count: 1,
      records: [candidateRecord()],
    })),
    getSignalsDatasetMeta: cast(async () => ({ version: state.version })),
  };
}

async function newCase(store: CaseStore): Promise<string> {
  const c = await store.createCase({ ownerId: "user-a", title: "Matter" });
  return c.id;
}

describe("canonical serialisation + hash", () => {
  it("is key-order independent and matches an independent sha256", () => {
    const a = { b: 1, a: { d: [1, 2], c: "x" } };
    const b = { a: { c: "x", d: [1, 2] }, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    const expected = createHash("sha256").update(canonicalJson(a), "utf8").digest("hex");
    expect(snapshotSha256(a)).toBe(expected);
    expect(snapshotSha256(a)).not.toBe(snapshotSha256({ ...a, b: 2 }));
  });
});

describe("capture integrity (§5.4.2)", () => {
  it("an entity pin stores the data-layer record verbatim, hash-verifiable", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "2026-02-09" });
    const { lead, created } = await pinLead(
      store,
      { caseId, pinnedById: "user-a", input: { kind: "entity", engine: "healthcare", entityKey: NPI } },
      deps,
    );
    expect(created).toBe(true);
    expect(lead.entityKey).toBe(`NPI:${NPI}`);
    expect(lead.entityLabel).toBe("Fixture Provider LLC");
    expect(lead.sourceDataset).toBe("medicaid-provider-aggregates");
    expect(lead.sourceDatasetVersion).toBe("2026-02-09");
    const snapshot = lead.snapshot as { data: { profile: unknown } };
    expect(snapshot.data.profile).toEqual(profileFixture(1000));
    // The stored hash re-computes from the stored snapshot.
    expect(snapshotSha256(lead.snapshot)).toBe(lead.snapshotSha256);
  });

  it("a signal pin stores the full provenance block as published", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "v-signals-1" });
    const { lead } = await pinLead(
      store,
      {
        caseId,
        pinnedById: "user-a",
        input: { kind: "signal", engine: "healthcare", entityKey: `NPI:${NPI}`, ruleCode: "H-01" },
      },
      deps,
    );
    expect(lead.kind).toBe("signal");
    expect(lead.ruleCode).toBe("H-01");
    const snapshot = lead.snapshot as { data: Record<string, unknown> };
    expect(snapshot.data).toEqual(signalRecord());
    expect(snapshot.data.peerMedian).toBe(20000);
    expect(snapshot.data.ruleLibraryVersion).toBe("1.1.0");
    expect(lead.sourceDataset).toBe("research-signals");
  });

  it("a screening pin reads the screening block, never the leads block", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "v1" });
    const { lead } = await pinLead(
      store,
      {
        caseId,
        pinnedById: "user-a",
        input: { kind: "screening", engine: "cross", entityKey: NPI, ruleCode: "S-01" },
      },
      deps,
    );
    expect(lead.kind).toBe("screening");
    expect((lead.snapshot as { data: { code: string } }).data.code).toBe("S-01");
  });

  it("an unpublished entity is an honest lead_not_found, not a fabricated pin", async () => {
    const deps = fixtureDeps({ profilePaid: 1000, version: "v1" });
    deps.getProviderProfile = (async () => null) as never;
    await expect(
      captureLead({ kind: "entity", engine: "healthcare", entityKey: NPI }, deps),
    ).rejects.toMatchObject({ code: "lead_not_found" });
  });
});

describe("snapshot immutability (§1.3 rule 1, §5.4.2)", () => {
  it("a dataset refresh re-pin creates a SECOND vintage row; the first never changes", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const state = { profilePaid: 1000, version: "2026-02-09" };
    const deps = fixtureDeps(state);
    const input = { kind: "entity", engine: "healthcare", entityKey: NPI };

    const first = await pinLead(store, { caseId, pinnedById: "user-a", input }, deps);
    const firstSnapshotJson = canonicalJson(first.lead.snapshot);
    const firstSha = first.lead.snapshotSha256;

    // The dataset refreshes: new figures, new version.
    state.profilePaid = 2500;
    state.version = "2026-03-01";
    const second = await pinLead(store, { caseId, pinnedById: "user-a", input }, deps);
    expect(second.created).toBe(true);
    expect(second.lead.id).not.toBe(first.lead.id);
    expect(second.lead.snapshotSha256).not.toBe(firstSha);
    expect(second.lead.sourceDatasetVersion).toBe("2026-03-01");

    // Both vintages sit in the case; the first is byte-identical.
    const leads = await store.listLeads(caseId);
    expect(leads).toHaveLength(2);
    const original = leads.find((l) => l.id === first.lead.id)!;
    expect(canonicalJson(original.snapshot)).toBe(firstSnapshotJson);
    expect(original.snapshotSha256).toBe(firstSha);
    expect(snapshotSha256(original.snapshot)).toBe(firstSha);
  });

  it("re-pinning the identical snapshot coalesces to the same row", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "2026-02-09" });
    const input = { kind: "entity", engine: "healthcare", entityKey: NPI };
    const first = await pinLead(store, { caseId, pinnedById: "user-a", input }, deps);
    const again = await pinLead(store, { caseId, pinnedById: "user-a", input }, deps);
    expect(again.created).toBe(false);
    expect(again.lead.id).toBe(first.lead.id);
    expect(await store.listLeads(caseId)).toHaveLength(1);
  });

  it("the store exposes no snapshot update: annotation is the only lead write", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "2026-02-09" });
    const { lead } = await pinLead(
      store,
      { caseId, pinnedById: "user-a", input: { kind: "entity", engine: "healthcare", entityKey: NPI } },
      deps,
    );
    const annotated = await store.updateLeadAnnotation(caseId, lead.id, "per the referral");
    expect(annotated?.annotation).toBe("per the referral");
    expect(annotated?.snapshotSha256).toBe(lead.snapshotSha256);
    expect(canonicalJson(annotated?.snapshot)).toBe(canonicalJson(lead.snapshot));
    // No generic lead-update exists on the store surface at all.
    expect((store as unknown as Record<string, unknown>).updateLead).toBeUndefined();
  });
});

describe("S-06 confinement (§1.3 rule 4)", () => {
  it("the public capture path refuses candidate pairs in every guise", async () => {
    const deps = fixtureDeps({ profilePaid: 1000, version: "v1" });
    await expect(
      captureLead({ kind: "candidate", engine: "cross", entityKey: NPI, ruleCode: "S-06" }, deps),
    ).rejects.toMatchObject({ code: "candidate_admin_only" });
    await expect(
      captureLead({ kind: "screening", engine: "cross", entityKey: NPI, ruleCode: "S-06" }, deps),
    ).rejects.toMatchObject({ code: "candidate_admin_only" });
    // Even a signal-kind request cannot reach one: the data
    // layer filters S-06 out of public reads, so it is not found.
    await expect(
      captureLead({ kind: "signal", engine: "cross", entityKey: NPI, ruleCode: "S-06" }, deps),
    ).rejects.toBeInstanceOf(LeadCaptureError);
  });

  it("the admin path refuses non-admins and works for admins, status verbatim", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const deps = fixtureDeps({ profilePaid: 1000, version: "v1" });
    await expect(
      pinCandidateLeadAsAdmin(
        store,
        { caseId, pinnedById: "user-a", isAdmin: false, engine: "cross", entityKey: NPI },
        deps,
      ),
    ).rejects.toMatchObject({ code: "candidate_admin_only" });

    const { lead } = await pinCandidateLeadAsAdmin(
      store,
      { caseId, pinnedById: "admin-1", isAdmin: true, engine: "cross", entityKey: NPI },
      deps,
    );
    expect(lead.kind).toBe("candidate");
    expect(lead.ruleCode).toBe("S-06");
    const snapshot = lead.snapshot as {
      data: { record: { status: string }; statusConstant: string };
    };
    // Pinning never upgrades a candidate into a lead.
    expect(snapshot.data.record.status).toBe(CANDIDATE_STATUS);
    expect(snapshot.data.statusConstant).toBe(CANDIDATE_STATUS);
  });
});

describe("investigator pins (§1.3 rule 5)", () => {
  const invDeps = {
    async getConversation(userId: string, id: string) {
      return userId === "user-a" && id === "conv-1" ? { id, title: "Research chat" } : null;
    },
    async getMessage(id: string) {
      if (id === "msg-1") {
        return {
          id,
          conversationId: "conv-1",
          role: "assistant",
          content: "The registry lists the published sources.",
          toolCalls: [],
          model: "gemini-2.0-flash",
          promptVersion: "1.0.0",
          validatorVerdict: "pass",
        };
      }
      return null;
    },
  };

  it("pins the persisted message, read server-side, with its citation record", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    const { lead } = await pinInvestigatorLead(
      store,
      { caseId, pinnedById: "user-a", conversationId: "conv-1", messageId: "msg-1" },
      invDeps,
    );
    expect(lead.kind).toBe("investigator");
    const snapshot = lead.snapshot as { data: { content: string; validatorVerdict: string } };
    expect(snapshot.data.content).toBe("The registry lists the published sources.");
    expect(snapshot.data.validatorVerdict).toBe("pass");
    expect(snapshotSha256(lead.snapshot)).toBe(lead.snapshotSha256);
  });

  it("a foreign conversation reads as not found — existence is not leaked", async () => {
    const store = createInMemoryCaseStore();
    const caseId = await newCase(store);
    await expect(
      pinInvestigatorLead(
        store,
        { caseId, pinnedById: "user-b", conversationId: "conv-1", messageId: "msg-1" },
        invDeps,
      ),
    ).rejects.toMatchObject({ code: "lead_not_found" });
  });
});
