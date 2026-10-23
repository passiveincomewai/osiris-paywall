import { describe, expect, it } from "vitest";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import { getUsStatesIndex } from "./us-states";
import { countWords, VOICE_QUESTIONS } from "./voice-questions";
import {
  cityAnswers,
  countryAnswers,
  mergePlaceFaqs,
  normalizeQuestion,
  stateAnswers,
  type CityAnswerInput,
  type CountryAnswerInput,
  type StateAnswerInput,
} from "./place-answers";

/**
 * The generated place answers are held to the same invariants as the
 * hand-written dataset (ROLLOUT-SPEC §7.1): standalone short answers
 * within the word limit, unique ids, deep links that resolve, and no
 * duplicate normalized question inside any page's merged FAQ set.
 */

const countries = (cameraCountries as { countries: CountryAnswerInput[] }).countries;
const cities = (cityPages as { cities: CityAnswerInput[] }).cities;
const states = getUsStatesIndex().states as unknown as StateAnswerInput[];

const TRAFFIC_ROUTES = new Set([
  "/live-traffic-cameras",
  "/japan-traffic-cameras",
  "/canada-traffic-cameras",
  "/germany-traffic-cameras",
  "/norway-traffic-cameras",
  "/spain-traffic-cameras",
  "/sweden-traffic-cameras",
  "/south-korea-traffic-cameras",
]);

function validHref(href: string): boolean {
  if (TRAFFIC_ROUTES.has(href)) return true;
  if (href === "/beach-webcams" || href === "/ski-webcams") return true;
  if (href.startsWith("/cameras/countries/")) {
    return countries.some((c) => c.slug === href.split("/").pop());
  }
  if (href.startsWith("/city-webcams/")) {
    return cities.some((c) => c.slug === href.split("/").pop());
  }
  if (href.startsWith("/us-traffic-cameras/")) {
    return states.some((s) => s.slug === href.split("/").pop());
  }
  return false;
}

function checkEntries(entries: ReturnType<typeof countryAnswers>, owner: string) {
  const questions = new Set<string>();
  for (const e of entries) {
    expect(countWords(e.shortAnswer), `${owner}/${e.id}`).toBeLessThanOrEqual(30);
    const sentences = e.longAnswer.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    expect(sentences.length, `${owner}/${e.id}`).toBeGreaterThanOrEqual(1);
    expect(sentences.length, `${owner}/${e.id}`).toBeLessThanOrEqual(3);
    expect(validHref(e.href), `${owner}/${e.id} -> ${e.href}`).toBe(true);
    const key = normalizeQuestion(e.question);
    expect(questions.has(key), `${owner}/${e.id} duplicate question`).toBe(false);
    questions.add(key);
  }
}

describe("place-answers generator", () => {
  it("produces valid entries for every country, with globally unique ids", () => {
    const ids = new Set<string>();
    for (const c of countries) {
      const entries = countryAnswers(c);
      expect(entries.length, c.slug).toBeGreaterThanOrEqual(2);
      checkEntries(entries, c.slug);
      for (const e of entries) {
        // Reused core entries keep their canonical ids; generated ones
        // must not collide with the dataset or each other.
        if (e.id.startsWith("country-")) {
          expect(ids.has(e.id), e.id).toBe(false);
          ids.add(e.id);
          expect(VOICE_QUESTIONS.some((q) => q.id === e.id), e.id).toBe(false);
        }
      }
    }
  });

  it("produces valid entries for every generated city", () => {
    for (const g of cities) {
      const entries = cityAnswers(g);
      expect(entries.length, g.slug).toBeGreaterThanOrEqual(2);
      checkEntries(entries, g.slug);
    }
  });

  it("produces valid entries for every US state page", () => {
    expect(states.length).toBeGreaterThanOrEqual(40);
    for (const s of states) {
      const entries = stateAnswers(s);
      expect(entries.length, s.slug).toBeGreaterThanOrEqual(2);
      checkEntries(entries, s.slug);
    }
  });

  it("reuses the curated count entries for Japan, the US, Canada and the UK (§2.3)", () => {
    const bySlug = new Map(countries.map((c) => [c.slug, c]));
    expect(countryAnswers(bySlug.get("japan")!)[0].id).toBe("how-many-cameras-in-japan");
    expect(countryAnswers(bySlug.get("united-states")!)[0].id).toBe("how-many-cameras-in-the-us");
    expect(countryAnswers(bySlug.get("canada")!)[0].id).toBe("how-many-cameras-in-canada");
    expect(countryAnswers(bySlug.get("united-kingdom")!)[0].id).toBe("how-many-cameras-in-the-uk");
  });

  it("keeps counts in the answers equal to the host template's own data (§2.2)", () => {
    const japan = countries.find((c) => c.slug === "japan")!;
    const japanEntries = countryAnswers(japan);
    const top = japanEntries.find((e) => e.id === "country-japan-top-places")!;
    expect(top.shortAnswer).toContain(japan.topCities[0].count.toLocaleString("en-US"));
    const seattle = cities.find((c) => c.slug === "seattle")!;
    expect(cityAnswers(seattle)[0].shortAnswer).toContain(seattle.count.toLocaleString("en-US"));
    const utah = states.find((s) => s.slug === "utah")!;
    expect(stateAnswers(utah)[0].shortAnswer).toContain(utah.count.toLocaleString("en-US"));
  });

  it("mergePlaceFaqs: dedupes by normalized question, preserves order, caps at 20 (§3)", () => {
    const japan = countries.find((c) => c.slug === "japan")!;
    const entries = countryAnswers(japan);
    const template = [
      { q: "Are Japan's cameras free to watch?", a: "Yes." },
      { q: "A template-only question?", a: "Answer." },
    ];
    const { merged, surviving } = mergePlaceFaqs(template, entries);
    const keys = merged.map((f) => normalizeQuestion(f.q));
    expect(new Set(keys).size).toBe(keys.length);
    expect(merged[0].q).toBe(template[0].q);
    expect(surviving.some((e) => e.id === "country-japan-free")).toBe(false);
    expect(merged.length).toBeLessThanOrEqual(20);

    const big = Array.from({ length: 19 }, (_, i) => ({ q: `Template question ${i}?`, a: "A." }));
    const capped = mergePlaceFaqs(big, entries);
    expect(capped.merged.length).toBe(20);
    expect(capped.surviving.length).toBe(1);
  });
});
