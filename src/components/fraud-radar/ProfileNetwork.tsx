/**
 * Fraud Radar — the shared profile "Network" section (Phase 10,
 * §6.3 contract). Identical on every profile family: a counts
 * block, a top-neighbours list, and the "Open in graph explorer"
 * cross-link, all under the §2.5 legend sentence.
 *
 * Contract (§6.3):
 *  - Counts come from the ego extract's own published metrics +
 *    truncation records via graphs-data.ts (the designed net/
 *    counts tree was not published by G4 — recorded in
 *    RECORD-P10.md); candidate edges NEVER contribute to a count.
 *  - Zero is shown only where a complete published file was
 *    counted; an entity with no ego entry renders the labelled
 *    none-reported sentence, not zeros.
 *  - The section is ABSENT (renders null) when the graphs
 *    artifact root is unconfigured — profiles never degrade for
 *    a Phase 10 hosting gap.
 *  - Neighbours link to profiles only where a profile route
 *    exists for the neighbour's identifier family; everything
 *    else renders as a labelled record, never a fabricated link.
 * A line is a record, not a finding about anyone (§2.5); nothing
 * here ranks entities or encodes lead counts.
 */
import Link from "next/link";
import {
  getNetworkSummary,
  graphsConfig,
  GRAPH_EMPTY_STATE,
  GRAPH_LEGEND,
  type NetworkSummary,
} from "@/lib/fraud-radar/graphs-data";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";

export const NETWORK_COUNT_SENTENCES: Record<string, (n: number) => string> = {
  recipient_of_award: (n) =>
    `Recorded as recipient of ${formatCount(n)} published assistance awards`,
  vendor_on_award: (n) =>
    `Recorded as vendor on ${formatCount(n)} published contract awards`,
  subaward_from_prime: (n) =>
    `Named in ${formatCount(n)} published subaward records (as prime or as subrecipient)`,
  reported_parent_uei: (n) =>
    `Has a reported parent UEI in ${formatCount(n)} published contract records (as reported — not a verified corporate family tree)`,
  auditee_expended_under: (n) =>
    `Reports federal expenditures under ${formatCount(n)} assistance listings in single audits (auditee-reported expended amounts)`,
  identifier_bridge: (n) =>
    `Carries ${formatCount(n)} published identifier bridge record(s) (the same auditee's single-audit record carries both identifiers)`,
  located_per_record: (n) =>
    `Has ${formatCount(n)} published locality records (the locality the named record publishes)`,
  shares_published_address: (n) =>
    `Shares a published practice/registration address in ${formatCount(n)} published records — shared addresses are common and usually ordinary`,
};

export function neighbourProfileHref(
  engine: string,
  nodeKey: string,
): string | null {
  if (nodeKey.startsWith("UEI:"))
    return `/fraud-radar/grants/recipients/${nodeKey.slice(4)}`;
  if (nodeKey.startsWith("NPI:"))
    return engine === "care"
      ? `/fraud-radar/care/medicare/${nodeKey.slice(4)}`
      : `/fraud-radar/healthcare/providers/${nodeKey.slice(4)}`;
  if (nodeKey.startsWith("ALN:"))
    return `/fraud-radar/grants/aln/${nodeKey.slice(4)}`;
  return null;
}

export async function ProfileNetworkSection({
  engine,
  entityKey,
}: {
  engine: "grants" | "contracts" | "healthcare" | "care" | "fac";
  entityKey: string;
}): Promise<React.ReactNode> {
  if (graphsConfig() === null) return null;
  const summary: NetworkSummary | null = await getNetworkSummary(engine, entityKey);
  return (
    <section aria-label="Published-record network">
      <h2 className="text-xl font-semibold">Published-record network</h2>
      <p className="mt-1 text-sm text-slate-300">{GRAPH_LEGEND}</p>
      {summary === null ? (
        <p className="mt-3 text-sm text-slate-300">{GRAPH_EMPTY_STATE}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1 text-sm text-slate-200">
            {Object.entries(summary.countsByType).map(([type, n]) => (
              <li key={type}>
                {(NETWORK_COUNT_SENTENCES[type] ?? ((x: number) => `${type} — ${formatCount(x)} published records`))(n)}
              </li>
            ))}
          </ul>
          {summary.truncations.length > 0 && (
            <p className="mt-2 text-sm text-slate-400">
              Some lists are truncated in the published extract:{" "}
              {summary.truncations
                .map((t) => `${t.edgeType} shows ${formatCount(t.shown)} of ${formatCount(t.total)}`)
                .join("; ")}
              . Full lists are on the profile record lists.
            </p>
          )}
          {summary.neighbours.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {summary.neighbours.slice(0, 10).map((nb) => {
                const href = neighbourProfileHref(engine, nb.key);
                return (
                  <li key={`${nb.edgeType}:${nb.key}`} className="text-slate-200">
                    <span className="text-slate-400">{nb.edgeType}: </span>
                    {href ? (
                      <Link href={href} className="text-cyan-300 hover:underline">
                        {nb.label}
                      </Link>
                    ) : (
                      nb.label
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link
              href={`/fraud-radar/graph?engine=${engine}&key=${encodeURIComponent(entityKey)}`}
              className="text-cyan-300 hover:underline"
            >
              Open in graph explorer
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
