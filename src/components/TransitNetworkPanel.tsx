'use client';

/**
 * OSIRIS — Transit Network panel: the route browser + service alerts
 * for agencies whose static GTFS builds a routes/stops/schedule
 * network (lib/transit/network; UTA in v1).
 *
 * Everything shown is served by the transit network API, computed
 * from the agency's own published data: the route index
 * (/api/transit/network?shapes=0), one route checked in full
 * (/api/transit/route — ordered stops + today's first/last/headway,
 * all agency-local timetable facts, never dressed as realtime), the
 * agency's GTFS-RT service alerts (/api/transit/alerts), and the live
 * vehicle count for the open route, counted from the same vehicles
 * feed the globe renders (/api/transit/vehicles). Selecting a route
 * highlights its line on the globe via the parent (OsirisMap owns the
 * map); tapping a stop flies the globe to it, where the stop dot's
 * own popup carries the arrivals.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

interface NetRoute {
  id: string; short: string; long: string; mode: string; color: string; url?: string;
  directions: Array<{ dir: number; headsign: string; stopCount: number }>;
}
interface RouteStop { id: string; name: string; lat: number; lng: number }
interface RouteDirection {
  dir: number; headsign: string; stops: RouteStop[];
  summary: { trips: number; firstDep: string | null; lastDep: string | null; headwayMin: number | null };
}
interface AlertItem { id: string; header: string; description?: string; routes: string[] }

const MODE_TAG: Record<string, string> = {
  bus: 'BUS', tram: 'TRAX', metro: 'METRO', train: 'RAIL', ferry: 'FERRY', transit: 'TRANSIT',
};

function hhmm(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return '—'; }
}

export default function TransitNetworkPanel({
  selectedRouteId,
  onSelectRoute,
  onFocusStop,
}: {
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  onFocusStop: (lat: number, lng: number) => void;
}) {
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [credit, setCredit] = useState('');
  const [routes, setRoutes] = useState<NetRoute[]>([]);
  const [stopCount, setStopCount] = useState<number | null>(null);
  const [netError, setNetError] = useState(false);
  const [tab, setTab] = useState<'routes' | 'alerts'>('routes');
  const [query, setQuery] = useState('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selShort, setSelShort] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ route: NetRoute; directions: RouteDirection[]; alerts: AlertItem[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  // Agency discovery: the directory marks which agencies carry a
  // network (UTA in v1). One today — the selector stays data-driven
  // so a second networked agency appears without a panel change.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/transit/agencies');
        const j = await r.json();
        const net = (j.agencies ?? []).filter((a: any) => a.network);
        if (!aliveRef.current || net.length === 0) return;
        setAgencyId(net[0].id);
        setAgencyName(net[0].name ?? '');
      } catch { /* panel stays in its honest empty state */ }
    })();
  }, []);

  // Route index + alerts for the chosen agency.
  useEffect(() => {
    if (!agencyId) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/transit/network?agency=${agencyId}&shapes=0`);
        const j = await r.json();
        if (!live) return;
        if (!r.ok || j.error) { setNetError(true); return; }
        setRoutes(j.routes ?? []);
        setStopCount(j.stopCount ?? null);
        setCredit(j.credit ?? '');
        setAgencyName(j.name ?? '');
        setNetError(false);
      } catch { if (live) setNetError(true); }
    })();
    (async () => {
      try {
        const r = await fetch(`/api/transit/alerts?agency=${agencyId}`);
        const j = await r.json();
        if (live && r.ok) setAlerts(j.alerts ?? []);
      } catch { /* alerts are additive; the routes still work */ }
    })();
    return () => { live = false; };
  }, [agencyId]);

  // Route detail + its live vehicle count while open.
  useEffect(() => {
    if (!agencyId || !selShort) { setDetail(null); setLiveCount(null); return; }
    let live = true;
    setDetailLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/transit/route?agency=${agencyId}&route=${encodeURIComponent(selShort)}`);
        const j = await r.json();
        if (!live) return;
        if (r.ok && !j.error) {
          setDetail({ route: j.route, directions: j.directions ?? [], alerts: j.alerts ?? [] });
          onSelectRoute(j.route.id);
        }
      } catch { /* detail stays loading-free empty below */ }
      if (live) setDetailLoading(false);
    })();
    const countVehicles = async () => {
      try {
        const r = await fetch(`/api/transit/vehicles?agency=${agencyId}`);
        const j = await r.json();
        if (live && r.ok) {
          setLiveCount((j.vehicles ?? []).filter((v: any) => v.route === selShort).length);
        }
      } catch { if (live) setLiveCount(null); }
    };
    void countVehicles();
    const iv = setInterval(countVehicles, 15000);
    return () => { live = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, selShort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r => r.short.toLowerCase().includes(q) || r.long.toLowerCase().includes(q));
  }, [routes, query]);

  const openRoute = (r: NetRoute) => { setSelShort(r.short); setTab('routes'); };
  const closeRoute = () => { setSelShort(null); setDetail(null); onSelectRoute(null); };

  return (
    <div
      className="absolute left-2 bottom-24 z-[230] w-[324px] max-w-[88vw] max-h-[56vh] overflow-y-auto styled-scrollbar rounded-xl border border-[var(--border-secondary)] bg-black/70 backdrop-blur-md shadow-xl p-3"
      data-transit-network-panel
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-white/85">
          🚌 TRANSIT NETWORK{agencyName ? ` — ${agencyName.toUpperCase()}` : ''}
        </div>
        {alerts.length > 0 && (
          <span className="text-[8px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30">
            {alerts.length} ALERT{alerts.length === 1 ? '' : 'S'}
          </span>
        )}
      </div>
      <div className="text-[9px] font-mono text-white/40 mb-2">
        {routes.length > 0
          ? `${routes.length} routes${stopCount != null ? ` · ${stopCount.toLocaleString('en-US')} stops` : ''} — tap a route to check today's service`
          : netError
            ? 'Route network unavailable right now — live vehicles are unaffected.'
            : 'Loading the route network…'}
      </div>

      <div className="flex gap-1 mb-2">
        {(['routes', 'alerts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-1 rounded text-[9px] font-mono tracking-wider transition-colors ${tab === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            {t === 'routes' ? 'ROUTES' : `ALERTS${alerts.length ? ` (${alerts.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 && (
            <div className="text-[10px] font-mono text-white/45">No active service alerts.</div>
          )}
          {alerts.map(a => (
            <div key={a.id} className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-2">
              <div className="text-[10px] font-mono font-bold text-amber-200 leading-snug">{a.header}</div>
              {a.routes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.routes.map(rt => (
                    <span key={rt} className="text-[8px] font-mono rounded px-1 py-0.5 bg-white/10 text-white/70">{rt}</span>
                  ))}
                </div>
              )}
              {a.description && (
                <div className="mt-1 text-[9px] font-mono text-white/50 leading-relaxed line-clamp-3">{a.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'routes' && !selShort && (
        <>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search routes — try 701 or Blue Line"
            className="w-full mb-2 rounded-md bg-white/[0.06] border border-white/10 px-2 py-1.5 text-[10px] font-mono text-white/85 placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <div className="space-y-0.5">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => openRoute(r)}
                className="w-full flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-white/[0.05] transition-colors"
              >
                <span className="shrink-0 w-2.5 h-2.5 rounded-full border border-black/50" style={{ background: r.color }} />
                <span className="text-[11px] font-mono font-bold text-white/90 w-12 shrink-0">{r.short}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-mono text-white/70 truncate">{r.long}</span>
                  <span className="block text-[8px] font-mono text-white/35 truncate">
                    {r.directions.map(d => d.headsign).filter(Boolean).join(' ⇄ ') || '—'}
                  </span>
                </span>
                <span className="text-[8px] font-mono text-white/35 shrink-0">{MODE_TAG[r.mode] ?? 'TRANSIT'}</span>
              </button>
            ))}
            {filtered.length === 0 && routes.length > 0 && (
              <div className="text-[10px] font-mono text-white/45 px-1 py-2">No routes match “{query}”.</div>
            )}
          </div>
        </>
      )}

      {tab === 'routes' && selShort && (
        <div>
          <button onClick={closeRoute} className="text-[9px] font-mono text-white/50 hover:text-white mb-2">← ALL ROUTES</button>
          {detailLoading && !detail && <div className="text-[10px] font-mono text-white/45">Checking today's service…</div>}
          {detail && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="shrink-0 w-3 h-3 rounded-full border border-black/50" style={{ background: detail.route.color }} />
                <span className="text-[13px] font-mono font-bold text-white">{detail.route.short}</span>
                <span className="text-[10px] font-mono text-white/60 truncate">{detail.route.long}</span>
              </div>
              <div className="text-[9px] font-mono text-white/45 mb-2">
                {liveCount == null
                  ? 'Live vehicle count unavailable'
                  : liveCount > 0
                    ? `${liveCount} vehicle${liveCount === 1 ? '' : 's'} on this route right now`
                    : 'No vehicles reporting on this route right now'}
                {' · '}line highlighted on the globe
              </div>
              {detail.alerts.map(a => (
                <div key={a.id} className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-2 mb-2">
                  <div className="text-[9px] font-mono font-bold text-amber-200 leading-snug">⚠ {a.header}</div>
                </div>
              ))}
              {detail.directions.map(d => (
                <div key={d.dir} className="mb-3">
                  <div className="text-[10px] font-mono font-bold text-white/85">→ {d.headsign || detail.route.long}</div>
                  <div className="text-[8px] font-mono text-white/40 mb-1">
                    {d.stops.length} stops · today: {d.summary.trips} trips · first {hhmm(d.summary.firstDep)} · last {hhmm(d.summary.lastDep)}
                    {d.summary.headwayMin ? ` · every ~${d.summary.headwayMin} min` : ''}
                  </div>
                  <div className="max-h-44 overflow-y-auto styled-scrollbar rounded-md border border-white/[0.06]">
                    {d.stops.map((s, i) => (
                      <button
                        key={`${d.dir}-${s.id}`}
                        onClick={() => onFocusStop(s.lat, s.lng)}
                        className="w-full flex items-baseline gap-2 px-2 py-1 text-left hover:bg-white/[0.05] transition-colors"
                      >
                        <span className="text-[8px] font-mono text-white/30 w-4 shrink-0 text-right">{i + 1}</span>
                        <span className="text-[9px] font-mono text-white/70 truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-[8px] font-mono text-white/30">Times are today's published timetable. Tap a stop to fly there — its dot shows live arrivals.</div>
            </>
          )}
          {!detailLoading && !detail && (
            <div className="text-[10px] font-mono text-white/45">Couldn't load this route's service — try again in a moment.</div>
          )}
        </div>
      )}

      {credit && (
        <div className="mt-2 pt-2 border-t border-white/[0.06] text-[8px] font-mono tracking-[0.08em] text-white/35">
          {credit.toUpperCase()}
        </div>
      )}
    </div>
  );
}
