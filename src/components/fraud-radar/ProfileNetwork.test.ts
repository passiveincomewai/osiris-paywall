import { describe, it, expect, vi, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { ProfileNetworkSection, neighbourProfileHref } from "./ProfileNetwork";

/**
 * §6.3 contract pins: the section is absent when the graphs root
 * is unconfigured (profiles never degrade for a hosting gap), and
 * present — with the legend sentence — when it is configured.
 */
const FIXTURES = fileURLToPath(
  new URL("../../lib/fraud-radar/__fixtures__/graphs", import.meta.url),
);
afterEach(() => vi.unstubAllEnvs());

describe("ProfileNetworkSection", () => {
  it("renders null while FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT is unset", async () => {
    vi.stubEnv("FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT", "");
    const out = await ProfileNetworkSection({
      engine: "grants",
      entityKey: "ABC123DEF456",
    });
    expect(out).toBeNull();
  });

  it("renders the section (legend included) when configured", async () => {
    vi.stubEnv("FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT", FIXTURES);
    const out = await ProfileNetworkSection({
      engine: "grants",
      entityKey: "ABC123DEF456",
    });
    expect(out).not.toBeNull();
    const texts: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === "string") texts.push(node);
      else if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object")
        walk((node as { props?: { children?: unknown } }).props?.children);
    };
    walk(out);
    expect(texts.join(" ")).toContain("A line is a record, not a finding");
    expect(texts.join(" ")).toContain("Open in graph explorer");
  });

  it("maps neighbour keys to existing profile routes only", () => {
    expect(neighbourProfileHref("grants", "UEI:ABC123DEF456")).toBe(
      "/fraud-radar/grants/recipients/ABC123DEF456",
    );
    expect(neighbourProfileHref("healthcare", "NPI:1234567890")).toBe(
      "/fraud-radar/healthcare/providers/1234567890",
    );
    expect(neighbourProfileHref("care", "NPI:1234567890")).toBe(
      "/fraud-radar/care/medicare/1234567890",
    );
    expect(neighbourProfileHref("grants", "ALN:93.778")).toBe(
      "/fraud-radar/grants/aln/93.778",
    );
    expect(neighbourProfileHref("grants", "ADDR:x")).toBeNull();
    expect(neighbourProfileHref("grants", "EIN:123456789")).toBeNull();
  });
});
