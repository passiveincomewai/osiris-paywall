// Membership gate (Phase 2, Rule 1): pure evaluateStudioAccess tests —
// all four outcomes plus precedence (inactive beats membership).
import { describe, it, expect } from "vitest";
import { evaluateStudioAccess } from "./access";

describe("evaluateStudioAccess", () => {
  it("returns not_affiliate when there is no profile", () => {
    expect(evaluateStudioAccess(null, true)).toBe("not_affiliate");
    expect(evaluateStudioAccess(null, false)).toBe("not_affiliate");
  });

  it("returns inactive when the profile is not active", () => {
    expect(evaluateStudioAccess({ status: "suspended" }, true)).toBe("inactive");
    expect(evaluateStudioAccess({ status: "pending" }, true)).toBe("inactive");
  });

  it("returns membership_required for an active affiliate without a membership", () => {
    expect(evaluateStudioAccess({ status: "active" }, false)).toBe("membership_required");
  });

  it("returns ok for an active affiliate with an active membership", () => {
    expect(evaluateStudioAccess({ status: "active" }, true)).toBe("ok");
  });

  it("gives inactive precedence over membership", () => {
    // A non-active affiliate without a membership is "inactive", not
    // "membership_required" — membership is only checked for active profiles.
    expect(evaluateStudioAccess({ status: "suspended" }, false)).toBe("inactive");
    expect(evaluateStudioAccess({ status: "pending" }, false)).toBe("inactive");
  });
});
