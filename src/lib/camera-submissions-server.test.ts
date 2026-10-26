// Submit-a-camera server pieces pins:
//  - validateCameraUrl refuses private/loopback/link-local/reserved
//    literal hosts and reserved names through the shared SSRF guard, and
//    passes a genuinely public literal host (all without DNS lookups);
//  - probeCameraUrl classifies answers honestly and never throws;
//  - the receipt/decision emails say what actually happens (approval =
//    cleared for import, not live) and escape submitter content.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/ssrf-guard", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return { ...actual, safeFetch: mocks.safeFetch };
});
vi.mock("@/lib/email", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return { ...actual, sendEmail: mocks.sendEmail };
});

import {
  validateCameraUrl,
  probeCameraUrl,
  cameraSubmissionReceiptEmail,
  cameraSubmissionDecisionEmail,
  sendCameraSubmissionReceipt,
  sendCameraSubmissionDecision,
} from "./camera-submissions-server";

beforeEach(() => {
  mocks.safeFetch.mockReset();
  mocks.sendEmail.mockClear();
});

describe("validateCameraUrl — SSRF guards", () => {
  it("refuses loopback, private, link-local and reserved literal hosts", async () => {
    for (const url of [
      "http://127.0.0.1/admin",
      "http://127.1.2.3/cam",
      "http://10.0.0.5/cam",
      "http://172.16.4.9/cam",
      "http://192.168.1.10/cam",
      "http://169.254.169.254/latest/meta-data",
      "http://100.64.1.1/cam",
      "http://0.0.0.0/cam",
      "http://[::1]/cam",
      "http://203.0.113.9/cam", // TEST-NET-3 documentation range
    ]) {
      const r = await validateCameraUrl(url);
      expect(r.ok, url).toBe(false);
    }
  });

  it("refuses reserved hostnames without needing DNS", async () => {
    for (const url of [
      "http://localhost:8080/cam",
      "http://metadata.google.internal/",
      "https://printer.local/cam",
      "https://nas.internal/cam",
    ]) {
      const r = await validateCameraUrl(url);
      expect(r.ok, url).toBe(false);
    }
  });

  it("refuses non-public schemes before any host check", async () => {
    expect((await validateCameraUrl("ftp://example.com/cam")).ok).toBe(false);
    expect((await validateCameraUrl("file:///etc/passwd")).ok).toBe(false);
  });

  it("accepts a public literal host", async () => {
    expect((await validateCameraUrl("http://8.8.8.8/cam.m3u8")).ok).toBe(true);
    expect((await validateCameraUrl("https://8.8.4.4/snap.jpg")).ok).toBe(true);
  });
});

describe("probeCameraUrl", () => {
  it("classifies a 200 as reachable", async () => {
    mocks.safeFetch.mockResolvedValue(new Response("frame", { status: 200 }));
    const r = await probeCameraUrl("https://8.8.8.8/cam");
    expect(r.probeStatus).toBe("reachable");
    expect(r.probeDetail).toContain("HTTP 200");
  });

  it("classifies a 404 as unreachable and a 403 as reachable-but-refused", async () => {
    mocks.safeFetch.mockResolvedValue(new Response("nope", { status: 404 }));
    expect((await probeCameraUrl("https://8.8.8.8/gone")).probeStatus).toBe("unreachable");
    mocks.safeFetch.mockResolvedValue(new Response("denied", { status: 403 }));
    const refused = await probeCameraUrl("https://8.8.8.8/cam");
    expect(refused.probeStatus).toBe("reachable");
    expect(refused.probeDetail).toContain("403");
  });

  it("never throws — network failure and timeouts read as unknown", async () => {
    mocks.safeFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));
    expect((await probeCameraUrl("https://8.8.8.8/cam")).probeStatus).toBe("unknown");
    const abort = new Error("aborted");
    abort.name = "AbortError";
    mocks.safeFetch.mockRejectedValue(abort);
    const r = await probeCameraUrl("https://8.8.8.8/slow");
    expect(r.probeStatus).toBe("unknown");
    expect(r.probeDetail).toMatch(/No answer within/);
  });
});

const VIEW = {
  submitterName: "Jane Smith",
  submitterEmail: "jane@example.com",
  cameraName: "Pier 39 Sea Lions",
  city: "San Francisco",
  country: "United States",
  reviewerNotes: null as string | null,
};

describe("submission emails", () => {
  it("receipt confirms the queue and the email-the-decision promise", () => {
    const { subject, html } = cameraSubmissionReceiptEmail(VIEW);
    expect(subject).toContain("Pier 39 Sea Lions");
    expect(html).toContain("review queue");
    expect(html).toContain("San Francisco");
  });

  it("approval says cleared-for-import, never that the camera is live", () => {
    const { subject, html } = cameraSubmissionDecisionEmail({ ...VIEW, status: "approved" });
    expect(subject).toMatch(/Approved/);
    expect(html).toMatch(/cleared/);
    expect(html).not.toMatch(/now live|is live on the map/);
  });

  it("rejection is honest and carries the reviewer note", () => {
    const { html } = cameraSubmissionDecisionEmail({
      ...VIEW, status: "rejected", reviewerNotes: "Feed needs a login.",
    });
    expect(html).toContain("can't add it");
    expect(html).toContain("Feed needs a login.");
  });

  it("escapes submitter content in the HTML", () => {
    const { html } = cameraSubmissionReceiptEmail({
      ...VIEW, cameraName: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("senders hand the built email to the mailer and report success", async () => {
    await expect(sendCameraSubmissionReceipt(VIEW)).resolves.toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "jane@example.com",
      expect.stringContaining("Pier 39 Sea Lions"),
      expect.any(String),
    );
    mocks.sendEmail.mockResolvedValue(false);
    await expect(
      sendCameraSubmissionDecision({ ...VIEW, status: "approved" }),
    ).resolves.toBe(false);
  });
});
