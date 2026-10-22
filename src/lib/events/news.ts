/**
 * Breaking-events — Google News sitemap entries for fresh events.
 *
 * The wave-2 news sitemap (/news-sitemap.xml) lists blog posts from the
 * last 48 hours (Google's news-sitemap window). These builders add the
 * same window of earthquakes, active storms and tornado reports, in the
 * identical XML shape, so a breaking event is discoverable by search
 * while it is still news. Every entry is best-effort: if a source is
 * down, its entries are simply absent — the blog sitemap never breaks.
 */
import { BASE, BLOG_NAME, escapeXml } from "@/lib/blog-feed";
import { fetchSignificantQuakes, quakeHeadline } from "./earthquakes";
import { getStormFeatures } from "./hurricanes-data";
import { classificationLabel, groupStormFeatures } from "./hurricanes";
import { fetchRecentSpcReports, tornadoReportEpochMs } from "./tornadoes";

const NEWS_WINDOW_MS = 48 * 60 * 60_000;
const MAX_EVENT_ENTRIES = 150;

function newsUrlXml(loc: string, publicationDate: Date, title: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    "    <news:news>",
    "      <news:publication>",
    `        <news:name>${BLOG_NAME}</news:name>`,
    "        <news:language>en</news:language>",
    "      </news:publication>",
    `      <news:publication_date>${publicationDate.toISOString()}</news:publication_date>`,
    `      <news:title>${escapeXml(title)}</news:title>`,
    "    </news:news>",
    "  </url>",
  ].join("\n");
}

/**
 * Fresh event <url> blocks for the news sitemap: significant quakes and
 * reported tornadoes inside the 48-hour window, plus every currently
 * active storm (an active storm is news by definition; its date is the
 * NHC last-update time when parseable, else now).
 */
export async function fetchEventNewsEntries(now: Date): Promise<string[]> {
  const entries: string[] = [];
  const since = now.getTime() - NEWS_WINDOW_MS;

  const [quakes, storms, reports] = await Promise.allSettled([
    fetchSignificantQuakes(),
    getStormFeatures(),
    fetchRecentSpcReports(now, 3),
  ]);

  if (quakes.status === "fulfilled") {
    for (const q of quakes.value) {
      if (q.time < since) continue;
      entries.push(
        newsUrlXml(
          `${BASE}/earthquake-tracker/${q.id}`,
          new Date(q.time),
          quakeHeadline(q),
        ),
      );
    }
  }

  if (storms.status === "fulfilled") {
    for (const g of groupStormFeatures(storms.value as any[])) {
      const parsed = g.current.lastUpdate ? Date.parse(g.current.lastUpdate) : NaN;
      const when = Number.isFinite(parsed) ? new Date(parsed) : now;
      entries.push(
        newsUrlXml(
          `${BASE}/hurricane-tracker/${g.current.stormId}`,
          when,
          `${classificationLabel(g.current.classification)} ${g.current.name} — live updates`,
        ),
      );
    }
  }

  if (reports.status === "fulfilled") {
    for (const r of reports.value) {
      const epoch = tornadoReportEpochMs(r);
      if (epoch < since) continue;
      entries.push(
        newsUrlXml(
          `${BASE}/tornado-tracker/report/${r.id}`,
          new Date(epoch),
          `Tornado reported near ${r.location}, ${r.county} County, ${r.state}`,
        ),
      );
    }
  }

  return entries.slice(0, MAX_EVENT_ENTRIES);
}
