import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";

/**
 * Phase 8 Payload B — evidence vault route tests (PHASE8
 * §5.4.1, §5.4.3): tenant isolation per route (cross-owner
 * upload/list/download/extracted/verify/process/delete/
 * complete all 404, cross-case child ids 404), allowlist +
 * size rejection, magic-byte rejection (object + row removed),
 * SHA-256 recorded at ingest matches the content, delete
 * removes BOTH stores, the no-Blob-URL assertion (every
 * response body + headers scanned), storage-unconfigured 503
 * honesty, free-tier vault closure, the initiate → token →
 * complete direct-upload flow, artifact capture, processing
 * enqueue, and the flag-off 404 on every route. @vercel/blob
 * is an in-memory map; the store is the in-memory store.
 */

const hoisted = vi.hoisted(() => ({
  session: null as null | {
    user: { id: string; email: string; fraudRadarTier?: string };
  },
  store: null as unknown,
  blobs: new Map<string, { bytes: Uint8Array; contentType: string }>(),
  delCalls: [] as string[],
  failDel: false,
  tokenOpts: null as {
    onBeforeGenerateToken: (pathname: string) => Promise<Record<string, unknown>>;
  } | null,
}));

const BLOB_HOST = "store123.public.blob.vercel-storage.com";
const urlFor = (pathname: string) => `https://${BLOB_HOST}/${pathname}`;

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/auth", () => ({
  auth: async () => hoisted.session,
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(
    async (
      pathname: string,
      body: Uint8Array,
      opts?: { addRandomSuffix?: boolean; contentType?: string },
    ) => {
      const finalPath = opts?.addRandomSuffix ? pathname.replace(/(\.[a-z0-9]+)$/i, "-x7$1") : pathname;
      const bytes = body instanceof Uint8Array ? body : new Uint8Array(body as ArrayBuffer);
      hoisted.blobs.set(finalPath, {
        bytes,
        contentType: opts?.contentType ?? "application/octet-stream",
      });
      return {
        url: urlFor(finalPath),
        downloadUrl: `${urlFor(finalPath)}?download=1`,
        pathname: finalPath,
        contentType: opts?.contentType,
      };
    },
  ),
  get: vi.fn(async (target: string) => {
    const pathname = target.startsWith("https://")
      ? new URL(target).pathname.slice(1)
      : target;
    const obj = hoisted.blobs.get(pathname);
    if (!obj) return null;
    return {
      statusCode: 200,
      stream: streamOf(obj.bytes),
      headers: new Headers(),
      blob: {
        url: urlFor(pathname),
        downloadUrl: urlFor(pathname),
        pathname,
        contentType: obj.contentType,
        size: obj.bytes.length,
      },
    };
  }),
  head: vi.fn(async (target: string) => {
    const pathname = target.startsWith("https://")
      ? new URL(target).pathname.slice(1)
      : target;
    const obj = hoisted.blobs.get(pathname);
    if (!obj) throw new Error("blob not found");
    return {
      size: obj.bytes.length,
      contentType: obj.contentType,
      pathname,
      url: urlFor(pathname),
      downloadUrl: urlFor(pathname),
      uploadedAt: new Date(),
      contentDisposition: "attachment",
      cacheControl: "",
      etag: "x",
    };
  }),
  del: vi.fn(async (target: string | string[]) => {
    if (hoisted.failDel) throw new Error("blob delete failed");
    for (const t of Array.isArray(target) ? target : [target]) {
      hoisted.delCalls.push(t);
      const pathname = t.startsWith("https://") ? new URL(t).pathname.slice(1) : t;
      hoisted.blobs.delete(pathname);
    }
  }),
}));

vi.mock("@vercel/blob/client", () => ({
  handleUpload: vi.fn(async (opts: never) => {
    hoisted.tokenOpts = opts as typeof hoisted.tokenOpts;
    return { type: "blob.generate-client-token", clientToken: "tok" };
  }),
}));

vi.mock("@/lib/fraud-radar/cases/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/cases/store")>();
  hoisted.store = actual.createInMemoryCaseStore();
  return { ...actual, getCaseStore: () => hoisted.store };
});

