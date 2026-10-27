// Ingest tests for POST /api/analytics/track with the onboarding fields.
// Verifies (against a mocked db, the repo's route-test pattern) that:
//  - onboarding events are stored with the :detail suffix folded in,
//  - the A/B variant is stamped from the we_onb_group cookie (Build A's
//    contract: trackAnalyticsEvent sends no body variant) and normalized
//    to "A"/"B", with an explicit body variant taking precedence,
//  - device class is stamped from the User-Agent when not reported.
// Run: npx vitest run src/app/api/analytics/track/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { created } = vi.hoisted(() => ({ created: [] as Record<string, unknown>[] }));

vi.mock("@/lib/db", () => ({
  db: {
    pageView: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "pv_x", ...data };
      },
      findFirst: async () => null,
      update: async () => ({}),
    },
  },
}));
vi.mock("@/auth", () => ({ auth: async () => null }));

import { POST } from "./route";

function req(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

beforeEach(() => {
  created.length = 0;
});

describe("POST /api/analytics/track — onboarding stamping", () => {
  it("stores a step event with its detail suffix folded into the event name", async () => {
    const res = await POST(
      req(
        { path: "/", sessionId: "s1", event: "onboarding_step_complete", detail: "3" },
        { cookie: "we_onb_group=b", "user-agent": IPHONE_UA },
      ),
    );
    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      event: "onboarding_step_complete:3",
      variant: "B", // cookie "b" normalized
      device: "mobile", // derived from the iPhone UA
      sessionId: "s1",
    });
  });

  it("accepts events Build A emits pre-suffixed (name:detail in one string)", async () => {
    await POST(req({ path: "/", sessionId: "s2", event: "feature_first_use:camera" }, { cookie: "we_onb_group=a" }));
    expect(created[0]).toMatchObject({ event: "feature_first_use:camera", variant: "A" });
  });

  it("prefers an explicit body variant over the cookie and rejects junk values", async () => {
    await POST(req({ path: "/", sessionId: "s3", event: "onboarding_start", variant: "B" }, { cookie: "we_onb_group=a" }));
    expect(created[0].variant).toBe("B");
    created.length = 0;
    await POST(req({ path: "/", sessionId: "s3", event: "onboarding_start", variant: "Z" }, { cookie: "we_onb_group=zzz" }));
    expect(created[0].variant).toBeNull();
  });

  it("stamps variant + device on plain page views too (session resolution source)", async () => {
    await POST(req({ path: "/", sessionId: "s4", referrer: null }, { cookie: "we_onb_group=b", "user-agent": IPHONE_UA }));
    expect(created[0]).toMatchObject({ variant: "B", device: "mobile" });
    expect("event" in created[0]).toBe(false);
  });

  it("keeps legacy payloads working: no cookie, no variant -> null stamps, desktop UA", async () => {
    await POST(
      req(
        { path: "/pricing", sessionId: "s5" },
        { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0" },
      ),
    );
    expect(created[0]).toMatchObject({ variant: null, device: "desktop", path: "/pricing" });
  });
});

describe("POST /api/analytics/track — search_performed detail", () => {
  it("stores the structured count+query detail on the search event", async () => {
    await POST(req({ path: "/", sessionId: "s6", event: "search_performed", detail: "0_jamaica" }));
    expect(created[0]).toMatchObject({ event: "search_performed:0_jamaica" });
  });

  it("keeps search details longer than the 24-char bare-token cap", async () => {
    await POST(
      req({ path: "/", sessionId: "s6", event: "search_performed", detail: "7_a_much_longer_place_name_query_token" }),
    );
    expect(created[0]).toMatchObject({ event: "search_performed:7_a_much_longer_place_name_query_token" });
  });

  it("drops a malformed search detail but still records the bare event", async () => {
    await POST(req({ path: "/", sessionId: "s6", event: "search_performed", detail: "jamaica" }));
    expect(created[0]).toMatchObject({ event: "search_performed" });
  });

  it("leaves other events on the bare-token rule (long detail truncated to 24)", async () => {
    await POST(req({ path: "/", sessionId: "s6", event: "feature_first_use", detail: "x".repeat(40) }));
    expect(created[0]).toMatchObject({ event: `feature_first_use:${"x".repeat(24)}` });
  });
});
