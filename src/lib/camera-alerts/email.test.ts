import { describe, it, expect } from "vitest";
import { cameraAlertEmail } from "@/lib/email";

const base = {
  cameraName: "Powder Mountain Rd",
  condition: "snow on the road",
  observation: "Snow covers both lanes.",
  frameTimeLabel: "3:40 PM UTC",
  imageUrl: "https://worldeye.app/api/camera-alerts/events/evt-1/image?t=tok",
  cameraUrl: "https://worldeye.app/?camera=cam-1",
  alertsUrl: "https://worldeye.app/settings/alerts",
};

describe("cameraAlertEmail — composition pins", () => {
  it("names the camera, the condition and what the check reports", () => {
    const { subject, html } = cameraAlertEmail(base);
    expect(subject).toBe("Camera alert: Powder Mountain Rd");
    expect(html).toContain("Powder Mountain Rd");
    expect(html).toContain("snow on the road");
    expect(html).toContain("Our check of the 3:40 PM UTC image reports:");
    expect(html).toContain("Snow covers both lanes.");
  });

  it("frames the observation as an AI look, never a certainty", () => {
    const { html } = cameraAlertEmail(base);
    expect(html).toContain("automated look at a single photo, not a guarantee");
    expect(html.toLowerCase()).not.toContain("definitely");
    expect(html.toLowerCase()).not.toContain("confirmed:");
  });

  it("carries the checked photo and both links; no photo, no img tag", () => {
    const withImg = cameraAlertEmail(base);
    expect(withImg.html).toContain('src="https://worldeye.app/api/camera-alerts/events/evt-1/image?t=tok"');
    expect(withImg.html).toContain("https://worldeye.app/?camera=cam-1");
    expect(withImg.html).toContain("https://worldeye.app/settings/alerts");
    const noImg = cameraAlertEmail({ ...base, imageUrl: null });
    expect(noImg.html).not.toContain("<img");
  });

  it("escapes member-written text", () => {
    const { html } = cameraAlertEmail({ ...base, condition: '<script>alert(1)</script>' });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
