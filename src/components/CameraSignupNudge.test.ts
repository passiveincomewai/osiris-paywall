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
    expect(html).toContain("Start 3-Day Free Trial");
    expect(html).not.toContain("Loading secure checkout…");
    // The invite-a-friend section sits under the plans: the promise,
    // its join condition, and room to scroll (the card caps its height).
    expect(html).toContain("data-invite-friends");
    expect(html).toContain("Invite a friend — get 15 more camera checks");
    expect(html).toContain("not just for sending it");
    expect(html).toContain("overflow-y-auto");
  });
});
