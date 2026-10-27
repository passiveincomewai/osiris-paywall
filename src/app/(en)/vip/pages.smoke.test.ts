// Render smoke for the /vip surfaces: the shell must carry .docs-root
// (releases the globe's viewport lock, or the page can't scroll on a
// phone), the hub must show the lock to non-VIP members and the
// feature cards to everyone, and the brief page must render its
// sections for a VIP and the lock for a Pro member — server-side.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  session: null as {
    user?: { id?: string; planTier?: string; subscriptionStatus?: string };
  } | null,
  sub: null as { status: string; currentPeriodEnd: Date; stripePriceId: string } | null,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(async () => mocks.sub) },
  },
}));
vi.mock("@/lib/vip/brief", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    buildBrief: vi.fn(async () => ({
      generatedAt: "2026-10-21T12:00:00Z",
      places: [{ id: "p1", name: "Home", lat: 41.2, lng: -112, radiusKm: 250 }],
      cameraEvents: [],
      eventEvents: [{ id: "e1", kind: "quake", title: "M5.2 — near Home", createdAt: "2026-10-21T11:00:00Z" }],
      quakesNear: [],
      quakesStrongest: [],
      launches: [
        { id: "l1", name: "Rocket | Mission", netMs: Date.now() + 3_600_000, providerName: "Provider", padLocation: "Pad 39A" },
      ],
      passes: [],
      emailEnabled: false,
    })),
  };
});

import VipHubPage from "./page";
import VipBriefPage from "./brief/page";

const FUTURE = new Date("2027-10-21T12:00:00Z");

function signIn(tier: "vip" | "pro") {
  mocks.session = {
    user: {
      id: "user-1",
      planTier: tier,
      subscriptionStatus: "active",
    },
  };
  mocks.sub = {
    status: "active",
    currentPeriodEnd: FUTURE,
    stripePriceId: tier === "vip" ? "price_annual" : "price_monthly",
  };
}

beforeEach(() => {
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  mocks.session = null;
  mocks.sub = null;
  vi.clearAllMocks();
});

describe("/vip hub", () => {
  it("renders inside .docs-root and lists the three new features", async () => {
    signIn("vip");
    const html = renderToString(await VipHubPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("docs-root");
    expect(html).toContain("Event alerts");
    expect(html).toContain("Personal brief");
    expect(html).toContain("Saved views");
    expect(html).not.toContain("These features come with VIP Pro");
  });

  it("embeds a live preview of the real dashboard with a full-page link", async () => {
    signIn("vip");
    const html = renderToString(await VipHubPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("Your dashboard — live preview");
    // The preview is the actual /dashboard page in a same-origin frame,
    // not a mockup: the iframe src and the full-page link both point at it.
    expect(html).toContain('src="/dashboard"');
    expect(html).toContain("Open full dashboard");
    expect(html).toContain('href="/dashboard"');
  });

  it("shows the VIP lock to a signed-in Pro member", async () => {
    signIn("pro");
    const html = renderToString(await VipHubPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("These features come with VIP Pro");
  });

  it("prompts sign-in when signed out", async () => {
    const html = renderToString(await VipHubPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("Sign in to open your VIP hub");
    // The dashboard preview still renders signed out — the frame shows
    // /dashboard's own sign-in screen, and the copy says so honestly.
    expect(html).toContain('src="/dashboard"');
    expect(html).toContain("sign-in screen");
  });
});

describe("/vip/brief", () => {
  it("renders the personalised sections for a VIP (DB-fresh tier)", async () => {
    signIn("vip");
    const html = renderToString(await VipBriefPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("docs-root");
    expect(html).toContain("Your alerts — last 24 hours");
    expect(html).toContain("M5.2 — near Home");
    expect(html).toContain("Launches — next 48 hours");
    expect(html).toContain("Daily email: OFF");
  });

  it("locks a Pro member out server-side", async () => {
    signIn("pro");
    const html = renderToString(await VipBriefPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("The personal brief is a VIP Pro feature");
    expect(html).not.toContain("M5.2 — near Home");
  });
});
