import { describe, it, expect } from "vitest";
import {
  createInMemoryCaseStore,
  type CaseStore,
} from "../cases/store";
import { snapshotSha256, type CapturedLead } from "../cases/leads";
import {
  capturePinSet,
  verifyPinSetIntegrity,
  validatePinSetForTemplate,
  diffPinSets,
  PinError,
  type PinCaptureDeps,
  type PinSet,
} from "./pins";
import { createInMemoryReportStore } from "./store";
import {
  createReportForUser,
  createVersionForUser,
  buildDraft,
  ReportInputError,
} from "./reports";
import { getReportTemplate } from "./templates";
import { FRAUD_RADAR_SOURCES } from "../sources";

/**
 * Phase 9 Payload A — pin capture + immutability tests
 * (PHASE9 §2.1, §2.3, §7.3.2). Pins cite Phase 8's immutable
 * records by their stored hashes verbatim; a version created
 * from a pin set does not move when the source case is later
 * edited or a dataset refreshes — the change is visible only
 * to a NEW version, whose pin-diff names it.
 */

const OWNER = "user_owner";
const OTHER = "user_other";

async function fixtureCase(store: CaseStore) {
  const caseRow = await store.createCase({
    ownerId: OWNER,
    title: "Fixture case",
    summary: "Original summary",
  });
  const snapshot = {
    tool: "case_lead_capture",
    dataset: "research-signals",
    datasetVersion: "2026-02-09",
    grainKey: "NPI:1234567890",
    sourceVintages: [{ source: "research-signals", version: "2026-02-09" }],
    caveats: [],
    truncated: false,
    data: { code: "S-01", measure: 42 },
  };
  const lead = await store.createLead({
    caseId: caseRow.id,
    kind: "signal",
    engine: "healthcare",
    entityKey: "NPI:1234567890",
    entityLabel: "Fixture Provider",
    snapshot,
    snapshotSha256: snapshotSha256(snapshot),
    sourceDataset: "research-signals",
    sourceDatasetVersion: "2026-02-09",
    ruleCode: "S-01",
    pinnedById: OWNER,
  });
  const evidence = await store.createEvidence({
    caseId: caseRow.id,
    kind: "upload",
    title: "Fixture document",
    sha256: "a".repeat(64),
    sizeBytes: BigInt(1234),
    uploadedById: OWNER,
  });
  const unhashed = await store.createEvidence({
    caseId: caseRow.id,
    kind: "upload",
    title: "Unhashed document",
    uploadedById: OWNER,
  });
  const claim = await store.createClaim({
    caseId: caseRow.id,
    statement: "Fixture Recipient received $2,100,000 in awards.",
    subjectEngine: "grants",
    subjectEntityKey: "UEI:FIXTURE",
    createdById: OWNER,
  });
  const verification = await store.createVerification({
    claimId: claim.id,
    verdict: "supported",
    evidence: { figures: [] },
    summary: "The figures match the published corpus.",
    validatorVerdict: "pass",
    corpusVersions: { "grants-aggregates": "2026-10-06" },
    checkerVersion: "1.0.0",
    createdById: OWNER,
  });
  return { caseRow, lead, evidence, unhashed, claim, verification };
}

const entityDeps: PinCaptureDeps = {
  captureEntity: async (input): Promise<CapturedLead> => {
    const snapshot = {
      tool: "case_lead_capture",
      dataset: "grants-aggregates",
      datasetVersion: "2026-10-06",
      grainKey: "UEI:FIXTURE",
      sourceVintages: [{ source: "grants-aggregates", version: "2026-10-06" }],
      caveats: [],
      truncated: false,
      data: { profile: { identity: { recipientName: "Fixture Recipient" } } },
    };
    return {
      kind: "entity",
      engine: input.engine,
      entityKey: "UEI:FIXTURE",
      entityLabel: "Fixture Recipient",
      snapshot: snapshot as CapturedLead["snapshot"],
      snapshotSha256: snapshotSha256(snapshot),
      sourceDataset: "grants-aggregates",
      sourceDatasetVersion: "2026-10-06",
      ruleCode: null,
    };
  },
};

