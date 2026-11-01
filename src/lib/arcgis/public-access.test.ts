// TEMPORARY public test access (public-access.ts): the shipped switch
// value and its read point. The gate behaviour in both switch states is
// pinned through apiGate in src/middleware.test.ts — when the switch is
// reverted to false, update that block's ArcGIS expectations.
import { describe, it, expect } from "vitest";
import { ARCGIS_PUBLIC_TEST_ACCESS, arcgisPublicTestAccess } from "./public-access";

describe("the switch itself", () => {
  it("arcgisPublicTestAccess reads the constant", () => {
    expect(arcgisPublicTestAccess()).toBe(ARCGIS_PUBLIC_TEST_ACCESS);
  });

  it("ships ON for the owner's temporary test window (flip to false to revert)", () => {
    expect(ARCGIS_PUBLIC_TEST_ACCESS).toBe(true);
  });
});
