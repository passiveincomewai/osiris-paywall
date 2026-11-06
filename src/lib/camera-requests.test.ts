// parseCameraRequest pins:
//  - placeText is the only required field (trimmed, 2–160 chars);
//  - the failed query is carried through (trimmed, capped), absent → null;
//  - email is optional, validated when present, stored normalized;
//  - sessionId is kept only in the analytics id shape, else dropped;
//  - a client-sent userId is never honoured (the route sets it);
//  - the honeypot trips only on a filled hidden field.
import { describe, it, expect } from "vitest";
import {
  parseCameraRequest,
  isCameraRequestHoneypotTripped,
  CAMERA_REQUEST_PLACE_MAX,
  CAMERA_REQUEST_QUERY_MAX,
} from "./camera-requests";

describe("parseCameraRequest", () => {
  it("accepts a minimal request with just a place", () => {
    const r = parseCameraRequest({ placeText: "  Reykjavik harbour  " });
    expect(r).toEqual({
      ok: true,
      data: { query: null, placeText: "Reykjavik harbour", email: null, sessionId: null },
    });
  });

  it("carries the failed query and a normalized email", () => {
    const r = parseCameraRequest({
      placeText: "Banff",
      query: "banff cameras",
      email: "  Person@Example.COM ",
      sessionId: "abc123XYZ_-",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.query).toBe("banff cameras");
      expect(r.data.email).toBe("person@example.com");
      expect(r.data.sessionId).toBe("abc123XYZ_-");
    }
  });

  it("rejects a missing or one-character place", () => {
    expect(parseCameraRequest({}).ok).toBe(false);
    expect(parseCameraRequest({ placeText: " x " }).ok).toBe(false);
    expect(parseCameraRequest(null).ok).toBe(false);
    expect(parseCameraRequest({ placeText: 42 }).ok).toBe(false);
  });

  it("rejects a place over the cap", () => {
    const r = parseCameraRequest({ placeText: "a".repeat(CAMERA_REQUEST_PLACE_MAX + 1) });
    expect(r.ok).toBe(false);
  });

  it("caps an over-long query instead of rejecting the request", () => {
    const r = parseCameraRequest({ placeText: "Banff", query: "q".repeat(CAMERA_REQUEST_QUERY_MAX + 50) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.query).toHaveLength(CAMERA_REQUEST_QUERY_MAX);
  });

  it("rejects a malformed email but allows a blank one", () => {
    expect(parseCameraRequest({ placeText: "Banff", email: "not-an-email" }).ok).toBe(false);
    const blank = parseCameraRequest({ placeText: "Banff", email: "   " });
    expect(blank.ok).toBe(true);
    if (blank.ok) expect(blank.data.email).toBeNull();
  });

  it("drops a session id outside the analytics shape", () => {
    const r = parseCameraRequest({ placeText: "Banff", sessionId: "has spaces!;drop" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.sessionId).toBeNull();
  });

  it("never takes a userId from the body", () => {
    const r = parseCameraRequest({ placeText: "Banff", userId: "someone-else" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).not.toHaveProperty("userId");
  });
});

describe("isCameraRequestHoneypotTripped", () => {
  it("trips only on a filled hidden field", () => {
    expect(isCameraRequestHoneypotTripped({ website: "http://spam.example" })).toBe(true);
    expect(isCameraRequestHoneypotTripped({ website: "" })).toBe(false);
    expect(isCameraRequestHoneypotTripped({ website: "  " })).toBe(false);
    expect(isCameraRequestHoneypotTripped({})).toBe(false);
    expect(isCameraRequestHoneypotTripped(null)).toBe(false);
  });
});