vi.mock("@/lib/fraud-radar/cases/leads", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/cases/leads")>();
  return {
    ...actual,
    captureLead: async (input: { kind: string; engine: string; entityKey: string }) => {
      if (input.entityKey.includes("missing")) {
        throw new actual.LeadCaptureError("lead_not_found", "no published profile");
      }
      const snapshot = {
        tool: "case_lead_capture",
        dataset: "research-signals",
        datasetVersion: "v-fixture",
        grainKey: input.entityKey,
        sourceVintages: [{ source: "research-signals", version: "v-fixture" }],
        caveats: [],
        truncated: false,
        data: { fixture: true, entityKey: input.entityKey },
      };
      return {
        kind: input.kind,
        engine: input.engine,
        entityKey: input.entityKey,
        entityLabel: `Label ${input.entityKey}`,
        snapshot,
        snapshotSha256: actual.snapshotSha256(snapshot),
        sourceDataset: "research-signals",
        sourceDatasetVersion: "v-fixture",
        ruleCode: null,
      };
    },
  };
});

import { POST as createCase } from "./route";
import { DELETE as deleteCase } from "./[id]/route";
import { GET as listEvidence, POST as uploadEvidence } from "./[id]/evidence/route";
import { POST as initiate } from "./[id]/evidence/initiate/route";
import { POST as artifact } from "./[id]/evidence/artifact/route";
import { POST as uploadToken } from "./evidence-upload-token/route";
import { POST as complete } from "./[id]/evidence/[evidenceId]/complete/route";
import { GET as download } from "./[id]/evidence/[evidenceId]/download/route";
import { GET as extracted } from "./[id]/evidence/[evidenceId]/extracted/route";
import { GET as verify } from "./[id]/evidence/[evidenceId]/verify/route";
import { POST as processRoute } from "./[id]/evidence/[evidenceId]/process/route";
import { GET as getEvidence, DELETE as deleteEvidence } from "./[id]/evidence/[evidenceId]/route";
import {
  createInMemoryCaseStore,
  type CaseStore,
} from "@/lib/fraud-radar/cases/store";
import { put } from "@vercel/blob";

const store = () => hoisted.store as CaseStore;
const asUser = (id: string, tier?: string) => {
  hoisted.session = {
    user: { id, email: `${id}@example.com`, ...(tier ? { fraudRadarTier: tier } : {}) },
  };
};
const asPro = (id: string) => asUser(id, "pro");
const signedOut = () => {
  hoisted.session = null;
};

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\nfiling body bytes");
const PDF_SHA = createHash("sha256").update(PDF_BYTES).digest("hex");

const jsonPost = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const get = (url: string) => new NextRequest(url);
const caseParams = (id: string) => ({ params: Promise.resolve({ id }) });
const evParams = (id: string, evidenceId: string) => ({
  params: Promise.resolve({ id, evidenceId }),
});

function uploadReq(filename: string, bytes: Uint8Array, type: string, title?: string) {
  const fd = new FormData();
  fd.set("file", new File([bytes.buffer as ArrayBuffer], filename, { type }));
  if (title) fd.set("title", title);
  return new NextRequest("http://localhost/x", { method: "POST", body: fd });
}

/** The no-Blob-URL assertion (§2.1/§2.5): neither a Blob URL
 *  nor the store host may appear in a response body or headers.
 *  (The initiate response's pathname is a separate, deliberate
 *  field and is checked by its own test — never a URL.) */
async function expectNoBlobUrl(res: Response) {
  const text = await res.clone().text();
  expect(text).not.toContain("blob.vercel-storage.com");
  expect(text).not.toContain('"url"');
  for (const [, v] of res.headers.entries()) {
    expect(v).not.toContain("blob.vercel-storage.com");
  }
}

async function createCaseFor(userId: string, tier?: string): Promise<string> {
  asUser(userId, tier);
  const res = await createCase(
    jsonPost("http://localhost/api/fraud-radar/cases", { title: "Matter" }),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as { case: { id: string } }).case.id;
}

async function uploadPdf(caseId: string, userId = "user-a"): Promise<string> {
  asPro(userId);
  const res = await uploadEvidence(
    uploadReq("filing.pdf", PDF_BYTES, "application/pdf"),
    caseParams(caseId),
  );
  expect(res.status).toBe(201);
  await expectNoBlobUrl(res.clone());
  const body = (await res.json()) as { evidence: { id: string; sha256: string } };
  expect(body.evidence.sha256).toBe(PDF_SHA);
  return body.evidence.id;
}