describe("pin capture (§2.1)", () => {
  it("captures a case pin whose snapshot hash covers the frozen snapshot, citing Phase 8 hashes verbatim", async () => {
    const store = createInMemoryCaseStore();
    const fx = await fixtureCase(store);
    const pinSet = await capturePinSet(store, {
      ownerId: OWNER,
      request: {
        caseId: fx.caseRow.id,
        evidenceIds: [fx.evidence.id],
        verificationIds: [{ claimId: fx.claim.id, verificationId: fx.verification.id }],
      },
    });
    expect(pinSet.case?.caseId).toBe(fx.caseRow.id);
    expect(pinSet.case?.caseSnapshotSha256).toMatch(/^[0-9a-f]{64}$/);
    // The lead pin cites the Phase 8 stored hash — never a re-hash.
    expect(pinSet.leads).toEqual([
      {
        leadId: fx.lead.id,
        caseId: fx.caseRow.id,
        kind: "signal",
        snapshotSha256: fx.lead.snapshotSha256,
      },
    ]);
    expect(pinSet.evidence).toEqual([
      { evidenceId: fx.evidence.id, caseId: fx.caseRow.id, sha256: "a".repeat(64) },
    ]);
    expect(pinSet.verifications[0].verificationId).toBe(fx.verification.id);
    expect(pinSet.datasets).toEqual(
      expect.arrayContaining([
        { slug: "research-signals", version: "2026-02-09" },
        { slug: "grants-aggregates", version: "2026-10-06" },
      ]),
    );
    expect(pinSet.signalsVersion).toBe("2026-02-09");
    await expect(verifyPinSetIntegrity(store, pinSet)).resolves.toEqual({ ok: true });
  });

  it("refuses a foreign case, a foreign child id, and unhashed evidence", async () => {
    const store = createInMemoryCaseStore();
    const fx = await fixtureCase(store);
    const otherCase = await store.createCase({ ownerId: OTHER, title: "Foreign" });
    await expect(
      capturePinSet(store, { ownerId: OWNER, request: { caseId: otherCase.id } }),
    ).rejects.toMatchObject({ code: "pin_not_found" });
    await expect(
      capturePinSet(store, {
        ownerId: OWNER,
        request: { caseId: fx.caseRow.id, leadIds: ["lead_missing"] },
      }),
    ).rejects.toMatchObject({ code: "pin_not_found" });
    await expect(
      capturePinSet(store, {
        ownerId: OWNER,
        request: { caseId: fx.caseRow.id, evidenceIds: [fx.unhashed.id] },
      }),
    ).rejects.toMatchObject({ code: "evidence_not_hashed" });
    await expect(
      capturePinSet(store, { ownerId: OWNER, request: { leadIds: [fx.lead.id] } }),
    ).rejects.toMatchObject({ code: "case_required" });
  });

  it("captures entity pins through the data-layer capture and dataset pins from the registry", async () => {
    const store = createInMemoryCaseStore();
    const withVersion = FRAUD_RADAR_SOURCES.find((s) => s.sourceVersion);
    expect(withVersion).toBeDefined();
    const pinSet = await capturePinSet(
      store,
      {
        ownerId: OWNER,
        request: {
          entityPins: [{ engine: "grants", entityKey: "FIXTURE" }],
          datasetSlugs: [withVersion!.slug],
        },
      },
      entityDeps,
    );
    expect(pinSet.entities[0].entityKey).toBe("UEI:FIXTURE");
    expect(pinSet.entities[0].capturedSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pinSet.datasets).toEqual(
      expect.arrayContaining([
        { slug: "grants-aggregates", version: "2026-10-06" },
        { slug: withVersion!.slug, version: withVersion!.sourceVersion },
      ]),
    );
    await expect(verifyPinSetIntegrity(store, pinSet)).resolves.toEqual({ ok: true });
    await expect(
      capturePinSet(store, {
        ownerId: OWNER,
        request: { datasetSlugs: ["no-such-source"] },
      }),
    ).rejects.toBeInstanceOf(PinError);
  });

  it("integrity verification fails closed on a tampered pin", async () => {
    const store = createInMemoryCaseStore();
    const fx = await fixtureCase(store);
    const pinSet = await capturePinSet(store, {
      ownerId: OWNER,
      request: { caseId: fx.caseRow.id },
    });
    const tamperedLead: PinSet = JSON.parse(JSON.stringify(pinSet));
    tamperedLead.leads[0].snapshotSha256 = "b".repeat(64);
    const res = await verifyPinSetIntegrity(store, tamperedLead);
    expect(res.ok).toBe(false);
    const tamperedCase: PinSet = JSON.parse(JSON.stringify(pinSet));
    (tamperedCase.case!.snapshot as { case: { title: string } }).case.title = "Edited";
    const res2 = await verifyPinSetIntegrity(store, tamperedCase);
    expect(res2.ok).toBe(false);
  });
});

