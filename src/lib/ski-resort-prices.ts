/**
 * OSIRIS — per-resort lift-ticket price figures for the ski compare
 * tool (P3). The dataset (src/data/ski-resort-prices.json) holds ONLY
 * figures read off the resort's own official tickets page, each with
 * the source URL and the date it was checked, both stored in the data
 * so the claim is always auditable.
 *
 * Coverage is deliberately tiny: most resorts price dynamically (the
 * figure changes by date and demand) or had not published the coming
 * season's prices when checked — Snowbasin, for example, showed its
 * 2026-27 table as "coming soon" with blank prices on 2026-10-30.
 * A resort with no entry renders "Not available" in the compare row
 * and keeps its verified official tickets link — never an estimated,
 * scraped-from-a-third-party, or remembered price.
 */
import pricesData from "@/data/ski-resort-prices.json";

export interface SkiTicketPrice {
  /** Short display figure, e.g. "From $72" or "$195–$239". */
  label: string;
  /** What the figure covers, in the source's own terms. */
  detail: string;
  /** The official page the figure was read from. */
  source: string;
  /** ISO date the figure was last verified against the source. */
  checked: string;
}

const PRICES = pricesData as Record<string, SkiTicketPrice>;

export function getSkiTicketPrice(slug: string): SkiTicketPrice | null {
  return PRICES[slug] ?? null;
}

/** Display string for the compare row: figure + check date. */
export function formatTicketPrice(price: SkiTicketPrice): string {
  const d = new Date(`${price.checked}T12:00:00Z`);
  const when = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${price.label} (official site, checked ${when})`;
}
