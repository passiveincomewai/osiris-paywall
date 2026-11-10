import { notFound } from 'next/navigation';
import { fraudRadarEnabled } from '@/lib/fraud-radar/flag';
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { geoConfig, DEFAULT_GEO_VERSION } from '@/lib/fraud-radar/geo-data';
import { getGeoYearly } from '@/lib/fraud-radar/geo-neon';
import GeoExplorer from './GeoExplorer';

/**
 * Fraud Radar — geo explorer (§6.4). Flag-gated: 404 while
 * FRAUD_RADAR_ENABLED is off. A landing-grade public surface (it
 * joins fraudRadarPublicPaths in this payload): national summaries
 * render server-side from the Neon grain when loaded; the client
 * explorer reads the published artifacts through the geo API.
 * State is the map grain; county is a name-keyed table grain —
 * there is no sub-state geometry and nothing is geocoded (§5).
 */
export const dynamic = 'force-dynamic';

export default async function FraudRadarGeoPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const configured = geoConfig() !== null;
  const national = configured
    ? await getGeoYearly('grants', 'grants_recipient_state')
    : null;
  return (
    <main className="docs-root min-h-screen" style={{ background: '#050810' }}>
      <div className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold">
          Federal awards &amp; providers by state — published records
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          State-level choropleths and tables of the published Fraud
          Radar corpus (geo vintage {DEFAULT_GEO_VERSION}). Each
          layer names the record field it maps — recipient state,
          primary place of performance, or NPPES practice state are
          different fields with different meanings, and the layers
          are never combined into one figure. County figures are
          name-keyed tables published as reported; there is no
          county geometry and no entity is ever placed on the map.
        </p>
        {national && (
          <p className="mt-3 text-sm text-slate-400">
            Grants recipient-state layer: national published total{' '}
            {typeof national.national.award_count === 'number'
              ? national.national.award_count.toLocaleString('en-US')
              : '—'}{' '}
            awards, with the unattributed/unknown bucket published
            alongside — state cells reconcile only together with
            that bucket. {national.coverageStatement}
          </p>
        )}
        {!configured && (
          <p className="mt-3 text-sm text-slate-400">
            The geo dataset is not published on this deployment yet
            (artifact root unconfigured) — the explorer below will
            show its not-published state rather than any figures.
          </p>
        )}
        <div className="mt-8">
          <GeoExplorer />
        </div>
      </div>
    </main>
  );
}
