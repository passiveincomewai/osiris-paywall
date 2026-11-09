/**
 * Dictionary registry (WorldEye multilingual, Phase 1).
 *
 * Every dictionary the site can render is imported here explicitly.
 * Adding a language = add its files under dictionaries/<locale>/ and
 * one import + entry per dictionary below, plus the manifest entry
 * that publishes it — the completeness test
 * (src/i18n/dictionaries.test.ts) fails loudly if a manifest-published
 * page × locale has no dictionary or a dictionary's shape differs
 * from the English source. There is deliberately NO silent fallback:
 * a published page whose dictionary is missing throws here rather
 * than quietly serving English under a localized URL.
 */

import type { LocaleCode } from "../config";
import { enChrome, type ChromeCopy } from "./en/chrome";
import { enHome, type HomeCopy } from "./en/home";
import { enPricing, type PricingCopy } from "./en/pricing";
import { enLiveWebcams, type LiveWebcamsCopy } from "./en/live-webcams";
import { enFaq, type FaqCopy } from "./en/faq";
import {
  enLiveFlightTracker,
  type LiveFlightTrackerCopy,
} from "./en/live-flight-tracker";
import { enShipTracker, type ShipTrackerCopy } from "./en/ship-tracker";
import { enDonate, type DonateCopy } from "./en/donate";
import { esChrome } from "./es/chrome";
import { esHome } from "./es/home";
import { esPricing } from "./es/pricing";
import { esLiveWebcams } from "./es/live-webcams";
import { esFaq } from "./es/faq";
import { esLiveFlightTracker } from "./es/live-flight-tracker";
import { esShipTracker } from "./es/ship-tracker";
import { esDonate } from "./es/donate";

export type { ChromeCopy } from "./en/chrome";
export type { HomeCopy, HomeFaq } from "./en/home";
export type { PricingCopy, PricingPlanCopy } from "./en/pricing";
export type { LiveWebcamsCopy } from "./en/live-webcams";
export type { FaqCopy, FaqEntryCopy } from "./en/faq";
export type {
  LiveFlightTrackerCopy,
  TrackerVoiceCopy,
} from "./en/live-flight-tracker";
export type { ShipTrackerCopy } from "./en/ship-tracker";
export type { DonateCopy } from "./en/donate";
export type { RichSegment, RichText } from "./types";

export const CHROME_DICTIONARIES: Partial<Record<LocaleCode, ChromeCopy>> = {
  en: enChrome,
  es: esChrome,
};

export const HOME_DICTIONARIES: Partial<Record<LocaleCode, HomeCopy>> = {
  en: enHome,
  es: esHome,
};

export const PRICING_DICTIONARIES: Partial<Record<LocaleCode, PricingCopy>> = {
  en: enPricing,
  es: esPricing,
};

export const LIVE_WEBCAMS_DICTIONARIES: Partial<
  Record<LocaleCode, LiveWebcamsCopy>
> = {
  en: enLiveWebcams,
  es: esLiveWebcams,
};

export const FAQ_DICTIONARIES: Partial<Record<LocaleCode, FaqCopy>> = {
  en: enFaq,
  es: esFaq,
};

export const LIVE_FLIGHT_TRACKER_DICTIONARIES: Partial<
  Record<LocaleCode, LiveFlightTrackerCopy>
> = {
  en: enLiveFlightTracker,
  es: esLiveFlightTracker,
};

export const SHIP_TRACKER_DICTIONARIES: Partial<
  Record<LocaleCode, ShipTrackerCopy>
> = {
  en: enShipTracker,
  es: esShipTracker,
};

/** Donation copy (Support WorldEye) — a component dictionary, not a
 * manifest-published page dictionary: the popup renders on many pages
 * and /support is EN-routed, so it is not part of PAGE_DICTIONARIES
 * and carries no source hash. */
export const DONATE_DICTIONARIES: Partial<Record<LocaleCode, DonateCopy>> = {
  en: enDonate,
  es: esDonate,
};

/** Slug → dictionary map for the pages that have dictionaries. */
export const PAGE_DICTIONARIES: Record<
  string,
  Partial<Record<LocaleCode, unknown>>
> = {
  "": HOME_DICTIONARIES,
  pricing: PRICING_DICTIONARIES,
  "live-webcams": LIVE_WEBCAMS_DICTIONARIES,
  faq: FAQ_DICTIONARIES,
  "live-flight-tracker": LIVE_FLIGHT_TRACKER_DICTIONARIES,
  "ship-tracker": SHIP_TRACKER_DICTIONARIES,
};

/** The English source dictionary for a slug (hash source, shape type). */
export function englishDictionaryFor(slug: string): unknown {
  return PAGE_DICTIONARIES[slug]?.en;
}

function requireCopy<T>(
  map: Partial<Record<LocaleCode, T>>,
  locale: LocaleCode,
  what: string
): T {
  const copy = map[locale];
  if (!copy) {
    throw new Error(
      `Missing ${what} dictionary for locale "${locale}" — the manifest must never publish a page × locale without one.`
    );
  }
  return copy;
}

export function getChromeCopy(locale: LocaleCode): ChromeCopy {
  return requireCopy(CHROME_DICTIONARIES, locale, "chrome");
}

export function getHomeCopy(locale: LocaleCode): HomeCopy {
  return requireCopy(HOME_DICTIONARIES, locale, "home");
}

export function getPricingCopy(locale: LocaleCode): PricingCopy {
  return requireCopy(PRICING_DICTIONARIES, locale, "pricing");
}

export function getLiveWebcamsCopy(locale: LocaleCode): LiveWebcamsCopy {
  return requireCopy(LIVE_WEBCAMS_DICTIONARIES, locale, "live-webcams");
}

export function getFaqCopy(locale: LocaleCode): FaqCopy {
  return requireCopy(FAQ_DICTIONARIES, locale, "faq");
}

export function getLiveFlightTrackerCopy(
  locale: LocaleCode
): LiveFlightTrackerCopy {
  return requireCopy(
    LIVE_FLIGHT_TRACKER_DICTIONARIES,
    locale,
    "live-flight-tracker"
  );
}

export function getShipTrackerCopy(locale: LocaleCode): ShipTrackerCopy {
  return requireCopy(SHIP_TRACKER_DICTIONARIES, locale, "ship-tracker");
}

/** Donation copy with an English fallback: the popup can render under
 * any locale context (including tests with no provider), and a missing
 * locale must degrade to English rather than throw — donations are an
 * overlay, never a routed page. */
export function getDonateCopy(locale: LocaleCode): DonateCopy {
  return DONATE_DICTIONARIES[locale] ?? enDonate;
}
