// Homepage FAQ — single source of truth.
//
// The items themselves live in the English home dictionary
// (src/i18n/dictionaries/en/home.ts, `faq.items`) so every locale's
// homepage renders and schema-marks the same list in its own language;
// this module re-exports the English items under their historical name
// for the consumers that predate the dictionary (homepage JSON-LD).
// Rendered as visible copy by HomeSeoShell's FaqSection and as FAQPage
// JSON-LD by the homepage, so the structured data always matches what
// a visitor can read. Answers mirror /faq; keep the two consistent
// when either changes.
import { enHome } from "@/i18n/dictionaries/en/home";

export const HOME_FAQS: { q: string; a: string }[] = enHome.faq.items;
