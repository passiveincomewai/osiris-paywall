import { describe, expect, it } from "vitest";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import {
  HUB_CATEGORY_IDS,
  HREF_LABELS,
  VOICE_CATEGORIES,
  VOICE_QUESTIONS,
  countWords,
  getVoiceQuestionsByCategory,
} from "./voice-questions";

/**
 * The voice-question dataset is written to be quoted verbatim by voice
 * assistants and AI engines, so its invariants are enforced here:
 * standalone short answers within the word limit, unique ids, complete
 * hub categories, and deep links that resolve to routes that exist.
 */

const HAND_CITIES = [
  "london",
  "ottawa",
  "toronto",
  "madrid",
  "houston",
  "dallas",
  "tokyo",
  "sydney",
  "auckland",
];

const STATE_SLUGS = ["georgia", "utah", "texas", "florida", "indiana", "nevada", "arizona"];

const STATIC_ROUTES = new Set([
  "/",
  "/cameras",
  "/cameras/countries",
  "/live-webcams",
  "/world-city-webcams",
  "/europe-live-cameras",
  "/asia-webcams",
  "/north-america-webcams",
  "/south-america-webcams",
  "/oceania-webcams",
  "/beach-webcams",
  "/ski-webcams",
  "/airport-webcams",
  "/northern-lights-webcams",
  "/volcano-webcams",
  "/dark-sky-cameras",
  "/live-traffic-cameras",
  "/japan-traffic-cameras",
  "/canada-traffic-cameras",
  "/germany-traffic-cameras",
  "/norway-traffic-cameras",
  "/spain-traffic-cameras",
  "/sweden-traffic-cameras",
  "/south-korea-traffic-cameras",
  "/weather-tracker",
  "/tornado-tracker",
  "/california-fire-cameras",
  "/dashboard",
  "/earthcam-alternative",
  "/hurricane-tracker",
  "/wildfire-tracker",
  "/earthquake-tracker",
  "/live-flight-tracker",
  "/live-plane-spotting",
  "/satellite-tracker",
  "/space-station-tracker",
  "/ship-tracker",
  "/cyber-threat-map",
  "/what-is-ads-b",
  "/what-is-ais",
  "/features",
  "/pricing",
  "/enterprise",
  "/faq",
  "/gods-eye-view",
  "/alternatives/gods-eye-view",
  "/compare",
  "/answers",
]);

function validRoutes(): Set<string> {
  const routes = new Set(STATIC_ROUTES);
  for (const c of cameraCountries.countries) routes.add(`/cameras/countries/${c.slug}`);
  for (const c of cityPages.cities) routes.add(`/city-webcams/${c.slug}`);
  for (const slug of HAND_CITIES) routes.add(`/city-webcams/${slug}`);
  for (const slug of STATE_SLUGS) routes.add(`/us-traffic-cameras/${slug}`);
  return routes;
}

describe("voice-questions dataset", () => {
  it("has unique ids", () => {
    const ids = VOICE_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every shortAnswer at or under 30 words", () => {
    for (const q of VOICE_QUESTIONS) {
      expect(countWords(q.shortAnswer), q.id).toBeLessThanOrEqual(30);
    }
  });

  it("gives every entry a substantive longAnswer (1–3 sentences)", () => {
    for (const q of VOICE_QUESTIONS) {
      const sentences = q.longAnswer.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      expect(sentences.length, q.id).toBeGreaterThanOrEqual(1);
      expect(sentences.length, q.id).toBeLessThanOrEqual(3);
    }
  });

  it("fills all six hub categories with at least five questions each", () => {
    expect(VOICE_CATEGORIES).toHaveLength(6);
    for (const id of HUB_CATEGORY_IDS) {
      expect(getVoiceQuestionsByCategory(id).length, id).toBeGreaterThanOrEqual(5);
    }
    const core = VOICE_QUESTIONS.filter((q) => HUB_CATEGORY_IDS.includes(q.category));
    expect(core.length).toBeGreaterThanOrEqual(50);
  });

  it("carries four page-specific questions for each intent page", () => {
    for (const page of ["ski-webcams", "beach-webcams", "airport-webcams"] as const) {
      expect(getVoiceQuestionsByCategory(page)).toHaveLength(4);
    }
  });

  it("deep-links only to routes that exist", () => {
    const routes = validRoutes();
    for (const q of VOICE_QUESTIONS) {
      expect(routes.has(q.href), `${q.id} -> ${q.href}`).toBe(true);
    }
  });

  it("has a display label for every href it uses", () => {
    for (const q of VOICE_QUESTIONS) {
      expect(HREF_LABELS[q.href], `${q.id} -> ${q.href}`).toBeTruthy();
    }
  });
});
