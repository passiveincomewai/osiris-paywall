// Render pins for the globe camera viewer's Set alert control.
// Node-only renderToString harness, as everywhere here: effects never
// fire, so this pins the control's initial face — the button a member
// sees before any fetch resolves — and the id-less case, where no rule
// could ever be created and the control must not appear at all.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import CameraAlertButton from "./CameraAlertButton";

describe("CameraAlertButton", () => {
  it("renders the Set alert control for a catalogue camera", () => {
    const html = renderToString(
      createElement(CameraAlertButton, {
        camera: {
          id: "cam-1",
          name: "Powder Mountain",
          stream_type: "jpg",
          feed_url: "https://cam.example/x.jpg",
        },
      }),
    );
    expect(html).toContain("Set alert for this camera");
    // The panel is closed until clicked — no form leaks into first paint.
    expect(html).not.toContain("START WATCHING");
  });

  it("renders nothing without a camera id", () => {
    expect(renderToString(createElement(CameraAlertButton, { camera: { name: "No id" } }))).toBe(
      "",
    );
    expect(renderToString(createElement(CameraAlertButton, { camera: null }))).toBe("");
  });
});
