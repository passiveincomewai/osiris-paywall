import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/sensing-ping", () => {
  it("answers 204 with no-store and an empty body", async () => {
    const res = await GET();
    expect(res.status).toBe(204);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("");
  });
});
