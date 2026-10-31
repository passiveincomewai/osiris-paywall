import { describe, expect, it } from "vitest";
import { auroraAlertEmail } from "./email";

describe("auroraAlertEmail", () => {
  const mail = auroraAlertEmail({
    name: "Jameson Lythgoe",
    placeName: "Tromsø",
    nightLabel: "Saturday, October 24",
    tonightKp: 6.33,
    requiredKp: 2,
  });

  it("subjects the forecast honestly, with the formatted Kp", () => {
    expect(mail.subject).toBe("Aurora likely tonight over Tromsø — Kp 6.3 forecast");
  });

  it("carries the storm scale, the caveats, and the cameras CTA", () => {
    expect(mail.html).toContain("G2 geomagnetic storm");
    expect(mail.html).toContain("clear, dark sky");
    expect(mail.html).toContain("can strengthen, fade, or shift");
    expect(mail.html).toContain("/northern-lights-webcams");
    expect(mail.html).toContain("Hi Jameson");
  });

  it("never promises a sighting", () => {
    expect(mail.html.toLowerCase()).not.toContain("guarantee");
    expect(mail.html.toLowerCase()).not.toContain("will see");
    expect(mail.html.toLowerCase()).not.toContain("visible tonight at");
  });

  it("escapes a hostile place name and skips the greeting without a name", () => {
    const m = auroraAlertEmail({
      name: null,
      placeName: "<script>alert(1)</script>",
      nightLabel: "Tonight",
      tonightKp: 3,
      requiredKp: 3,
    });
    expect(m.html).not.toContain("<script>alert(1)</script>");
    expect(m.html).not.toContain("Hi ");
    // Below storm level: no G-scale claim.
    expect(m.html).not.toContain("geomagnetic storm)");
  });
});
