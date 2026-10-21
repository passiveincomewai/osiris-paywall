import { describe, it, expect, vi } from "vitest";

// The pure shapers are under test; the module's IO neighbours (auth,
// db, feeds, mailer) are mocked so the suite never loads them.
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => true),
  appUrl: (p: string) => `https://worldeye.app${p}`,
}));
vi.mock("@/lib/launches/server", () => ({ getLaunchesPayload: vi.fn(async () => null) }));
vi.mock("./events/feeds", () => ({ fetchQuakes: vi.fn(async () => []), fetchIssTle: vi.fn(async () => null) }));

import { bestPassPerPlace, briefToEmailSections, shapeBriefQuakes, type PersonalBrief } from "./brief";
import type { QuakeInput } from "./events/logic";

const NOW = 1_760_000_000_000;
const q = (id: string, mag: number, lat: number, lng: number, agoH = 2): QuakeInput => ({
  id,
  mag,
  place: `Place ${id}`,
  timeMs: NOW - agoH * 3_600_000,
  lat,
  lng,
  depthKm: 10,
  url: null,
});

describe("shapeBriefQuakes", () => {
  const places = [{ id: "p1", name: "Home", lat: 41.223, lng: -111.974, radiusKm: 250 }];
  it("splits near vs strongest and ignores day-old quakes", () => {
    const quakes = [
      q("near1", 3.1, 41.3, -111.9),
      q("far1", 6.8, -10, 120),
      q("far2", 5.9, 35, 140),
      q("old", 7.5, 41.3, -111.9, 30),
    ];
    const { near, strongest } = shapeBriefQuakes(quakes, places, NOW);
    expect(near.map((x) => x.id)).toEqual(["near1"]);
    expect(near[0].nearPlace).toBe("Home");
    expect(strongest.map((x) => x.id)).toEqual(["far1", "far2", "near1"]);
  });
  it("handles no places", () => {
    const { near, strongest } = shapeBriefQuakes([q("a", 5, 0, 0)], [], NOW);
    expect(near).toEqual([]);
    expect(strongest).toHaveLength(1);
  });
});

describe("bestPassPerPlace", () => {
  it("picks the highest peak per place and skips pass-less places", () => {
    const out = bestPassPerPlace([
      {
        placeName: "Home",
        passes: [
          { startMs: 1, endMs: 2, peakMs: 1, peakElevationDeg: 22 },
          { startMs: 3, endMs: 4, peakMs: 3, peakElevationDeg: 57 },
        ],
      },
      { placeName: "Cabin", passes: [] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].pass.peakElevationDeg).toBe(57);
  });
});

describe("briefToEmailSections", () => {
  it("drops empty sections and lines up the rest", () => {
    const brief: PersonalBrief = {
      generatedAt: new Date(NOW).toISOString(),
      places: [],
      cameraEvents: [],
      eventEvents: [{ id: "e1", kind: "quake", title: "M5.0 somewhere", createdAt: "" }],
      quakesNear: [],
      quakesStrongest: [],
      launches: [{ id: "l1", name: "Rocket | Mission", netMs: NOW, providerName: null, padLocation: null }],
      passes: [],
      emailEnabled: true,
    };
    const sections = briefToEmailSections(brief);
    expect(sections.map((s) => s.heading)).toEqual(["Your alerts (24h)", "Launches (next 48h)"]);
    const empty = briefToEmailSections({ ...brief, eventEvents: [], launches: [] });
    expect(empty).toEqual([]);
  });
});
