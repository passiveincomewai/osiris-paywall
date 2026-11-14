import { describe, it, expect } from "vitest";
import { parseRecipientInput, parseCsv } from "./parse";

describe("parseCsv", () => {
  it("handles quoted fields with commas", () => {
    expect(parseCsv('a,"b,c",d\n1,2,3')).toEqual([
      ["a", "b,c", "d"],
      ["1", "2", "3"],
    ]);
  });
});

describe("parseRecipientInput — CSV with header", () => {
  const csv = [
    "email,name,org,role,segment,source_url",
    "academy@citichurchmiami.com,Dianna Rivera,Abundant Living Citi Church,School Board,A-private-school-FL,https://example.com/dir.pdf",
    'llockhart@academyprep.org,Lee Lockhart,"Academy Prep Center Of St. Petersburg, Inc.",Operations Manager,A-private-school-FL,https://example.com/dir.pdf',
    "not-an-email,Nobody,Nowhere,,,,",
  ].join("\n");

  it("maps every non-email column into meta", () => {
    const { recipients } = parseRecipientInput(csv);
    expect(recipients).toHaveLength(2);
    expect(recipients[0].email).toBe("academy@citichurchmiami.com");
    expect(recipients[0].meta).toMatchObject({
      name: "Dianna Rivera",
      org: "Abundant Living Citi Church",
      role: "School Board",
      segment: "A-private-school-FL",
    });
    expect(recipients[1].meta.org).toBe("Academy Prep Center Of St. Petersburg, Inc.");
  });

  it("reports rows without a valid email as invalid", () => {
    const { invalid } = parseRecipientInput(csv);
    expect(invalid).toHaveLength(1);
  });

  it("normalizes case and whitespace on emails", () => {
    const { recipients } = parseRecipientInput("email,name\n  Mixed@Example.COM ,A");
    expect(recipients[0].email).toBe("mixed@example.com");
  });
});

describe("parseRecipientInput — free text", () => {
  it("takes one email per line", () => {
    const { recipients, invalid } = parseRecipientInput("a@x.com\nb@y.org\njunk line");
    expect(recipients.map((r) => r.email)).toEqual(["a@x.com", "b@y.org"]);
    expect(invalid).toEqual(["junk line"]);
  });

  it("captures the name from a Name <email> line", () => {
    const { recipients } = parseRecipientInput("Jane Doe <jane@school.edu>");
    expect(recipients[0]).toEqual({ email: "jane@school.edu", meta: { name: "Jane Doe" } });
  });

  it("returns empty for empty input", () => {
    expect(parseRecipientInput("  \n ")).toEqual({ recipients: [], invalid: [] });
  });
});
