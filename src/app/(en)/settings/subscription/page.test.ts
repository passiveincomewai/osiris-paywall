// Page shell + entry-point pins for in-house subscription management
// (scope G):
//  - /settings/subscription renders inside a .docs-root shell (the
//    viewport-lock release every settings-family page needs);
//  - the small cancel button on the new page is the portal flow's home;
//  - BOTH old "Manage subscription" buttons (settings + header menu) now
//    link here instead of POSTing to the Stripe portal.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import SubscriptionPage from "./page";

const src = (rel: string) => readFileSync(join(process.cwd(), "src", rel), "utf8");

describe("SubscriptionPage", () => {
  it("renders inside a .docs-root shell so the document scrolls", () => {
    const html = renderToString(SubscriptionPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("docs-root");
  });

  it("cancel is a small text button on the new page, still using the portal flow", () => {
    const client = src("app/(en)/settings/subscription/SubscriptionClient.tsx");
    expect(client).toContain("Cancel subscription");
    expect(client).toContain("/api/billing/portal");
  });
});

describe("entry points rewired", () => {
  it("settings Manage subscription links to /settings/subscription, no portal POST", () => {
    const settings = src("app/(en)/settings/SettingsClient.tsx");
    expect(settings).toContain('href="/settings/subscription"');
    expect(settings).not.toContain("/api/billing/portal");
    expect(settings).not.toContain("openPortal");
  });

  it("header menu Manage subscription links to /settings/subscription, no portal POST", () => {
    const menu = src("components/HeaderProfileMenu.tsx");
    expect(menu).toContain('href="/settings/subscription"');
    expect(menu).not.toContain("/api/billing/portal");
    expect(menu).not.toContain("openPortal");
  });
});
