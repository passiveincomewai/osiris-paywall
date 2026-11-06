'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

/**
 * Live snow plows near a resort (Wave 2 item 8, 2026-11-06).
 *
 * Reads the site's own /api/plows feed — ten state/provincial DOT
 * fleets merged in lib/plows — and keeps the vehicles within
 * RADIUS_KM of the resort's coordinates. Positions are the DOTs' own
 * live (or last-known, when the API flags the feed stale) vehicle
 * reports; nothing is estimated. The block renders NOTHING when the
 * feed is unreachable, stale-flagged with no vehicles, or simply has
 * no plows near this resort — most resorts sit outside the ten feeds'
 * states, and an absent block is the honest state there.
 */

const RADIUS_KM = 60;

interface PlowRow {
  id: string;
  lat: number;
  lng: number;
  agency: string;
}

interface PlowsResponse {
  plows: PlowRow[];
  stale: boolean;
  timestamp: string;
}

interface Near {
  count: number;
  agencies: string[];
  nearestKm: number;
  stale: boolean;
  timestamp: string;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export default function SkiPlowsNear({
  lat,
  lng,
  resortName,
}: {
  lat: number;
  lng: number;
  resortName: string;
}) {
  const [near, setNear] = useState<Near | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/plows')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PlowsResponse>;
      })
      .then(data => {
        if (cancelled) return;
        const within = (data.plows ?? [])
          .map(p => ({ p, km: haversineKm(lat, lng, p.lat, p.lng) }))
          .filter(x => Number.isFinite(x.km) && x.km <= RADIUS_KM)
          .sort((a, b) => a.km - b.km);
        if (within.length === 0) return;
        setNear({
          count: within.length,
          agencies: [...new Set(within.map(x => x.p.agency))],
          nearestKm: within[0].km,
          stale: data.stale === true,
          timestamp: data.timestamp,
        });
      })
      .catch(() => {
        /* No block — the feed being down never becomes a claim. */
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!near) return null;

  const asOf = new Date(near.timestamp);
  const asOfLabel = Number.isNaN(asOf.getTime())
    ? null
    : asOf.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 font-semibold text-white/90">
        <Truck className="w-4.5 h-4.5 text-[#D4AF37]" />
        {near.count} snow {near.count === 1 ? 'plow' : 'plows'} within {RADIUS_KM} km
        of {resortName}
      </div>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">
        Live positions reported by {near.agencies.join(' and ')} — the nearest is{' '}
        {near.nearestKm < 1 ? 'under 1' : Math.round(near.nearestKm)} km from the
        base area. Watch them move on the globe&apos;s plow layer.
        {asOfLabel ? ` Feed checked ${asOfLabel}.` : ''}
        {near.stale
          ? ' One or more plow feeds failed their latest refresh, so some positions may be last-known rather than current.'
          : ''}
      </p>
    </div>
  );
}