beforeEach(() => {
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  hoisted.store = createInMemoryCaseStore();
  hoisted.blobs.clear();
  hoisted.delCalls = [];
  hoisted.failDel = false;
  hoisted.tokenOpts = null;
  signedOut();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("flag gate — every evidence route 404s while off", () => {
  it("all vault routes are indistinguishable from non-existence", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    asPro("user-a");
    const cid = "case-x";
    const eid = "ev_x";
    expect((await listEvidence(get("http://localhost/x"), caseParams(cid))).status).toBe(404);
    expect((await uploadEvidence(uploadReq("f.pdf", PDF_BYTES, "application/pdf"), caseParams(cid))).status).toBe(404);
    expect((await initiate(jsonPost("http://localhost/x", {}), caseParams(cid))).status).toBe(404);
    expect((await artifact(jsonPost("http://localhost/x", {}), caseParams(cid))).status).toBe(404);
    expect((await uploadToken(jsonPost("http://localhost/x", { type: "blob.generate-client-token", payload: {} }))).status).toBe(404);
    expect((await complete(jsonPost("http://localhost/x", {}), evParams(cid, eid))).status).toBe(404);
    expect((await download(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
    expect((await extracted(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
    expect((await verify(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
    expect((await processRoute(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
    expect((await getEvidence(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
    expect((await deleteEvidence(get("http://localhost/x"), evParams(cid, eid))).status).toBe(404);
  });

  it("signed-out callers get 401", async () => {
    signedOut();
    expect((await listEvidence(get("http://localhost/x"), caseParams("c"))).status).toBe(401);
    expect((await download(get("http://localhost/x"), evParams("c", "e"))).status).toBe(401);
  });
});

describe("multipart ingest (§2.2–§2.4)", () => {
  it("uploads, hashes at ingest, binds the pathname to owner/case/row, and lists metadata only", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    const row = await store().getEvidence(caseId, evidenceId);
    expect(row?.sha256).toBe(PDF_SHA);
    expect(row?.sizeBytes).toBe(BigInt(PDF_BYTES.length));
    expect(row?.storageState).toBe("present");
    expect(row?.blobPathname).toMatch(
      new RegExp(`^fraud-radar-evidence/user-a/${caseId}/${evidenceId}/file`),
    );
    expect(hoisted.blobs.size).toBe(1);
    expect([...hoisted.blobs.keys()][0]).toBe(row?.blobPathname);

    asPro("user-a");
    const list = await listEvidence(get("http://localhost/x"), caseParams(caseId));
    expect(list.status).toBe(200);
    await expectNoBlobUrl(list.clone());
    const body = (await list.json()) as { evidence: { id: string; sha256: string }[] };
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence[0].sha256).toBe(PDF_SHA);
    // The event log records the fact + hash, never content.
    const events = await store().listEvents(caseId);
    const added = events.find((e) => e.kind === "evidence_added");
    expect(added).toBeDefined();
    expect(JSON.stringify(added?.detail)).toContain(PDF_SHA);
    expect(JSON.stringify(added?.detail)).not.toContain("filing body");
  });

  it("refuses non-allowlisted types and extension mismatches", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const exe = await uploadEvidence(
      uploadReq("evil.exe", new Uint8Array([0x4d, 0x5a]), "application/x-msdownload"),
      caseParams(caseId),
    );
    expect(exe.status).toBe(400);
    const mismatch = await uploadEvidence(
      uploadReq("filing.png", PDF_BYTES, "application/pdf"),
      caseParams(caseId),
    );
    expect(mismatch.status).toBe(400);
    expect(await store().listEvidence(caseId)).toHaveLength(0);
    expect(hoisted.blobs.size).toBe(0);
  });

  it("refuses magic-byte mismatches — a renamed executable never becomes evidence", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const res = await uploadEvidence(
      uploadReq("filing.pdf", new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 1, 2]), "application/pdf"),
      caseParams(caseId),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("TYPE_MISMATCH");
    expect(await store().listEvidence(caseId)).toHaveLength(0);
    expect(hoisted.blobs.size).toBe(0);
  });

  it("refuses oversize files at the 25 MB ceiling", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const big = new Uint8Array(25_000_001);
    big.set(new TextEncoder().encode("%PDF-"), 0);
    const res = await uploadEvidence(
      uploadReq("big.pdf", big, "application/pdf"),
      caseParams(caseId),
    );
    expect(res.status).toBe(413);
    expect(await store().listEvidence(caseId)).toHaveLength(0);
  });

  it("503s honestly when storage is unconfigured — and creates no row", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const res = await uploadEvidence(
      uploadReq("filing.pdf", PDF_BYTES, "application/pdf"),
      caseParams(caseId),
    );
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("STORAGE_UNAVAILABLE");
    const init = await initiate(
      jsonPost("http://localhost/x", { filename: "f.pdf", contentType: "application/pdf", sizeBytes: 10 }),
      caseParams(caseId),
    );
    expect(init.status).toBe(503);
    expect(await store().listEvidence(caseId)).toHaveLength(0);
  });

  it("free tier: the vault is closed (429) but artifact evidence still works", async () => {
    const caseId = await createCaseFor("user-free");
    asUser("user-free");
    const res = await uploadEvidence(
      uploadReq("filing.pdf", PDF_BYTES, "application/pdf"),
      caseParams(caseId),
    );
    expect(res.status).toBe(429);
    expect(((await res.json()) as { code: string }).code).toBe("VAULT_DISABLED");
    const init = await initiate(
      jsonPost("http://localhost/x", { filename: "f.pdf", contentType: "application/pdf", sizeBytes: 10 }),
      caseParams(caseId),
    );
    expect(init.status).toBe(429);
    const art = await artifact(
      jsonPost("http://localhost/x", { engine: "healthcare", entityKey: "1234567890" }),
      caseParams(caseId),
    );
    expect(art.status).toBe(201);
  });

  it("initiate refuses oversize and over-quota before any row completes", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const over = await initiate(
      jsonPost("http://localhost/x", { filename: "f.pdf", contentType: "application/pdf", sizeBytes: 25_000_001 }),
      caseParams(caseId),
    );
    expect(over.status).toBe(413);
    // Seed a near-full vault directly, then a small initiate must 429.
    await store().createEvidence({
      caseId,
      kind: "upload",
      title: "seed",
      sizeBytes: BigInt(4_999_999_999),
      storageState: "present",
      uploadedById: "user-a",
    });
    const quota = await initiate(
      jsonPost("http://localhost/x", { filename: "f.pdf", contentType: "application/pdf", sizeBytes: 10 }),
      caseParams(caseId),
    );
    expect(quota.status).toBe(429);
    expect(((await quota.json()) as { code: string }).code).toBe("QUOTA_EXCEEDED");
  });
});

describe("tenant isolation per route (§5.4.1 — 404, not 403)", () => {
  it("user B gets 404 on every evidence route against user A's case", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);

    asPro("user-b");
    expect((await listEvidence(get("http://localhost/x"), caseParams(caseId))).status).toBe(404);
    expect((await uploadEvidence(uploadReq("f.pdf", PDF_BYTES, "application/pdf"), caseParams(caseId))).status).toBe(404);
    expect((await initiate(jsonPost("http://localhost/x", { filename: "f.pdf", contentType: "application/pdf", sizeBytes: 1 }), caseParams(caseId))).status).toBe(404);
    expect((await artifact(jsonPost("http://localhost/x", { engine: "healthcare", entityKey: "1" }), caseParams(caseId))).status).toBe(404);
    expect((await getEvidence(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await download(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await extracted(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await verify(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await processRoute(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await complete(jsonPost("http://localhost/x", { blobUrl: "https://x" }), evParams(caseId, evidenceId))).status).toBe(404);
    expect((await deleteEvidence(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);

    // Nothing leaked, nothing deleted: owner state intact.
    asPro("user-a");
    expect(await store().getEvidence(caseId, evidenceId)).not.toBeNull();
    expect(hoisted.blobs.size).toBe(1);
    const listB = await (async () => {
      asPro("user-b");
      return listEvidence(get("http://localhost/x"), caseParams(caseId));
    })();
    expect(listB.status).toBe(404);
  });

  it("an evidence id reused under a DIFFERENT case of the same owner is 404 everywhere", async () => {
    const caseOne = await createCaseFor("user-a", "pro");
    const caseTwo = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseOne);
    asPro("user-a");
    expect((await download(get("http://localhost/x"), evParams(caseTwo, evidenceId))).status).toBe(404);
    expect((await verify(get("http://localhost/x"), evParams(caseTwo, evidenceId))).status).toBe(404);
    expect((await deleteEvidence(get("http://localhost/x"), evParams(caseTwo, evidenceId))).status).toBe(404);
    expect((await getEvidence(get("http://localhost/x"), evParams(caseTwo, evidenceId))).status).toBe(404);
    expect(await store().getEvidence(caseOne, evidenceId)).not.toBeNull();
  });
});

describe("download + verify (§2.5, §2.4)", () => {
  it("the owner streams the exact bytes with attachment + nosniff + no-store, and no URL anywhere", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asPro("user-a");
    const res = await download(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain("filing.pdf");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("location")).toBeNull();
    await expectNoBlobUrl(res.clone());
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes).toEqual(PDF_BYTES);
  });

  it("verify passes on intact bytes and reports mismatch after tampering", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asPro("user-a");
    const ok = await verify(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as { ok: boolean; sha256: string };
    expect(okBody.ok).toBe(true);
    expect(okBody.sha256).toBe(PDF_SHA);

    const row = await store().getEvidence(caseId, evidenceId);
    hoisted.blobs.set(row!.blobPathname!, {
      bytes: new TextEncoder().encode("%PDF-tampered"),
      contentType: "application/pdf",
    });
    const bad = await verify(get("http://localhost/x"), evParams(caseId, evidenceId));
    const badBody = (await bad.json()) as { ok: boolean; storedSha256: string };
    expect(badBody.ok).toBe(false);
    expect(badBody.storedSha256).toBe(PDF_SHA);
  });

  it("extracted: 404 until an extraction exists, then owner-gated streaming", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asPro("user-a");
    expect((await extracted(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
    const row = await store().getEvidence(caseId, evidenceId);
    const extraction = new TextEncoder().encode(
      JSON.stringify({ text: "page one", pages: [], tables: [], path: "text_extract" }),
    );
    const extPath = `${row!.blobPathname!.replace(/\/file[^/]*$/, "")}/extracted.json`;
    hoisted.blobs.set(extPath, { bytes: extraction, contentType: "application/json" });
    await store().updateEvidence(caseId, evidenceId, {
      extractedTextPathname: extPath,
      processingStatus: "processed",
      processingPath: "text_extract",
    });
    const res = await extracted(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(200);
    await expectNoBlobUrl(res.clone());
    expect(JSON.parse(await res.text()).text).toBe("page one");
    asPro("user-b");
    expect((await extracted(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
  });
});

describe("delete (§2.6 rule 1 — real deletes)", () => {
  it("removes the row AND the Blob object, and logs evidence_removed with the hash", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asPro("user-a");
    const res = await deleteEvidence(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(200);
    expect(await store().getEvidence(caseId, evidenceId)).toBeNull();
    expect(hoisted.blobs.size).toBe(0);
    const events = await store().listEvents(caseId);
    const removed = events.find((e) => e.kind === "evidence_removed");
    expect(removed).toBeDefined();
    expect(JSON.stringify(removed?.detail)).toContain(PDF_SHA);
    expect(JSON.stringify(removed?.detail)).not.toContain("filing body");
  });

  it("a failed Blob delete marks deletion_pending and revokes access immediately", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    hoisted.failDel = true;
    asPro("user-a");
    const res = await deleteEvidence(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { deletionPending: boolean }).deletionPending).toBe(true);
    const row = await store().getEvidence(caseId, evidenceId);
    expect(row?.storageState).toBe("deletion_pending");
    // Access revoked even though the row still exists.
    expect((await download(get("http://localhost/x"), evParams(caseId, evidenceId))).status).toBe(404);
  });

  it("deleting a case sweeps its Blob objects (§2.6 rule 2)", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    await uploadPdf(caseId);
    expect(hoisted.blobs.size).toBe(1);
    asPro("user-a");
    const res = await deleteCase(get("http://localhost/x"), caseParams(caseId));
    expect(res.status).toBe(200);
    expect(hoisted.blobs.size).toBe(0);
  });
});

describe("direct-upload flow (§2.4: initiate → token → complete)", () => {
  async function initiateFor(caseId: string) {
    asPro("user-a");
    const res = await initiate(
      jsonPost("http://localhost/x", {
        filename: "filing.pdf",
        contentType: "application/pdf",
        sizeBytes: PDF_BYTES.length,
      }),
      caseParams(caseId),
    );
    expect(res.status).toBe(201);
    return (await res.json()) as { evidenceId: string; pathname: string };
  }

  it("the token binds session + pathname + pending row, with the allowlist and ceiling", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const { pathname } = await initiateFor(caseId);
    asPro("user-a");
    const res = await uploadToken(
      jsonPost("http://localhost/x", { type: "blob.generate-client-token", payload: {} }),
    );
    expect(res.status).toBe(200);
    const opts = await hoisted.tokenOpts!.onBeforeGenerateToken(pathname);
    expect(opts.maximumSizeInBytes).toBe(25_000_000);
    expect(opts.allowedContentTypes).toContain("application/pdf");
    expect(JSON.parse(opts.tokenPayload as string)).toMatchObject({ userId: "user-a", caseId });
    // A foreign pathname and another user's row are refused.
    await expect(
      hoisted.tokenOpts!.onBeforeGenerateToken("fraud-radar-evidence/user-b/case-y/ev_z/file.pdf"),
    ).rejects.toThrow();
    asPro("user-b");
    await expect(hoisted.tokenOpts!.onBeforeGenerateToken(pathname)).rejects.toThrow();
  });

  it("complete verifies, hashes, and completes the row; the response carries no URL", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const { evidenceId, pathname } = await initiateFor(caseId);
    // Simulate the browser's direct upload (suffix applied).
    const uploaded = await put(pathname, Buffer.from(PDF_BYTES), {
      access: "private",
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    asPro("user-a");
    const res = await complete(
      jsonPost("http://localhost/x", { blobUrl: (uploaded as { url: string }).url }),
      evParams(caseId, evidenceId),
    );
    expect(res.status).toBe(200);
    await expectNoBlobUrl(res.clone());
    const row = await store().getEvidence(caseId, evidenceId);
    expect(row?.storageState).toBe("present");
    expect(row?.sha256).toBe(PDF_SHA);
    expect(row?.blobPathname).toBe((uploaded as { pathname: string }).pathname);
  });

  it("complete with a foreign URL is refused without touching the foreign object", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const { evidenceId } = await initiateFor(caseId);
    asPro("user-a");
    const res = await complete(
      jsonPost("http://localhost/x", {
        blobUrl: urlFor("fraud-radar-evidence/user-b/other-case/ev_q/file.pdf"),
      }),
      evParams(caseId, evidenceId),
    );
    expect(res.status).toBe(400);
    expect(await store().getEvidence(caseId, evidenceId)).toBeNull();
  });

  it("complete with tampered bytes fails, deletes the object, and drops the row", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const { evidenceId, pathname } = await initiateFor(caseId);
    const uploaded = await put(
      pathname,
      Buffer.from(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])),
      { access: "private", addRandomSuffix: true, contentType: "application/pdf" },
    );
    asPro("user-a");
    const res = await complete(
      jsonPost("http://localhost/x", { blobUrl: (uploaded as { url: string }).url }),
      evParams(caseId, evidenceId),
    );
    // Size differs from the initiated size (and magic is wrong):
    // either specific failure is a refusal with full cleanup.
    expect(res.status).toBe(400);
    expect(await store().getEvidence(caseId, evidenceId)).toBeNull();
    expect(hoisted.blobs.size).toBe(0);
  });
});

describe("artifact evidence (§1.4) + processing enqueue (§3.3)", () => {
  it("artifact capture freezes the envelope + hash, identifiers only", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    asPro("user-a");
    const refused = await artifact(
      jsonPost("http://localhost/x", {
        engine: "healthcare",
        entityKey: "1234567890",
        artifactEnvelope: { fabricated: true },
      }),
      caseParams(caseId),
    );
    expect(refused.status).toBe(400);
    const res = await artifact(
      jsonPost("http://localhost/x", { engine: "healthcare", entityKey: "1234567890" }),
      caseParams(caseId),
    );
    expect(res.status).toBe(201);
    await expectNoBlobUrl(res.clone());
    const body = (await res.json()) as { evidence: { kind: string; artifactSha256: string } };
    expect(body.evidence.kind).toBe("artifact");
    expect(body.evidence.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(hoisted.blobs.size).toBe(0);
  });

  it("process enqueues a FrEvidenceProcessingJob row and marks the item queued — never parses", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asPro("user-a");
    const res = await processRoute(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(202);
    const body = (await res.json()) as { job: { status: string; requestedPath: string } };
    expect(body.job.status).toBe("queued");
    expect(body.job.requestedPath).toBe("auto");
    const row = await store().getEvidence(caseId, evidenceId);
    expect(row?.processingStatus).toBe("queued");
    const jobs = await store().listProcessingJobs(caseId, evidenceId);
    expect(jobs).toHaveLength(1);
  });

  it("free tier processing is an honest 429 (0 jobs in the tier)", async () => {
    const caseId = await createCaseFor("user-a", "pro");
    const evidenceId = await uploadPdf(caseId);
    asUser("user-a"); // same owner, free posture via no tier claim
    const res = await processRoute(get("http://localhost/x"), evParams(caseId, evidenceId));
    expect(res.status).toBe(429);
    expect(await store().listProcessingJobs(caseId, evidenceId)).toHaveLength(0);
  });
});
