import { describe, it, expect } from "vitest";
import { renderTemplate, firstNameOf, templateTokens } from "./templates";

const meta = {
  name: "Dianna Rivera",
  org: "Abundant Living Citi Church",
  role: "School Board",
  segment: "A-private-school-FL",
};

describe("renderTemplate", () => {
  it("resolves the well-known tokens", () => {
    expect(renderTemplate("Hi {{first_name}} at {{org}} ({{role}})", meta)).toBe(
      "Hi Dianna at Abundant Living Citi Church (School Board)",
    );
  });

  it("resolves any other meta key, case-insensitively, with optional spaces", () => {
    expect(renderTemplate("seg={{ Segment }}", meta)).toBe("seg=A-private-school-FL");
  });

  it("renders unknown tokens as empty so no raw placeholder can send", () => {
    expect(renderTemplate("a {{nope}} b", meta)).toBe("a  b");
  });

  it("handles empty meta", () => {
    expect(renderTemplate("Hi {{first_name}}", {})).toBe("Hi ");
    expect(renderTemplate("Hi {{first_name}}", null)).toBe("Hi ");
  });
});

describe("firstNameOf", () => {
  it("derives from name", () => {
    expect(firstNameOf({ name: "Lee Lockhart" })).toBe("Lee");
  });
  it("prefers an explicit first_name", () => {
    expect(firstNameOf({ name: "Lee Lockhart", first_name: "L." })).toBe("L.");
  });
  it("is empty without a name", () => {
    expect(firstNameOf({})).toBe("");
    expect(firstNameOf(undefined)).toBe("");
  });
});

describe("templateTokens", () => {
  it("lists distinct tokens sorted", () => {
    expect(templateTokens("{{org}} {{first_name}} {{org}}")).toEqual(["first_name", "org"]);
  });
});
