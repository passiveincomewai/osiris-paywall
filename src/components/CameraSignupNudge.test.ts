// Render pins for the camera-limit popup (Jameson's screenshot): the
// honest limit message, the trial picker in embedded mode (plan list
// first — the checkout form mounts only after a pick), and the two
// quiet exits. Node-only renderToString harness, as everywhere here.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import CameraSignupNudge from "./CameraSignupNudge";
import { FREE_CAMERA_CLICKS } from "@/lib/cameraGate";

describe("CameraSignupNudge", () => {
  it("states the limit plainly and leads with the embedded-mode picker", () => {
    const html = renderToString(
      createElement(CameraSignupNudge, { onClose: vi.fn() }),
    )
      .replace(/<!-- -->/g, "")
      .replace(/&#x27;/g, "'");
    expect(html).toContain("Unlock unlimited cameras");
    expect(html).toContain(`You've opened your ${FREE_CAMERA_CLICKS} free cameras`);
    expect(html).toContain("Compare Free vs Pro first");
    expect(html).toContain("Maybe later");
    // Plan list first: all three CTAs, and no checkout form yet — the
    // embedded swap happens on a pick, in place.
    expect(html).toContain("Start 10-Day Free Trial");
    expect(html).not.toContain("Loading secure checkout…");
    // The invite-a-friend section sits under the plans: the promise,
    // its join condition, and room to scroll (the card caps its height).
    expect(html).toContain("data-invite-friends");
    expect(html).toContain("Invite a friend — get 15 more camera checks");
    expect(html).toContain("not just for sending it");
    expect(html).toContain("overflow-y-auto");
  });
});

// Wave 2 (BRIEF F4): the ladder rungs. The wall must offer the NEXT
// step — email, then account — and only show the Pro picker once the
// free-account allowance (15) is used up.
describe("CameraSignupNudge — ladder rungs", () => {
  const render = (props: Record<string, unknown>) =>
    renderToString(createElement(CameraSignupNudge, { onClose: vi.fn(), ...props }))
      .replace(/<!-- -->/g, "")
      .replace(/&#x27;/g, "'");

  it("email rung: the owner's headline, the instant-unlock email form, the account path — no Pro demand", () => {
    const html = render({ rung: "email" });
    expect(html).toContain("Create a free account to get 10 more free opens");
    expect(html).toContain(`You've opened your ${FREE_CAMERA_CLICKS} free cameras`);
    expect(html).toContain("no password needed");
    // The existing newsletter form (double opt-in subscribe) is the unlock.
    expect(html).toContain('type="email"');
    expect(html).toContain("Subscribe");
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/signin"');
    expect(html).toContain("Maybe later");
    // NOT the Pro wall: no picker, no unlimited pitch.
    expect(html).not.toContain("Unlock unlimited cameras");
    expect(html).not.toContain("Start 1-Day Free Trial");
  });

  it("account rung: completing the account is the ask, with the true totals", () => {
    const html = render({ rung: "account", opensUsed: 10 });
    expect(html).toContain("Create your free account to get 5 more free opens");
    expect(html).toContain("You've opened your 10 free cameras");
    expect(html).toContain("15 in all");
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/signin"');
    expect(html).not.toContain("Unlock unlimited cameras");
    expect(html).not.toContain('type="email"');
  });

  it("pro rung: the trial picker leads, with the account allowance in the copy", () => {
    const html = render({ rung: "pro", opensUsed: 15 });
    expect(html).toContain("Unlock unlimited cameras");
    expect(html).toContain("You've opened your 15 free cameras");
    expect(html).toContain("Start 10-Day Free Trial");
    expect(html).toContain("Maybe later");
  });
});