describe("template conformance (§1.2)", () => {
  it("template B requires the case pin; template D requires a signal-kind lead pin", async () => {
    const store = createInMemoryCaseStore();
    const fx = await fixtureCase(store);
    const casePins = await capturePinSet(store, {
      ownerId: OWNER,
      request: { caseId: fx.caseRow.id },
    });
    expect(validatePinSetForTemplate(getReportTemplate("B")!, casePins)).toEqual([]);
    const entityOnly = await capturePinSet(
      store,
      { ownerId: OWNER, request: { entityPins: [{ engine: "grants", entityKey: "FIXTURE" }] } },
      entityDeps,
    );
    expect(
      validatePinSetForTemplate(getReportTemplate("B")!, entityOnly).length,
    ).toBeGreaterThan(0);
    // D: entity + the fixture's signal lead satisfies it; a
    // screening-kind pin does not.
    const dPins: PinSet = {
      ...entityOnly,
      leads: casePins.leads,
    };
    expect(validatePinSetForTemplate(getReportTemplate("D")!, dPins)).toEqual([]);
    const screeningPins: PinSet = {
      ...dPins,
      leads: [{ ...casePins.leads[0], kind: "screening" }],
    };
    const screeningErrors = validatePinSetForTemplate(
      getReportTemplate("D")!,
      screeningPins,
    );
    expect(screeningErrors.some((e) => e.includes("kind signal"))).toBe(true);
    void fx;
  });
});

