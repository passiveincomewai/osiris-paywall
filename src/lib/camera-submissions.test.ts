// Submit-a-camera shared module pins:
//  - the parser accepts both paths (own / suggest), normalizes the email,
//    treats coordinates as an optional pair, and rejects every malformed
//    field with a specific error;
//  - URL shape rules refuse non-http(s) schemes and credentialed URLs;
//  - the honeypot trips only on a filled hidden field;
//  - review decisions only move a pending submission, exactly once.
import { describe, it, expect } from "vitest";
import {
  parseCameraSubmission,
  cameraUrlShapeError,
  isHoneypotTripped,
  reviewDecision,
} from "./camera-submissions";

const GOOD = {
  kind: "own",
  cameraName: "Pier 39 Sea Lions",
  url: "https://cams.example.com/pier39.m3u8",
  category: "nature",
  city: "San Francisco",
  country: "United States",
  lat: "37.8087",
  lng: "-122.4098",
  submitterName: "Jane Smith",
  submitterEmail: "Jane@Example.com",
  declaration: true,
  notes: "Runs 24/7, operated by the marina.",
};

describe("parseCameraSubmission", () => {
  it("accepts an operator submission and normalizes it", () => {
    const r = parseCameraSubmission(GOOD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      kind: "own",
      cameraName: "Pier 39 Sea Lions",
      url: "https://cams.example.com/pier39.m3u8",
      category: "nature",
      city: "San Francisco",
      country: "United States",
      lat: 37.8087,
      lng: -122.4098,
      submitterName: "Jane Smith",
      submitterEmail: "jane@example.com",
      declaration: true,
      notes: "Runs 24/7, operated by the marina.",
    });
  });

  it("accepts a suggestion without coordinates or notes", () => {
    const r = parseCameraSubmission({
      ...GOOD, kind: "suggest", lat: "", lng: "", notes: "  ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.kind).toBe("suggest");
    expect(r.data.lat).toBeNull();
    expect(r.data.lng).toBeNull();
    expect(r.data.notes).toBeNull();
  });

  it("rejects an unknown kind, category and a missing declaration", () => {
    expect(parseCameraSubmission({ ...GOOD, kind: "theirs" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, category: "space" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, declaration: false }).ok).toBe(false);
    const noDecl: Record<string, unknown> = { ...GOOD };
    delete noDecl.declaration;
    expect(parseCameraSubmission(noDecl).ok).toBe(false);
  });

  it("rejects a bad email and blank required text fields", () => {
    expect(parseCameraSubmission({ ...GOOD, submitterEmail: "nope" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, cameraName: "x" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, city: " " }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, country: "" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, submitterName: "" }).ok).toBe(false);
  });

  it("treats coordinates as a pair and range-checks them", () => {
    expect(parseCameraSubmission({ ...GOOD, lng: "" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, lat: "" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, lat: "91" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, lat: "-90.1" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, lng: "180.5" }).ok).toBe(false);
    expect(parseCameraSubmission({ ...GOOD, lat: "north" }).ok).toBe(false);
    const edge = parseCameraSubmission({ ...GOOD, lat: "-90", lng: "180" });
    expect(edge.ok).toBe(true);
  });

  it("rejects non-object and empty bodies", () => {
    expect(parseCameraSubmission(null).ok).toBe(false);
    expect(parseCameraSubmission(undefined).ok).toBe(false);
    expect(parseCameraSubmission({}).ok).toBe(false);
  });
});

describe("cameraUrlShapeError", () => {
  it("accepts plain http/https URLs", () => {
    expect(cameraUrlShapeError("https://example.com/cam.m3u8")).toBeNull();
    expect(cameraUrlShapeError("http://203.0.113.9:8080/snap.jpg")).toBeNull();
  });

  it("rejects other schemes, credentialed and malformed URLs", () => {
    expect(cameraUrlShapeError("ftp://example.com/cam")).toMatch(/http/);
    expect(cameraUrlShapeError("javascript:alert(1)")).toMatch(/http/);
    expect(cameraUrlShapeError("file:///etc/passwd")).toMatch(/http/);
    expect(cameraUrlShapeError("rtsp://example.com/cam")).toMatch(/http/);
    expect(cameraUrlShapeError("https://user:pass@example.com/cam")).toMatch(/username or password/);
    expect(cameraUrlShapeError("example.com/cam")).toMatch(/complete web address/);
    expect(cameraUrlShapeError("")).toMatch(/Paste/);
  });
});

describe("isHoneypotTripped", () => {
  it("trips only when the hidden field carries text", () => {
    expect(isHoneypotTripped({ website: "http://spam.example" })).toBe(true);
    expect(isHoneypotTripped({ website: "" })).toBe(false);
    expect(isHoneypotTripped({ website: "   " })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped({ website: 42 })).toBe(false);
  });
});

describe("reviewDecision", () => {
  it("moves pending to approved or rejected", () => {
    expect(reviewDecision("pending", "approve")).toEqual({ ok: true, nextStatus: "approved" });
    expect(reviewDecision("pending", "reject")).toEqual({ ok: true, nextStatus: "rejected" });
  });

  it("refuses a second decision as a conflict", () => {
    const r = reviewDecision("approved", "reject");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conflict).toBe(true);
    expect(r.error).toMatch(/already approved/);
    expect(reviewDecision("rejected", "approve").ok).toBe(false);
  });

  it("refuses unknown decisions", () => {
    const r = reviewDecision("pending", "maybe");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conflict).toBeUndefined();
  });
});
