import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({ db: { subscription: { findUnique: vi.fn() } } }));

import { parseVisionReply } from "./vision";
import { tierFromSubscription } from "./tier";

describe("parseVisionReply", () => {
  it("reads a clean JSON verdict", () => {
    expect(parseVisionReply('{"matches": true, "observation": "Snow covers both lanes."}')).toEqual({
      verdict: "matches",
      observation: "Snow covers both lanes.",
    });
    expect(parseVisionReply('{"matches": false, "observation": "Dry, clear asphalt."}').verdict).toBe("clear");
    expect(parseVisionReply('{"matches": null, "observation": "The image is nearly black."}').verdict).toBe("unknown");
  });
  it("tolerates fences and prose around the JSON", () => {
    const fenced = "```json\n{\"matches\": true, \"observation\": \"Flooding across the road.\"}\n```";
    expect(parseVisionReply(fenced).verdict).toBe("matches");
    expect(parseVisionReply('Here is my answer: {"matches": false, "observation": "Empty road."}').verdict).toBe("clear");
  });
  it("maps garbage, empties and off-spec shapes to unknown — never a guess", () => {
    expect(parseVisionReply("").verdict).toBe("unknown");
    expect(parseVisionReply("I think it might be snowing").verdict).toBe("unknown");
    expect(parseVisionReply('{"matches": "yes", "observation": "Snow."}').verdict).toBe("unknown");
    expect(parseVisionReply('{"observation": "Snow."}').verdict).toBe("unknown");
  });
  it("caps a runaway observation", () => {
    const long = "a".repeat(500);
    expect(parseVisionReply(`{"matches": true, "observation": "${long}"}`).observation.length).toBe(300);
  });
});
