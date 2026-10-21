import { describe, expect, it } from "vitest";
import { liveCaptureSupported } from "./capture-support";

const fullWindow = {
  MediaRecorder: function MediaRecorder() {},
  HTMLVideoElement: { prototype: { captureStream: () => {} } },
};

describe("liveCaptureSupported", () => {
  it("accepts a browser with captureStream and MediaRecorder", () => {
    expect(liveCaptureSupported(fullWindow)).toBe(true);
  });

  it("accepts the Firefox mozCaptureStream spelling", () => {
    expect(
      liveCaptureSupported({
        MediaRecorder: function MediaRecorder() {},
        HTMLVideoElement: { prototype: { mozCaptureStream: () => {} } },
      }),
    ).toBe(true);
  });

  it("refuses when either primitive is missing", () => {
    expect(liveCaptureSupported({ HTMLVideoElement: { prototype: { captureStream: () => {} } } })).toBe(false);
    expect(liveCaptureSupported({ MediaRecorder: function MediaRecorder() {} })).toBe(false);
    expect(
      liveCaptureSupported({
        MediaRecorder: function MediaRecorder() {},
        HTMLVideoElement: { prototype: {} },
      }),
    ).toBe(false);
  });

  it("refuses an absent window (server render)", () => {
    expect(liveCaptureSupported(null)).toBe(false);
    expect(liveCaptureSupported(undefined)).toBe(false);
  });
});
