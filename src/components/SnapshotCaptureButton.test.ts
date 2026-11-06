// Render pins for the camera viewer's "Capture this moment" control.
// Node-only renderToString harness, as everywhere here: effects never
// fire, so this pins the control's initial face — the button a visitor
// sees before any capture — and the cases where the control must not
// appear at all: a camera with no catalogue id (its card could carry
// no working link) and a non-inline view (an external/offline camera
// shows no picture to capture).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import SnapshotCaptureButton from "./SnapshotCaptureButton";

const noVideo = () => null;

describe("SnapshotCaptureButton", () => {
  it("renders the capture control for an inline catalogue camera", () => {
    const html = renderToString(
      createElement(SnapshotCaptureButton, {
        camera: { id: "cam-1", name: "Powder Mountain", stream_type: "jpg" },
        getVideo: noVideo,
        inline: true,
      }),
    );
    expect(html).toContain("Capture this moment as a share card");
    // The panel is closed until clicked — no card leaks into first paint.
    expect(html).not.toContain("CAPTURE THIS MOMENT");
  });

  it("renders nothing without a camera id, without a camera, or when not inline", () => {
    expect(
      renderToString(createElement(SnapshotCaptureButton, { camera: { name: "No id" }, getVideo: noVideo, inline: true })),
    ).toBe("");
    expect(
      renderToString(createElement(SnapshotCaptureButton, { camera: null, getVideo: noVideo, inline: true })),
    ).toBe("");
    expect(
      renderToString(createElement(SnapshotCaptureButton, { camera: { id: "cam-1", name: "X" }, getVideo: noVideo, inline: false })),
    ).toBe("");
  });
});