describe("version immutability (§2.3 / §7.3.2)", () => {
  it("mutating the source case after pinning never reaches the stored version; a new version names the change", async () => {
    const caseStore = createInMemoryCaseStore();
    const reportStore = createInMemoryReportStore();
    const fx = await fixtureCase(caseStore);
    const report = await createReportForUser(reportStore, {
      ownerId: OWNER,
      templateId: "B",
      title: "Case report",
      caseId: fx.caseRow.id,
      entitlements: null,
    });
    const { version: v1 } = await createVersionForUser(reportStore, caseStore, {
      reportRow: report,
      actorId: OWNER,
      request: { caseId: fx.caseRow.id, evidenceIds: [fx.evidence.id] },
      entitlements: null,
    });
    const frozen = JSON.stringify(v1.pinSet);

    // Mutate the source: edit the case, pin a second lead.
    await caseStore.updateCase(fx.caseRow.id, { summary: "Edited after pinning" });
    const snap2 = {
      ...(fx.lead.snapshot as Record<string, unknown>),
      data: { code: "S-02", measure: 7 },
    };
    await caseStore.createLead({
      caseId: fx.caseRow.id,
      kind: "signal",
      engine: "healthcare",
      entityKey: "NPI:1234567890",
      entityLabel: "Fixture Provider",
      snapshot: snap2,
      snapshotSha256: snapshotSha256(snap2),
      sourceDataset: "research-signals",
      sourceDatasetVersion: "2026-03-01",
      ruleCode: "S-02",
      pinnedById: OWNER,
    });

    const reread = await reportStore.getVersion(report.id, v1.id);
    expect(JSON.stringify(reread!.pinSet)).toBe(frozen);
    expect(reread!.versionNo).toBe(1);

    const { version: v2, pinDiff } = await createVersionForUser(reportStore, caseStore, {
      reportRow: report,
      actorId: OWNER,
      request: { caseId: fx.caseRow.id, evidenceIds: [fx.evidence.id] },
      entitlements: null,
    });
    expect(v2.versionNo).toBe(2);
    expect(pinDiff.caseChanged).toBe(true);
    expect(pinDiff.leadsAdded.length).toBe(1);
    expect(pinDiff.datasetVersionChanges).toEqual(
      expect.arrayContaining([
        { slug: "research-signals", from: "2026-02-09", to: "2026-03-01" },
      ]),
    );
    // v1 still frozen after v2 exists.
    const reread1 = await reportStore.getVersion(report.id, v1.id);
    expect(JSON.stringify(reread1!.pinSet)).toBe(frozen);
  });

  it("the store exposes no pin/composition mutation path, and generation completion writes once", async () => {
    const reportStore = createInMemoryReportStore();
    const store = reportStore as unknown as Record<string, unknown>;
    expect(store.updateVersion).toBeUndefined();
    expect(store.updatePinSet).toBeUndefined();
    expect(store.updateVersionComposition).toBeUndefined();

    const caseStore = createInMemoryCaseStore();
    const fx = await fixtureCase(caseStore);
    const report = await createReportForUser(reportStore, {
      ownerId: OWNER,
      templateId: "B",
      title: "Case report",
      caseId: fx.caseRow.id,
      entitlements: null,
    });
    const { version } = await createVersionForUser(reportStore, caseStore, {
      reportRow: report,
      actorId: OWNER,
      request: { caseId: fx.caseRow.id },
      entitlements: null,
    });
    const completion = {
      documentPathname: "fraud-radar-reports/x/document.json",
      contentSha256: "c".repeat(64),
      manifest: {
        reportId: report.id,
        versionNo: 1,
        versionId: version.id,
        template: { id: "B" as const, version: "1.0.0", registryVersion: "1.0.0" },
        generator: { version: "1.0.0", rendererVersions: {} },
        pins: version.pinSet,
        contentSha256: "c".repeat(64),
        validation: {
          verdict: "pass",
          validatorVersion: "1.0.0",
          checkedAt: new Date().toISOString(),
          warnings: [],
        },
        generatedAt: new Date().toISOString(),
        exports: [],
      },
      validationVerdict: "pass",
    };
    const first = await reportStore.completeVersionGeneration(report.id, version.id, completion);
    expect(first?.contentSha256).toBe("c".repeat(64));
    const second = await reportStore.completeVersionGeneration(report.id, version.id, {
      ...completion,
      contentSha256: "d".repeat(64),
    });
    expect(second).toBeNull();
    const reread = await reportStore.getVersion(report.id, version.id);
    expect(reread!.contentSha256).toBe("c".repeat(64));
  });

  it("a composition that disables locked furniture is refused; author text warnings never edit the words", async () => {
    const caseStore = createInMemoryCaseStore();
    const reportStore = createInMemoryReportStore();
    const fx = await fixtureCase(caseStore);
    const report = await createReportForUser(reportStore, {
      ownerId: OWNER,
      templateId: "B",
      title: "Case report",
      caseId: fx.caseRow.id,
      entitlements: null,
    });
    await expect(
      createVersionForUser(reportStore, caseStore, {
        reportRow: report,
        actorId: OWNER,
        request: { caseId: fx.caseRow.id },
        composition: {
          sections: [{ key: "disclaimer", enabled: false }],
        },
        entitlements: null,
      }),
    ).rejects.toBeInstanceOf(ReportInputError);

    const draft = await buildDraft(caseStore, {
      reportRow: report,
      request: { caseId: fx.caseRow.id },
      composition: {
        sections: [
          { key: "case-summary", enabled: true, userText: "This looks suspicious to me." },
        ],
      },
    });
    expect(draft.preCheck.furnitureComplete).toBe(true);
    expect(draft.preCheck.userTextWarnings).toEqual([
      { sectionKey: "case-summary", phrases: ["suspicious"] },
    ]);
    // The author's words survive verbatim — warned, not edited.
    const summary = draft.composition.sections.find((s) => s.key === "case-summary");
    expect(summary?.userText).toBe("This looks suspicious to me.");
    // Draft hash is stable for identical inputs.
    const draft2 = await buildDraft(caseStore, {
      reportRow: report,
      request: { caseId: fx.caseRow.id },
      composition: {
        sections: [
          { key: "case-summary", enabled: true, userText: "This looks suspicious to me." },
        ],
      },
    });
    expect(draft2.draftSha256).toBe(draft.draftSha256);
  });

  it("diffPinSets names rehashed evidence and removed leads", () => {
    const base: PinSet = {
      leads: [{ leadId: "l1", caseId: "c1", kind: "signal", snapshotSha256: "a" }],
      entities: [],
      verifications: [],
      evidence: [{ evidenceId: "e1", caseId: "c1", sha256: "x" }],
      datasets: [],
    };
    const next: PinSet = {
      leads: [],
      entities: [],
      verifications: [],
      evidence: [{ evidenceId: "e1", caseId: "c1", sha256: "y" }],
      datasets: [],
    };
    const diff = diffPinSets(base, next);
    expect(diff.leadsRemoved).toEqual(["l1"]);
    expect(diff.evidenceRehashed).toEqual(["e1"]);
    expect(diff.caseChanged).toBe(false);
  });
});
