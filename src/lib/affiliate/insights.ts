// ── Affiliate insights: pure helpers ─────────────────────────────────────
// Aggregation math for the dashboard's insights endpoint (funnel,
// retention, sources, series bucketing, rank history). Everything here
// is pure and unit-tested; the route does the DB reads and hands rows
// in. Honesty rule: a dimension the click pipeline never captured is
// reported as "not tracked" by the caller — these helpers never invent
// a value for missing data.

export interface DailyPoint {
  date: string; // YYYY-MM-DD (UTC)
  cents: number;
  clicks: number;
}

export type Granularity = "day" | "week" | "month";

/** Aggregate daily points into ISO-week (Mon-start) or calendar-month buckets. */
export function bucketSeries(points: DailyPoint[], granularity: Granularity): DailyPoint[] {
  if (granularity === "day") return points;
  const buckets = new Map<string, DailyPoint>();
  for (const p of points) {
    const key = granularity === "week" ? weekKey(p.date) : p.date.slice(0, 7) + "-01";
    const cur = buckets.get(key) ?? { date: key, cents: 0, clicks: 0 };
    cur.cents += p.cents;
    cur.clicks += p.clicks;
    buckets.set(key, cur);
  }
  return [...buckets.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Monday (UTC) of the week containing a YYYY-MM-DD date. */
export function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** % of the previous step; null on the first step. */
  pctOfPrev: number | null;
  /** % of the first step. */
  pctOfFirst: number;
}

export function buildFunnel(steps: { key: string; label: string; count: number }[]): FunnelStep[] {
  const first = steps.length ? steps[0].count : 0;
  return steps.map((s, i) => ({
    ...s,
    pctOfPrev: i === 0 ? null : steps[i - 1].count > 0 ? round1((s.count / steps[i - 1].count) * 100) : 0,
    pctOfFirst: first > 0 ? round1((s.count / first) * 100) : 0,
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Platform label from a captured referrer URL. Null referrer = the
 *  click carried no referrer (direct / in-app) — labelled by caller. */
export function platformFromReferrer(referrer: string | null | undefined): string {
  if (!referrer) return "No referrer (direct / in-app)";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\.|^m\.|^l\./, "");
  } catch {
    return "Other";
  }
  if (host.includes("youtube")) return "YouTube";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("tiktok")) return "TikTok";
  if (host === "x.com" || host.includes("twitter")) return "X (Twitter)";
  if (host.includes("facebook") || host === "fb.com") return "Facebook";
  if (host.includes("google")) return "Google";
  if (host.includes("bing")) return "Bing";
  if (host.includes("duckduckgo")) return "DuckDuckGo";
  if (host.includes("reddit")) return "Reddit";
  if (host.includes("discord")) return "Discord";
  if (host.includes("telegram") || host === "t.me") return "Telegram";
  if (host.includes("whatsapp") || host === "wa.me") return "WhatsApp";
  if (host.includes("worldeye.app")) return "WorldEye (internal)";
  return host || "Other";
}

/** Coarse device class from a captured User-Agent. */
export function deviceFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Not tracked";
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "Mobile";
  if (/android/i.test(ua)) return "Tablet";
  return "Desktop";
}

/** OS family from a captured User-Agent. */
export function osFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Not tracked";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export interface CountBucket {
  label: string;
  count: number;
}

/** Count rows by a label function, sorted desc, with a share %. */
export function countBy<T>(rows: T[], label: (row: T) => string): (CountBucket & { pct: number })[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(label(r), (map.get(label(r)) ?? 0) + 1);
  const total = rows.length;
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: total > 0 ? round1((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

export interface RankTransition {
  rankKey: string;
  rankName: string;
  reachedAt: string; // ISO
  xpTotal: number;
}

/**
 * Derive rank history from the XP ledger (events ascending). XP events
 * are the only record of when XP changed; cumulative sums reproduce the
 * rank timeline. The first event's rank is the starting point.
 */
export function rankHistoryFromXpEvents(
  events: { xp: number; createdAt: Date | string }[],
  ranks: { key: string; name: string; minXp: number }[],
): RankTransition[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const out: RankTransition[] = [];
  let total = 0;
  let currentKey: string | null = null;
  const rankAt = (xp: number) => {
    let cur = ranks[0];
    for (const r of ranks) if (xp >= r.minXp) cur = r;
    return cur;
  };
  for (const e of sorted) {
    total += e.xp;
    const r = rankAt(Math.max(0, total));
    if (r && r.key !== currentKey) {
      currentKey = r.key;
      out.push({
        rankKey: r.key,
        rankName: r.name,
        reachedAt: new Date(e.createdAt).toISOString(),
        xpTotal: total,
      });
    }
  }
  return out;
}

/** Slug for a tracking link: same alphabet as referral codes. */
export function trackingSlugFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug.length >= 3 ? slug : "";
}

/** Build a share URL with UTM parameters for the UTM builder. */
export function buildTrackedUrl(base: string, utm: { source?: string; medium?: string; campaign?: string; content?: string }): string {
  const url = new URL(base);
  if (utm.source) url.searchParams.set("utm_source", utm.source.slice(0, 60));
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium.slice(0, 60));
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign.slice(0, 60));
  if (utm.content) url.searchParams.set("utm_content", utm.content.slice(0, 60));
  return url.toString();
}

/** CSV cell escaping (quotes, commas, newlines). */
export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
}
