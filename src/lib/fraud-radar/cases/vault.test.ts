import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase 8 Payload B — vault unit tests (PHASE8 §2, §5.4.3):
 * pathname binding, own-URL verification, magic-byte checks,
 * the corpus-firewall assertion, config honesty, and the
 * deletion-retry sweep. @vercel/blob is mocked with an
 * in-memory object map — no network, no real store.
 */

const hoisted = vi.hoisted(() => ({
  objects: new Map<string, { bytes: Uint8Array; contentType: string }>(),
  failDel: false,
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(async (target: string | string[]) => {
    if (hoisted.failDel) throw new Error("blob delete failed");
    for (const t of Array.isArray(target) ? target : [target]) {
      hoisted.objects.delete(t);
      // Deletes may address the object by URL as well as pathname.
      for (const key of [...hoisted.objects.keys()]) {
        if (t.endsWith(key)) hoisted.objects.delete(key);
      }
    }
  }),
  get: vi.fn(async () => null),
  head: vi.fn(async () => {
    throw new Error("not found");
  }),
  put: vi.fn(async () => {
    throw new Error("not used in vault unit tests");
  }),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  VaultError,
  assertCorpusFirewall,
  corroborateContentType,
  deleteVaultObjects,
  evidenceBlobPathname,
  isOwnEvidenceBlobUrl,
  parseEvidencePathname,
  retryPendingEvidenceDeletions,
  sha256Hex,
  vaultStorageConfigured,
  verifyMagicBytes,
} from "./vault";
import { MAX_EVIDENCE_FILE_BYTES, VAULT_PATH_PREFIX } from "./vault-constants";
import { createInMemoryCaseStore } from "./store";
import { createHash } from "node:crypto";

const PDF = new TextEncoder().encode("%PDF-1.4\nbody");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

beforeEach(() => {
  hoisted.objects.clear();
  hoisted.failDel = false;
});

describe("vault constants (§2.1, §2.2)", () => {
  it("pins the prefix and the 25 MB ceiling", () => {
    expect(VAULT_PATH_PREFIX).toBe("fraud-radar-evidence/");
    expect(MAX_EVIDENCE_FILE_BYTES).toBe(25_000_000);
  });

  it("storage is configured only with a real token", () => {
    expect(vaultStorageConfigured({})).toBe(false);
    expect(vaultStorageConfigured({ BLOB_READ_WRITE_TOKEN: "  " })).toBe(false);
    expect(vaultStorageConfigured({ BLOB_READ_WRITE_TOKEN: "tok" })).toBe(true);
  });
});

describe("pathnames (§2.1)", () => {
  it("builds the case-scoped pathname and parses it back", () => {
    const p = evidenceBlobPathname("user-a", "case-1", "ev_1", "application/pdf");
    expect(p).toBe("fraud-radar-evidence/user-a/case-1/ev_1/file.pdf");
    expect(parseEvidencePathname(p)).toEqual({
      ownerId: "user-a",
      caseId: "case-1",
      evidenceId: "ev_1",
    });
  });

  it("refuses path segments that could escape the prefix", () => {
    expect(() => evidenceBlobPathname("../evil", "c", "e", "application/pdf")).toThrow(
      VaultError,
    );
    expect(parseEvidencePathname("clip-shares/a/b/c/file.mp4")).toBeNull();
    expect(parseEvidencePathname("fraud-radar-evidence/only/two")).toBeNull();
  });

  it("isOwnEvidenceBlobUrl binds scheme, host, and the row's own prefix", () => {
    const good =
      "https://store.public.blob.vercel-storage.com/fraud-radar-evidence/user-a/case-1/ev_1/file-abc.pdf";
    expect(isOwnEvidenceBlobUrl(good, "user-a", "case-1", "ev_1")).toBe(true);
    // Another user's prefix, another case, another row, an
    // external host, and a non-URL all fail.
    expect(isOwnEvidenceBlobUrl(good, "user-b", "case-1", "ev_1")).toBe(false);
    expect(isOwnEvidenceBlobUrl(good, "user-a", "case-2", "ev_1")).toBe(false);
    expect(isOwnEvidenceBlobUrl(good, "user-a", "case-1", "ev_2")).toBe(false);
    expect(
      isOwnEvidenceBlobUrl(
        "https://evil.example.com/fraud-radar-evidence/user-a/case-1/ev_1/file.pdf",
        "user-a",
        "case-1",
        "ev_1",
      ),
    ).toBe(false);
    expect(isOwnEvidenceBlobUrl("not a url", "user-a", "case-1", "ev_1")).toBe(false);
    expect(isOwnEvidenceBlobUrl(null, "user-a", "case-1", "ev_1")).toBe(false);
  });
});

describe("type corroboration + magic bytes (§2.2, §2.3.2)", () => {
  it("accepts allowlisted types whose extension agrees", () => {
    expect(corroborateContentType("application/pdf", "filing.pdf")).toBe("application/pdf");
    expect(corroborateContentType("text/csv", "data.csv")).toBe("text/csv");
    expect(corroborateContentType("image/jpeg", "scan.jpeg")).toBe("image/jpeg");
  });

  it("refuses non-allowlisted types by construction", () => {
    for (const [type, name] of [
      ["application/x-msdownload", "evil.exe"],
      ["application/zip", "bundle.zip"],
      ["text/html", "page.html"],
      ["application/msword", "old.doc"],
      ["video/mp4", "clip.mp4"],
    ] as const) {
      expect(() => corroborateContentType(type, name)).toThrow(VaultError);
    }
  });

  it("refuses an extension/content-type disagreement", () => {
    expect(() => corroborateContentType("application/pdf", "filing.png")).toThrow(
      /does not match/,
    );
  });

  it("magic bytes verify per type — a renamed executable fails", () => {
    expect(verifyMagicBytes("application/pdf", PDF)).toBe(true);
    expect(verifyMagicBytes("application/pdf", EXE)).toBe(false);
    expect(verifyMagicBytes("image/png", PNG)).toBe(true);
    expect(verifyMagicBytes("image/png", PDF)).toBe(false);
    expect(
      verifyMagicBytes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ZIP,
      ),
    ).toBe(true);
    expect(verifyMagicBytes("text/plain", new TextEncoder().encode("hello"))).toBe(true);
    expect(verifyMagicBytes("text/plain", new Uint8Array([0xff, 0xfe, 0x00]))).toBe(false);
    expect(verifyMagicBytes("application/json", new TextEncoder().encode('{"a":1}'))).toBe(true);
    expect(verifyMagicBytes("application/json", new TextEncoder().encode("not json"))).toBe(false);
  });

  it("sha256Hex matches an independently computed digest", () => {
    const bytes = new TextEncoder().encode("evidence bytes");
    expect(sha256Hex(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
});

describe("corpus firewall (§2.7)", () => {
  it("passes when artifact roots are disjoint or unset", () => {
    expect(() => assertCorpusFirewall({})).not.toThrow();
    expect(() =>
      assertCorpusFirewall({ FRAUD_RADAR_ARTIFACT_ROOT: "/srv/artifacts/healthcare" }),
    ).not.toThrow();
  });

  it("fails closed when an artifact root overlaps the vault prefix", () => {
    expect(() =>
      assertCorpusFirewall({
        FRAUD_RADAR_ARTIFACT_ROOT: "fraud-radar-evidence/published",
      }),
    ).toThrow(/corpus_firewall|overlaps/);
  });
});

describe("deletion sweep (§2.6.1)", () => {
  it("deleteVaultObjects reports failures instead of hiding them", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "tok";
    hoisted.objects.set("fraud-radar-evidence/u/c/e/file.pdf", { bytes: PDF, contentType: "application/pdf" });
    const ok = await deleteVaultObjects(["fraud-radar-evidence/u/c/e/file.pdf"]);
    expect(ok.failed).toEqual([]);
    hoisted.failDel = true;
    const bad = await deleteVaultObjects(["fraud-radar-evidence/u/c/e/file2.pdf"]);
    expect(bad.failed).toEqual(["fraud-radar-evidence/u/c/e/file2.pdf"]);
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("retryPendingEvidenceDeletions completes a pending row once deletes succeed", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "tok";
    const store = createInMemoryCaseStore();
    const c = await store.createCase({ ownerId: "user-a", title: "Matter" });
    const row = await store.createEvidence({
      caseId: c.id,
      kind: "upload",
      title: "filing.pdf",
      sha256: sha256Hex(PDF),
      blobPathname: "fraud-radar-evidence/user-a/x/file.pdf",
      storageState: "deletion_pending",
      uploadedById: "user-a",
    });
    hoisted.objects.set(row.blobPathname!, { bytes: PDF, contentType: "application/pdf" });

    hoisted.failDel = true;
    const first = await retryPendingEvidenceDeletions(store);
    expect(first).toEqual({ completed: 0, stillPending: 1 });
    expect(await store.getEvidence(c.id, row.id)).not.toBeNull();

    hoisted.failDel = false;
    const second = await retryPendingEvidenceDeletions(store);
    expect(second).toEqual({ completed: 1, stillPending: 0 });
    expect(await store.getEvidence(c.id, row.id)).toBeNull();
    const events = await store.listEvents(c.id);
    expect(events.some((e) => e.kind === "evidence_removed")).toBe(true);
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });
});
