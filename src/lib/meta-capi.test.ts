import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMetaEventPayload,
  hashEmailForMeta,
  metaUserDataFromRequest,
  sendMetaEvent,
} from "./meta-capi";

// sha256("test@example.com"), computed independently of this module.
const TEST_EMAIL_SHA256 =
  "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b";

describe("hashEmailForMeta", () => {
  it("hashes the trimmed, lowercased email", () => {
    expect(hashEmailForMeta("  Test@Example.COM ")).toBe(TEST_EMAIL_SHA256);
    // Cross-check the pinned constant against node:crypto directly.
    expect(
      createHash("sha256").update("test@example.com").digest("hex"),
    ).toBe(TEST_EMAIL_SHA256);
  });
});

describe("buildMetaEventPayload", () => {
  it("builds the Graph shape with hashed em and match keys", () => {
    const payload = buildMetaEventPayload(
      {
        eventName: "Purchase",
        eventId: "cs_test_123",
        eventSourceUrl: "https://worldeye.app/welcome",
        userData: {
          email: "Test@Example.com",
          fbp: "fb.1.123.456",
          fbc: "fb.1.123.IwAR-test",
          clientIp: "203.0.113.7",
          userAgent: "Mozilla/5.0",
        },
        value: 13.99,
        currency: "USD",
      },
      1_700_000_000,
    );
    expect(payload.data).toHaveLength(1);
    const [event] = payload.data as unknown as Record<string, unknown>[];
    expect(event.event_name).toBe("Purchase");
    expect(event.event_time).toBe(1_700_000_000);
    expect(event.event_id).toBe("cs_test_123");
    expect(event.action_source).toBe("website");
    expect(event.event_source_url).toBe("https://worldeye.app/welcome");
    expect(event.user_data).toEqual({
      em: [TEST_EMAIL_SHA256],
      fbp: "fb.1.123.456",
      fbc: "fb.1.123.IwAR-test",
      client_ip_address: "203.0.113.7",
      client_user_agent: "Mozilla/5.0",
    });
    expect(event.custom_data).toEqual({ value: 13.99, currency: "USD" });
  });

  it("omits absent user_data keys and event_source_url / custom_data", () => {
    const payload = buildMetaEventPayload(
      { eventName: "InitiateCheckout", eventId: "evt-1", userData: {} },
      42,
    );
    const [event] = payload.data as unknown as Record<string, unknown>[];
    expect(event.user_data).toEqual({});
    expect(event).not.toHaveProperty("event_source_url");
    expect(event).not.toHaveProperty("custom_data");
  });
});

describe("metaUserDataFromRequest", () => {
  it("extracts _fbp/_fbc, first forwarded IP and user agent", () => {
    const req = new Request("https://worldeye.app/api/checkout", {
      headers: {
        cookie: "foo=bar; _fbp=fb.1.111.222; _fbc=fb.1.111.click",
        "x-forwarded-for": "198.51.100.3, 10.0.0.1",
        "user-agent": "TestAgent/1.0",
      },
    });
    expect(metaUserDataFromRequest(req, "a@b.co")).toEqual({
      email: "a@b.co",
      fbp: "fb.1.111.222",
      fbc: "fb.1.111.click",
      clientIp: "198.51.100.3",
      userAgent: "TestAgent/1.0",
    });
  });

  it("returns nulls when the headers are absent", () => {
    const req = new Request("https://worldeye.app/");
    expect(metaUserDataFromRequest(req)).toEqual({
      email: null,
      fbp: null,
      fbc: null,
      clientIp: null,
      userAgent: null,
    });
  });
});

describe("sendMetaEvent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a clean no-op when META_CAPI_ACCESS_TOKEN is unset", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    await expect(
      sendMetaEvent({ eventName: "CompleteRegistration", eventId: "e1" }, fetchImpl),
    ).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("POSTs the payload to the dataset events endpoint when configured", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "TEST_TOKEN");
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    await expect(
      sendMetaEvent(
        { eventName: "StartTrial", eventId: "cs_1", userData: { email: "t@e.co" } },
        fetchImpl,
      ),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("graph.facebook.com/v21.0/1785770122642831/events");
    expect(url).toContain("access_token=TEST_TOKEN");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { data: { event_name: string }[] };
    expect(body.data[0].event_name).toBe("StartTrial");
    // The token must never leak into the event payload itself.
    expect(String(init.body)).not.toContain("TEST_TOKEN");
  });

  it("swallows transport failures — never throws into the caller", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "TEST_TOKEN");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(
      sendMetaEvent({ eventName: "Purchase", eventId: "cs_2" }, fetchImpl),
    ).resolves.toBe(false);
  });
});
