import { describe, expect, it } from "vitest";
import { cameraAlt } from "./camera-alt";

describe("cameraAlt", () => {
  it("enriches a functional camera name with its city and country", () => {
    expect(
      cameraAlt({ name: "I-15 @ 9000 S", city: "Sandy", country: "United States" }),
    ).toBe("I-15 @ 9000 S — live camera in Sandy, United States");
  });

  it("does not repeat a place the name already contains", () => {
    expect(
      cameraAlt({ name: "Tokyo Tower", city: "Tokyo", country: "Japan" }),
    ).toBe("Tokyo Tower — live camera in Japan");
  });

  it("falls back to the name alone when the record carries no place", () => {
    expect(cameraAlt({ name: "Harbour Cam" })).toBe("Harbour Cam — live camera");
    expect(cameraAlt({ name: "Harbour Cam", city: "", country: null })).toBe(
      "Harbour Cam — live camera",
    );
  });

  it("uses only the place parts present", () => {
    expect(cameraAlt({ name: "Beach Cam", country: "Spain" })).toBe(
      "Beach Cam — live camera in Spain",
    );
  });
});
