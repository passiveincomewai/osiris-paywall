// Microsoft Clarity Data Export — server-side only.
//
// Reads the project-live-insights endpoint for project zaa22s01mv when
// CLARITY_API_TOKEN is set in the environment. The token is read here, on
// the server, and is never sent to the client: this module is imported
// only by the /admin/clarity server component.
//
// The export API is heavily rate-limited (about 10 requests/day/project),
// so the fetch is cached in the Next Data Cache with a 6-hour revalidate.
// Never call this per-render from a client component.

export const CLARITY_PROJECT_ID = "zaa22s01mv";
export const CLARITY_DASHBOARD_URL = `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`;

const INSIGHTS_URL =
  "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3";

export interface ClarityMetricCard {
  label: string;
  value: string;
}

export type ClarityInsights =
  | { configured: false }
  | { configured: true; ok: true; cards: ClarityMetricCard[] }
  | { configured: true; ok: false; error: string };

// Friendly names for the metric groups the export API is known to return.
// Anything not listed here is rendered under a humanised version of its
// raw name — the page shows whatever the API returns, labelled plainly.
const METRIC_LABELS: Record<string, string> = {
  Traffic: "Traffic",
  Engagement: "Engagement",
  RageClickCount: "Rage clicks",
  DeadClickCount: "Dead clicks",
  ExcessiveScrollinCount: "Excessive scrolling",
  ExcessiveScrollingCount: "Excessive scrolling",
  QuickbackClick: "Quick backs",
  ScriptErrorCount: "JavaScript errors",
  ScrollDepth: "Scroll depth",
};

// Field names that describe a row rather than measure anything — skipped
// so cards only carry actual measurements.
const NON_METRIC_FIELDS = new Set([
  "metricName",
  "information",
  "name",
  "dimension",
  "url",
  "referrer",
  "os",
  "browser",
  "device",
  "countryOrRegion",
  "stateOrRegion",
  "city",
]);

function humanize(raw: string): string {
  const spaced = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function collectFromRow(
  groupLabel: string,
  row: Record<string, unknown>,
  out: ClarityMetricCard[],
) {
  for (const [key, value] of Object.entries(row)) {
    if (NON_METRIC_FIELDS.has(key)) continue;
    if (typeof value === "number") {
      out.push({ label: `${groupLabel} · ${humanize(key)}`, value: formatValue(value) });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      collectFromRow(`${groupLabel} · ${humanize(key)}`, value as Record<string, unknown>, out);
    }
    if (out.length >= 24) return;
  }
}

/**
 * Flatten a project-live-insights payload into labelled metric cards.
 * Defensive by design: the API's per-metric field names vary and cannot be
 * verified without a live token, so this renders whatever numeric measures
 * come back (grouped by metric name) and yields [] for anything unusable.
 */
export function parseClarityInsights(data: unknown): ClarityMetricCard[] {
  const out: ClarityMetricCard[] = [];
  const groups: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? [data]
      : [];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const g = group as Record<string, unknown>;
    const rawName = typeof g.metricName === "string" ? g.metricName : "";
    const groupLabel = rawName
      ? (METRIC_LABELS[rawName] ?? humanize(rawName))
      : "Clarity";
    const rows = Array.isArray(g.information) ? g.information : [g];
    for (const row of rows) {
      if (row && typeof row === "object") {
        collectFromRow(groupLabel, row as Record<string, unknown>, out);
      }
      if (out.length >= 24) break;
    }
    if (out.length >= 24) break;
  }
  return out;
}

export async function getClarityInsights(): Promise<ClarityInsights> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) return { configured: false };
  try {
    const res = await fetch(INSIGHTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
      // ~10 requests/day/project budget: serve from the Data Cache for 6h.
      next: { revalidate: 21600 },
    });
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        error: `Clarity API returned HTTP ${res.status}. The token may be invalid, or the daily request limit (~10/day) may be used up.`,
      };
    }
    const data: unknown = await res.json();
    return { configured: true, ok: true, cards: parseClarityInsights(data) };
  } catch {
    return {
      configured: true,
      ok: false,
      error: "Could not reach the Clarity export API. Try again later — the dashboard link below always works.",
    };
  }
}
