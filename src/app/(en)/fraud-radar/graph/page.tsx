import { notFound } from 'next/navigation';
import { fraudRadarEnabled } from '@/lib/fraud-radar/flag';
import GraphExplorer from './GraphExplorer';

/**
 * Fraud Radar — published-record graph explorer (§6.2). Flag-gated:
 * 404 while FRAUD_RADAR_ENABLED is off. Deliberately NOT added to
 * fraudRadarPublicPaths: an interactive tool over the whole entity
 * corpus is an app surface, not an indexable landing (the Phase 4
 * precedent). Arrival from a profile's Network section carries
 * ?engine=&key=.
 */
export const dynamic = 'force-dynamic';

export default async function FraudRadarGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ engine?: string; key?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  return (
    <main className="docs-root min-h-screen" style={{ background: '#050810' }}>
      <div className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold">Published-record network explorer</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Ego-networks of the published federal datasets: the awards,
          subawards, bridges, classifications, and shared published
          addresses recorded around one entity. Every line names the
          dataset and version that records it. Research leads and
          screening records annotate entity nodes on their profiles —
          they are never drawn as lines, and no line here is a finding
          about anyone.
        </p>
        <div className="mt-8">
          <GraphExplorer initialEngine={sp.engine} initialKey={sp.key} />
        </div>
      </div>
    </main>
  );
}
