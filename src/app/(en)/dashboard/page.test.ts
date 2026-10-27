// Smoke pin for the member dashboard shell:
//  - signed out → redirect to /signin?callbackUrl=/dashboard
//    (the settings/team server-gate pattern);
//  - signed in  → renders inside .docs-root (releases the globe's
//    viewport lock so the page scrolls on a phone), with the member
//    header, plan badge, real stat values and the three sections.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  // Account-settings ship: the dashboard now renders SetNamePrompt,
  // which reads usePathname.
  usePathname: () => "/dashboard",
}));
vi.mock("@/lib/camera-alerts/tier", () => ({ getUserTier: vi.fn(async () => "vip") }));
vi.mock("@/lib/db", () => ({
  db: {
    savedCamera: { count: vi.fn(async () => 7) },
    alertRule: { count: vi.fn(async () => 3) },
    clipMeta: { aggregate: vi.fn(async () => ({ _sum: { durationSec: 125 }, _count: 4 })) },
    alertEvent: { count: vi.fn(async () => 2) },
  },
}));
vi.mock("@/components/dashboard/DashboardCameras", () => ({ default: () => null }));
vi.mock("@/components/dashboard/DashboardAlerts", () => ({ default: () => null }));
vi.mock("@/components/dashboard/DashboardRecordings", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects signed-out visitors to sign-in with the dashboard callback", async () => {
    authMock.mockResolvedValue(null);
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/signin?callbackUrl=/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/signin?callbackUrl=/dashboard");
  });

  it("renders the member shell with real stats for a signed-in user", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1", name: "Jamie Example", email: "jamie@example.com" },
    });
    const html = renderToString(await DashboardPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("docs-root");
    expect(html).toContain("Jamie Example");
    expect(html).toContain("jamie@example.com");
    expect(html).toContain("VIP PRO");
    // Quick stats come from the (mocked) stores: 7 tracked, 3 active
    // alerts, 4 clips, 2 unread.
    expect(html).toContain(">7<");
    expect(html).toContain(">3<");
    expect(html).toContain(">4<");
    expect(html).toContain(">2<");
    expect(html).toContain('id="cameras"');
    expect(html).toContain('id="alerts"');
    expect(html).toContain('id="recordings"');
    expect(html).toContain("/settings/subscription");
    expect(html).toContain("/affiliates");
  });
});
