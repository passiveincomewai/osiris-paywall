'use client';

/**
 * OSIRIS — Transit Explorer: the dedicated workspace for the Live
 * Transit network (Transit redesign, 2026-10-26).
 *
 * The old design opened a large floating panel over the globe the
 * moment the transit layer was enabled. The Explorer is the opposite
 * shape: a separate full-screen screen (mobile) / workspace (desktop)
 * that the user opens on purpose — from Layers → LIVE TRANSIT
 * NETWORK, or by expanding a globe selection card — and leaves with
 * Back to Globe, which changes nothing about the camera, the zoom or
 * the layer state.
 *
 * Data discipline (same as the rest of the transit stack):
 *  - vehicles are the agency's live GTFS-RT positions, polled while
 *    the Explorer is open; counts are counted from that feed;
 *  - routes / stops / geometry / schedules exist only where the
 *    agency publishes a keyless static GTFS (UTA today) — served by
 *    /api/transit/network, /api/transit/route, /api/transit/stops;
 *  - for every other agency the Routes view is built from the live
 *    feed itself and labelled REPORTING NOW — never dressed up as a
 *    network index;
 *  - alerts exist only where the agency publishes a keyless GTFS-RT
 *    alert feed (UTA today); elsewhere the tab says so plainly;
 *  - timetable facts are labelled as timetable facts; realtime
 *    predictions are labelled realtime (in the stop card).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  aggregateLiveRoutes,
  liveCountForRoute,
  filterByModeFamily,
  groupRoutesByType,
  searchRoutes,
  searchStops,
  alertTone,
  alertUntilMs,
  type AlertLike,
  type LiveVehicleRow,
  type ModeFilter,
} from '@/lib/transit/explorer';
import {
  routeStatusFromAlerts,
  alertsMatchingRoute,
  buildServiceBoard,
  boardHasNews,
  type RouteStatus,
} from '@/lib/transit/status';
import {
  loadWatchlist,
  saveWatchlist,
  toggleWatch,
  isWatched,
  watchForAgency,
  watchId,
  WATCHLIST_EVENT,
  type WatchEntry,
} from '@/lib/transit/watchlist';
import { dispatchStopDirections } from '@/lib/transit/directions';
import { DelayChip, RouteStatusChip } from './transit/StatusChips';

export interface TransitExplorerInit {
  agencyId?: string;
  routeShort?: string;
  tab?: 'overview' | 'routes' | 'alerts';
}

interface AgencyDir {
  id: string; name: string; region: string; center: [number, number];
  modes: string[]; attribution: string; network: boolean;
}
interface NetRoute {
  id: string; short: string; long: string; mode: string; color: string; url?: string;
  directions: Array<{ dir: number; headsign: string; stopCount: number }>;
}
interface NetStop { id: string; name: string; lat: number; lng: number; routes: string[] }
interface RouteStop { id: string; name: string; lat: number; lng: number }
interface RouteDirection {
  dir: number; headsign: string; stops: RouteStop[];
  summary: { trips: number; firstDep: string | null; lastDep: string | null; headwayMin: number | null };
}

const MODE_TAG: Record<string, string> = {
  bus: 'BUS', tram: 'TRAM', metro: 'METRO', train: 'RAIL', ferry: 'FERRY', transit: 'TRANSIT',
};
const MODE_COLOR: Record<string, string> = {
  bus: '#FFA726', tram: '#66BB6A', metro: '#42A5F5', train: '#AB47BC', ferry: '#26C6DA', transit: '#B0BEC5',
};

function hhmm(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return '—'; }
}
function agoText(atMs: number | null, nowMs: number): string {
  if (!atMs) return '—';
  const s = Math.max(0, Math.round((nowMs - atMs) / 1000));
  return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

export default function TransitExplorer({
  init,
  alertsEnabled,
  onSelectRoute,
  onClose,
  onViewRouteOnMap,
  onFollowVehicle,
  onFocusStop,
}: {
  init: TransitExplorerInit;
  /** Layers → Service Alerts subdivision state; gates the alerts tab. */
  alertsEnabled: boolean;
  /** Globe route-highlight contract (the old panel's, unchanged). */
  onSelectRoute: (routeInternalId: string | null) => void;
  onClose: () => void;
  onViewRouteOnMap: (agencyId: string, routeInternalId: string) => void;
  onFollowVehicle: (v: { agencyId: string; vehId: string; route: string; label?: string }) => void;
  onFocusStop: (agencyId: string, stop: { id: string; name: string; lat: number; lng: number; routes: string[] }) => void;
}) {
  const [agencies, setAgencies] = useState<AgencyDir[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(init.agencyId ?? null);
  const [tab, setTab] = useState<'overview' | 'routes' | 'alerts'>(init.tab ?? (init.routeShort ? 'routes' : 'overview'));
  const [vehicles, setVehicles] = useState<LiveVehicleRow[]>([]);
  const [vehiclesAt, setVehiclesAt] = useState<number | null>(null);
  const [vehiclesError, setVehiclesError] = useState(false);
  const [network, setNetwork] = useState<
    | { phase: 'ready'; routes: NetRoute[]; stopCount: number; credit: string; servedAt: string | null }
    | { phase: 'error' }
    | null
  >(null);
  const [stops, setStops] = useState<NetStop[]>([]);
  const [alerts, setAlerts] = useState<{ supported: boolean; list: AlertLike[] } | null>(null);
  const [ovQuery, setOvQuery] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [selShort, setSelShort] = useState<string | null>(init.routeShort ?? null);
  const [detail, setDetail] = useState<{ route: NetRoute; directions: RouteDirection[]; alerts: AlertLike[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [watchEntries, setWatchEntries] = useState<WatchEntry[]>(() => loadWatchlist());
  const [watchArrivals, setWatchArrivals] = useState<Record<string, {
    next: { route: string; headsign?: string; inMin: number; basis: 'realtime' | 'scheduled'; delayS?: number | null } | null;
    alertCount: number;
  }>>({});
  const [, setNowTick] = useState(0);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  const agency = agencies.find((a) => a.id === agencyId) ?? null;

  /* Agency directory — the same one the globe uses. */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/transit/agencies');
        const j = await r.json();
        if (!aliveRef.current) return;
        const list: AgencyDir[] = j.agencies ?? [];
        setAgencies(list);
        setAgencyId((cur) => cur ?? list.find((a) => a.network)?.id ?? list[0]?.id ?? null);
      } catch { /* explorer stays in its honest empty state */ }
    })();
  }, []);

  /* Escape closes — Back to Globe is the primary path, this is the
   * keyboard equivalent. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Live vehicles for the chosen agency, polled while open. Failure
   * keeps the last good set and says so — never a silent blank. */
  useEffect(() => {
    if (!agencyId) return;
    let live = true;
    setVehiclesError(false);
    const load = async () => {
      try {
        const r = await fetch(`/api/transit/vehicles?agency=${agencyId}`);
        const j = await r.json();
        if (!live) return;
        if (!r.ok) { setVehiclesError(true); return; }
        setVehicles(j.vehicles ?? []);
        setVehiclesAt(Date.now());
        setVehiclesError(false);
      } catch { if (live) setVehiclesError(true); }
    };
    void load();
    const iv = setInterval(load, 15000);
    const tick = setInterval(() => setNowTick((t) => t + 1), 5000);
    return () => { live = false; clearInterval(iv); clearInterval(tick); };
  }, [agencyId]);

  /* Static network (routes + stops) for agencies that publish one. */
  useEffect(() => {
    setNetwork(null);
    setStops([]);
    setDetail(null);
    if (!agencyId || !agency?.network) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/transit/network?agency=${agencyId}&shapes=0`);
        const j = await r.json();
        if (!live) return;
        if (!r.ok || j.error) { setNetwork({ phase: 'error' }); return; }
        setNetwork({
          phase: 'ready',
          routes: j.routes ?? [],
          stopCount: j.stopCount ?? 0,
          credit: j.credit ?? '',
          servedAt: j.servedAt ?? null,
        });
      } catch { if (live) setNetwork({ phase: 'error' }); }
    })();
    (async () => {
      try {
        const r = await fetch(`/api/transit/stops?agency=${agencyId}`);
        const j = await r.json();
        if (live && r.ok) setStops(j.stops ?? []);
      } catch { /* stop search degrades; routes still work */ }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, agency?.network]);

  /* Service alerts for the chosen agency (UTA's keyless feed today). */
  useEffect(() => {
    setAlerts(null);
    if (!agencyId || !alertsEnabled) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/transit/alerts?agency=${agencyId}`);
        const j = await r.json();
        if (live && r.ok) setAlerts({ supported: !!j.supported, list: j.alerts ?? [] });
      } catch { if (live) setAlerts({ supported: false, list: [] }); }
    })();
    return () => { live = false; };
  }, [agencyId, alertsEnabled]);

  /* Watch list: reload when another surface (the stop card) changes
   * it, so stars never disagree between the card and the Explorer. */
  useEffect(() => {
    const onChange = () => setWatchEntries(loadWatchlist());
    window.addEventListener(WATCHLIST_EVENT, onChange);
    return () => window.removeEventListener(WATCHLIST_EVENT, onChange);
  }, []);

  /* Live status for watched stops of this agency (next departure +
   * its delay state + alert count), refreshed while the Explorer is
   * open. Network agencies only — the stop API needs a static GTFS. */
  const watchedHere = useMemo(
    () => (agencyId ? watchForAgency(watchEntries, agencyId) : []),
    [watchEntries, agencyId],
  );
  useEffect(() => {
    if (!agencyId || !agency?.network) return;
    const stopsToPoll = watchedHere.filter((w) => w.kind === 'stop');
    if (stopsToPoll.length === 0) return;
    let live = true;
    const load = async () => {
      const out: typeof watchArrivals = {};
      await Promise.all(stopsToPoll.map(async (w) => {
        try {
          const r = await fetch(`/api/transit/stop?agency=${agencyId}&id=${encodeURIComponent(w.key)}`);
          const j = await r.json();
          if (!r.ok || j.error) return;
          const first = (j.arrivals ?? [])[0];
          out[watchId(w)] = {
            next: first
              ? { route: first.route, headsign: first.headsign, inMin: first.inMin, basis: first.basis, delayS: first.delayS ?? null }
              : null,
            alertCount: (j.alerts ?? []).length,
          };
        } catch { /* entry keeps its last state — no fake freshness */ }
      }));
      if (live) setWatchArrivals((prev) => ({ ...prev, ...out }));
    };
    void load();
    const iv = setInterval(load, 45000);
    return () => { live = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, agency?.network, watchedHere.map((w) => watchId(w)).join(',')]);

  /* Route detail (network agencies): today's service + its alerts. */
  useEffect(() => {
    if (!agencyId || !selShort || !agency?.network) { setDetail(null); return; }
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
      } catch { /* detail shows its empty state */ }
      if (live) setDetailLoading(false);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, selShort, agency?.network]);

  const liveRoutes = useMemo(() => aggregateLiveRoutes(vehicles), [vehicles]);
  const netRoutes = network?.phase === 'ready' ? network.routes : [];
  const routeList = useMemo(() => {
    const base = agency?.network ? netRoutes : [];
    const searched = searchRoutes(base, routeQuery);
    return filterByModeFamily(searched, modeFilter);
  }, [agency?.network, netRoutes, routeQuery, modeFilter]);
  const liveList = useMemo(() => filterByModeFamily(liveRoutes, modeFilter), [liveRoutes, modeFilter]);
  const selLiveVehicles = useMemo(
    () => (selShort ? vehicles.filter((v) => v.route === selShort) : []),
    [vehicles, selShort],
  );
  const ovRouteHits = useMemo(() => {
    if (!ovQuery.trim()) return [];
    if (agency?.network) return searchRoutes(netRoutes, ovQuery).slice(0, 8);
    const q = ovQuery.trim().toLowerCase();
    return liveRoutes.filter((r) => r.route.toLowerCase().includes(q)).slice(0, 8)
      .map((r) => ({ short: r.route, long: '', mode: r.mode, color: MODE_COLOR[r.mode] ?? '#B0BEC5', id: r.route, directions: [] as NetRoute['directions'] }));
  }, [ovQuery, agency?.network, netRoutes, liveRoutes]);
  const ovStopHits = useMemo(() => searchStops(stops, ovQuery, 8), [stops, ovQuery]);
  const ovAgencyHits = useMemo(() => {
    const q = ovQuery.trim().toLowerCase();
    if (!q) return [];
    return agencies.filter((a) => a.name.toLowerCase().includes(q) || a.region.toLowerCase().includes(q));
  }, [agencies, ovQuery]);

  /* Per-route service status from the agency's active alerts
   * (lib/transit/status — effect field + route matching only). */
  const statusByShort = useMemo(() => {
    const map = new Map<string, RouteStatus>();
    if (!alertsEnabled || !alerts?.supported) return map;
    const now = Date.now();
    for (const r of netRoutes) {
      map.set(r.short, routeStatusFromAlerts(alertsMatchingRoute(alerts.list, r), now));
    }
    return map;
  }, [alertsEnabled, alerts, netRoutes]);

  /* The service-status board (detours / disruptions / system-wide),
   * from the same alerts fetch. Network agencies only — grouping by
   * route needs the published route index. */
  const board = useMemo(() => {
    if (!agency?.network || !alerts?.supported) return null;
    return buildServiceBoard(alerts.list, netRoutes, Date.now());
  }, [agency?.network, alerts, netRoutes]);

  const detailStatus = detail ? statusByShort.get(detail.route.short) : undefined;

  const openRoute = (short: string) => { setSelShort(short); setTab('routes'); };
  const closeRoute = () => { setSelShort(null); setDetail(null); onSelectRoute(null); };
  const switchAgency = (id: string) => { setAgencyId(id); setSelShort(null); setDetail(null); onSelectRoute(null); };
  const toggleWatchEntry = (entry: WatchEntry) => {
    const next = toggleWatch(watchEntries, entry);
    setWatchEntries(next);
    saveWatchlist(next);
  };

  const statCard = (label: string, value: string, sub: string) => (
    <div className="rounded-xl border border-cyan-300/20 bg-white/[0.03] px-3 py-2.5 min-w-0">
      <div className="text-[8.5px] font-mono tracking-[0.18em] text-cyan-200/50 uppercase">{label}</div>
      <div className="text-[19px] font-mono font-bold text-white leading-tight tabular-nums">{value}</div>
      <div className="text-[8.5px] font-mono text-white/40 leading-snug">{sub}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[600] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(4,12,26,0.97), rgba(2,6,16,0.985))',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        touchAction: 'pan-y',
      }}
      role="dialog"
      aria-label="Transit Explorer"
      data-transit-explorer
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-cyan-300/15 px-3 sm:px-5 pt-3 pb-3">
        <div className="mx-auto w-full max-w-5xl flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-cyan-300/35 bg-cyan-300/[0.06] text-[10px] font-mono tracking-wider text-cyan-100 hover:bg-cyan-300/[0.12] transition-colors"
          >
            ← BACK TO GLOBE
          </button>
          <div className="flex-1 min-w-[140px]">
            <div className="text-[15px] font-bold tracking-[0.1em] text-white leading-none">
              🚌 TRANSIT <span style={{ background: 'linear-gradient(90deg,#22D3EE,#38BDF8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>EXPLORER</span>
            </div>
            <div className="mt-1 text-[8.5px] font-mono tracking-[0.2em] text-cyan-200/40 uppercase">Live public transit · real feeds only</div>
          </div>
          <select
            value={agencyId ?? ''}
            onChange={(e) => switchAgency(e.target.value)}
            aria-label="Transit agency"
            className="rounded-lg border border-white/15 bg-black/60 px-2 py-2 text-[11px] font-mono text-white/85 focus:outline-none focus:border-cyan-300/50 max-w-[46vw]"
          >
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {a.region}{a.network ? ' · network' : ''}</option>
            ))}
          </select>
          <div className="text-[9px] font-mono text-white/40 whitespace-nowrap">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${vehiclesError ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {vehiclesError ? 'FEED UNREACHABLE' : `UPDATED ${agoText(vehiclesAt, Date.now())}`}
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto w-full max-w-5xl flex gap-1 mt-3" role="tablist" aria-label="Transit Explorer sections">
          {(['overview', 'routes', 'alerts'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-[0.14em] transition-colors ${tab === t ? 'bg-cyan-300/15 text-white border border-cyan-300/40' : 'text-white/40 border border-transparent hover:text-white hover:bg-white/5'}`}
            >
              {t.toUpperCase()}{t === 'alerts' && alerts?.list.length ? ` (${alerts.list.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto styled-scrollbar" style={{ overscrollBehavior: 'contain' }}>
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-5 py-4">
          {!agency && <div className="text-[11px] font-mono text-white/45">Loading the agency directory…</div>}

          {agency && tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                {statCard('Active vehicles', vehiclesAt || vehicles.length ? String(vehicles.length) : '—',
                  vehiclesError ? 'feed unreachable — last good data' : `${agency.name} live positions`)}
                {statCard('Routes',
                  agency.network
                    ? network?.phase === 'ready' ? String(network.routes.length) : '—'
                    : String(liveRoutes.length),
                  agency.network ? 'in the published network' : 'reporting right now')}
                {statCard('Stops',
                  agency.network
                    ? network?.phase === 'ready' ? network.stopCount.toLocaleString('en-US') : '—'
                    : '—',
                  agency.network ? 'in the published network' : 'not published keyless by this agency')}
                {statCard('Service alerts',
                  !alertsEnabled ? 'OFF' : alerts ? (alerts.supported ? String(alerts.list.length) : '—') : '…',
                  !alertsEnabled ? 'switched off in Layers' : alerts?.supported ? 'active on this network' : 'no keyless alert feed')}
              </div>

              <input
                value={ovQuery}
                onChange={(e) => setOvQuery(e.target.value)}
                placeholder={`Search ${agency.name} routes, stops — or another city / agency`}
                className="w-full mb-3 rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2.5 text-[12px] font-mono text-white/85 placeholder:text-white/30 focus:outline-none focus:border-cyan-300/40"
                aria-label="Search routes, stops, agencies"
              />
              {ovQuery.trim() && (
                <div className="mb-4 space-y-3">
                  {ovRouteHits.length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 mb-1">ROUTES</div>
                      {ovRouteHits.map((r) => (
                        <button key={r.short} onClick={() => openRoute(r.short)} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.05]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/50" style={{ background: r.color }} />
                          <span className="text-[11px] font-mono font-bold text-white/90 w-12 shrink-0">{r.short}</span>
                          <span className="text-[10px] font-mono text-white/60 truncate">{r.long || 'Live route'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {ovStopHits.length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 mb-1">STOPS</div>
                      {ovStopHits.map((s) => (
                        <div key={s.id} className="relative">
                          <button
                            onClick={() => onFocusStop(agency.id, s)}
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 pr-9 text-left hover:bg-white/[0.05]"
                          >
                            <span className="text-[11px] shrink-0">🚏</span>
                            <span className="text-[10px] font-mono text-white/75 truncate flex-1">{s.name}</span>
                            <span className="text-[8px] font-mono text-white/35">{s.routes.join(' · ')}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Directions to ${s.name}`}
                            title="Directions to this stop"
                            onClick={() => { dispatchStopDirections({ name: s.name, lat: s.lat, lng: s.lng }); onClose(); }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[11px] text-white/35 hover:text-cyan-200 hover:bg-white/10 transition-colors"
                          >
                            🧭
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {ovAgencyHits.length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 mb-1">AGENCIES</div>
                      {ovAgencyHits.map((a) => (
                        <button key={a.id} onClick={() => switchAgency(a.id)} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.05]">
                          <span className="text-[10px] font-mono text-white/80">{a.name}</span>
                          <span className="text-[9px] font-mono text-white/40">{a.region}</span>
                          {a.network && <span className="text-[8px] font-mono rounded px-1 py-0.5 bg-cyan-300/15 text-cyan-200">NETWORK</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {ovRouteHits.length === 0 && ovStopHits.length === 0 && ovAgencyHits.length === 0 && (
                    <div className="text-[10px] font-mono text-white/45">Nothing matches “{ovQuery}” in the loaded data.</div>
                  )}
                </div>
              )}

              <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 mb-1.5">COVERED AGENCIES — {agencies.length} LIVE FEEDS</div>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {agencies.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => switchAgency(a.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${a.id === agencyId ? 'border-cyan-300/40 bg-cyan-300/[0.06]' : 'border-white/[0.07] hover:bg-white/[0.04]'}`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-mono font-bold text-white/85 truncate">{a.name}</span>
                      <span className="block text-[9px] font-mono text-white/40 truncate">{a.region} · {a.modes.map((m) => MODE_TAG[m] ?? m).join(' / ')}</span>
                    </span>
                    {a.network && <span className="text-[8px] font-mono rounded px-1 py-0.5 bg-cyan-300/15 text-cyan-200 shrink-0">ROUTES + STOPS</span>}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/35">
                Vehicles are live for every covered agency. Full route indexes, stop lists, timetables and
                service alerts exist only where the agency publishes a keyless static GTFS / alert feed —
                today that is UTA (Salt Lake City). Everywhere else, Routes shows what is reporting right now.
              </p>
            </>
          )}

          {agency && tab === 'routes' && !selShort && (
            <>
              <div className="flex gap-2 flex-wrap mb-3">
                <input
                  value={routeQuery}
                  onChange={(e) => setRouteQuery(e.target.value)}
                  placeholder={agency.network ? `Search routes — try ${agency.id === 'uta' ? '17 or 417' : 'a route number or name'}` : 'Search reporting routes'}
                  className="flex-1 min-w-[180px] rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-[12px] font-mono text-white/85 placeholder:text-white/30 focus:outline-none focus:border-cyan-300/40"
                  aria-label="Search routes"
                />
                <div className="flex gap-1" role="group" aria-label="Mode filter">
                  {(['all', 'bus', 'rail'] as ModeFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setModeFilter(f)}
                      aria-pressed={modeFilter === f}
                      className={`px-2.5 py-2 rounded-lg text-[9px] font-mono tracking-wider transition-colors ${modeFilter === f ? 'bg-cyan-300/15 text-white border border-cyan-300/40' : 'text-white/40 border border-white/10 hover:text-white'}`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {agency.network ? (
                <>
                  {network?.phase === 'error' && (
                    <div className="text-[11px] font-mono text-white/50">Route network unavailable right now — live vehicles are unaffected.</div>
                  )}
                  {network?.phase !== 'ready' && network?.phase !== 'error' && (
                    <div className="text-[11px] font-mono text-white/45">Loading the route network…</div>
                  )}
                  <div className="space-y-0.5">
                    {groupRoutesByType(routeList).map((g) => (
                      <div key={g.id} className="mb-2">
                        <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 px-1 pt-1.5 pb-1">
                          {g.label} — {g.routes.length}
                        </div>
                        {g.routes.map((r) => {
                          const live = liveCountForRoute(vehicles, r.short);
                          const st = statusByShort.get(r.short);
                          const starred = isWatched(watchEntries, { kind: 'route', agencyId: agency.id, key: r.short });
                          return (
                            <div key={r.id} className="relative">
                              <button
                                onClick={() => openRoute(r.short)}
                                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 pr-9 text-left hover:bg-white/[0.05] transition-colors"
                              >
                                <span className="shrink-0 w-3 h-3 rounded-full border border-black/50" style={{ background: r.color }} />
                                <span className="text-[12px] font-mono font-bold text-white/90 w-14 shrink-0">{r.short}</span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[10.5px] font-mono text-white/70 truncate">{r.long}</span>
                                  <span className="block text-[8.5px] font-mono text-white/35 truncate">
                                    {r.directions.length > 0
                                      ? r.directions.map((d) => d.headsign).filter(Boolean).join(' ⇄ ') || '—'
                                      : 'Not in the current feed — no scheduled service'}
                                  </span>
                                </span>
                                {st && st.status !== 'normal' && <RouteStatusChip status={st} />}
                                <span className="text-[9px] font-mono shrink-0" style={{ color: live > 0 ? '#7EE2A8' : 'rgba(255,255,255,0.3)' }}>
                                  {live > 0 ? `● ${live} live` : '—'}
                                </span>
                                <span className="text-[8px] font-mono text-white/35 shrink-0">{MODE_TAG[r.mode] ?? 'TRANSIT'}</span>
                              </button>
                              <button
                                type="button"
                                aria-label={starred ? `Stop watching route ${r.short}` : `Watch route ${r.short}`}
                                aria-pressed={starred}
                                onClick={() => toggleWatchEntry({
                                  kind: 'route', agencyId: agency.id, key: r.short,
                                  label: `${r.short} · ${r.long}`,
                                })}
                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[12px] transition-colors ${starred ? 'text-amber-300' : 'text-white/30 hover:text-white/70'}`}
                              >
                                {starred ? '★' : '☆'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {network?.phase === 'ready' && routeList.length === 0 && (
                      <div className="text-[10px] font-mono text-white/45 px-1 py-2">No routes match.</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-mono text-white/45 mb-2 leading-relaxed">
                    {agency.name} publishes live vehicle positions only — no keyless static GTFS, so there is
                    no route index, stop list or timetable to show. These are the routes reporting right now.
                  </div>
                  <div className="space-y-0.5">
                    {liveList
                      .filter((r) => !routeQuery.trim() || r.route.toLowerCase().includes(routeQuery.trim().toLowerCase()))
                      .map((r) => (
                        <button
                          key={r.route}
                          onClick={() => openRoute(r.route)}
                          className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05] transition-colors"
                        >
                          <span className="shrink-0 w-3 h-3 rounded-full border border-black/50" style={{ background: MODE_COLOR[r.mode] ?? '#B0BEC5' }} />
                          <span className="text-[12px] font-mono font-bold text-white/90 w-14 shrink-0">{r.route}</span>
                          <span className="flex-1 text-[10.5px] font-mono text-white/60">{r.count} vehicle{r.count === 1 ? '' : 's'} reporting</span>
                          <span className="text-[8px] font-mono text-white/35 shrink-0">{MODE_TAG[r.mode] ?? 'TRANSIT'}</span>
                        </button>
                      ))}
                    {liveList.length === 0 && (
                      <div className="text-[10px] font-mono text-white/45 px-1 py-2">No vehicles reporting for {agency.name} right now.</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {agency && tab === 'routes' && selShort && (
            <div>
              <button onClick={closeRoute} className="text-[10px] font-mono text-white/50 hover:text-white mb-3">← ALL ROUTES</button>
              {agency.network ? (
                <>
                  {detailLoading && !detail && <div className="text-[11px] font-mono text-white/45">Checking today's service…</div>}
                  {!detailLoading && !detail && (
                    <div className="text-[11px] font-mono text-white/45">Couldn't load this route's service — try again in a moment.</div>
                  )}
                  {detail && (
                    <>
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <span className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/50" style={{ background: detail.route.color }} />
                        <span className="text-[17px] font-mono font-bold text-white">{detail.route.short}</span>
                        <span className="text-[12px] font-mono text-white/60">{detail.route.long}</span>
                        <span className="text-[8px] font-mono rounded px-1.5 py-0.5 bg-white/10 text-white/60">{MODE_TAG[detail.route.mode] ?? 'TRANSIT'}</span>
                        {detailStatus && <RouteStatusChip status={detailStatus} />}
                      </div>
                      <div className="text-[10px] font-mono text-white/45 mb-3">
                        {selLiveVehicles.length > 0
                          ? `${selLiveVehicles.length} vehicle${selLiveVehicles.length === 1 ? '' : 's'} on this route right now`
                          : 'No vehicles reporting on this route right now'}
                      </div>
                      {alertsEnabled && detail.alerts.map((a) => (
                        <div key={a.id} className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-2.5 mb-2">
                          <div className="text-[10px] font-mono font-bold text-amber-200 leading-snug">⚠ {a.header}</div>
                          {a.description && <div className="mt-1 text-[9px] font-mono text-white/50 leading-relaxed line-clamp-3">{a.description}</div>}
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <button
                          type="button"
                          onClick={() => onViewRouteOnMap(agency.id, detail.route.id)}
                          className="px-2.5 py-1.5 rounded-md border border-cyan-300/30 bg-cyan-300/[0.07] text-[9px] font-mono tracking-wider text-cyan-100/90 hover:bg-cyan-300/[0.14] transition-colors"
                        >
                          VIEW ON MAP
                        </button>
                        <button
                          type="button"
                          aria-pressed={isWatched(watchEntries, { kind: 'route', agencyId: agency.id, key: detail.route.short })}
                          onClick={() => toggleWatchEntry({
                            kind: 'route', agencyId: agency.id, key: detail.route.short,
                            label: `${detail.route.short} · ${detail.route.long}`,
                          })}
                          className="px-2.5 py-1.5 rounded-md border border-white/15 bg-white/[0.04] text-[9px] font-mono tracking-wider text-white/70 hover:bg-white/[0.09] transition-colors"
                        >
                          {isWatched(watchEntries, { kind: 'route', agencyId: agency.id, key: detail.route.short }) ? '★ WATCHING' : '☆ WATCH ROUTE'}
                        </button>
                      </div>
                      {detail.directions.length === 0 && (
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 mb-4">
                          <div className="text-[10.5px] font-mono font-bold text-white/80">No service in the current feed</div>
                          <p className="mt-1 text-[9.5px] font-mono text-white/50 leading-relaxed">
                            {agency.name} publishes route {detail.route.short} in its route index, but the current
                            GTFS feed carries no trips for it — so there is no stop list or timetable to show.
                            Routes in this state are usually seasonal (this one runs for the ski season).
                          </p>
                          {detail.route.url && (
                            <a
                              href={detail.route.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-2 text-[9px] font-mono text-cyan-200/80 hover:text-cyan-100 underline underline-offset-2"
                            >
                              {agency.name}'s page for route {detail.route.short} ↗
                            </a>
                          )}
                        </div>
                      )}
                      {detail.directions.map((d) => (
                        <div key={d.dir} className="mb-4">
                          <div className="text-[11px] font-mono font-bold text-white/85">→ {d.headsign || detail.route.long}</div>
                          <div className="text-[8.5px] font-mono text-white/40 mb-1.5">
                            {d.stops.length} stops · today: {d.summary.trips} trips · first {hhmm(d.summary.firstDep)} · last {hhmm(d.summary.lastDep)}
                            {d.summary.headwayMin ? ` · every ~${d.summary.headwayMin} min` : ''}
                          </div>
                          <div className="max-h-52 overflow-y-auto styled-scrollbar rounded-lg border border-white/[0.06]">
                            {d.stops.map((s, i) => (
                              <div key={`${d.dir}-${s.id}`} className="relative">
                                <button
                                  onClick={() => onFocusStop(agency.id, { id: s.id, name: s.name, lat: s.lat, lng: s.lng, routes: [detail.route.short] })}
                                  className="w-full flex items-baseline gap-2 px-2.5 py-1.5 pr-9 text-left hover:bg-white/[0.05] transition-colors"
                                >
                                  <span className="text-[8px] font-mono text-white/30 w-5 shrink-0 text-right">{i + 1}</span>
                                  <span className="text-[10px] font-mono text-white/70 truncate">{s.name}</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Directions to ${s.name}`}
                                  title="Directions to this stop"
                                  onClick={() => { dispatchStopDirections({ name: s.name, lat: s.lat, lng: s.lng }); onClose(); }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[11px] text-white/35 hover:text-cyan-200 hover:bg-white/10 transition-colors"
                                >
                                  🧭
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <VehicleList
                        vehicles={selLiveVehicles}
                        onFollow={(v) => onFollowVehicle({ agencyId: agency.id, vehId: v.id, route: selShort, label: v.label })}
                      />
                      <div className="text-[8.5px] font-mono text-white/30 mt-2">
                        Times are today's published timetable. Tap a stop to fly the globe to it — its card shows live arrivals.
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <span className="text-[17px] font-mono font-bold text-white">{selShort}</span>
                    <span className="text-[10px] font-mono text-white/45">live route — {agency.name}</span>
                    <button
                      type="button"
                      aria-pressed={isWatched(watchEntries, { kind: 'route', agencyId: agency.id, key: selShort })}
                      onClick={() => toggleWatchEntry({ kind: 'route', agencyId: agency.id, key: selShort, label: selShort })}
                      className="px-2 py-1 rounded-md border border-white/15 bg-white/[0.04] text-[8.5px] font-mono tracking-wider text-white/70 hover:bg-white/[0.09] transition-colors"
                    >
                      {isWatched(watchEntries, { kind: 'route', agencyId: agency.id, key: selShort }) ? '★ WATCHING' : '☆ WATCH ROUTE'}
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-white/45 mb-3">
                    {selLiveVehicles.length} vehicle{selLiveVehicles.length === 1 ? '' : 's'} reporting on this route right now.
                    No static GTFS is published keyless for {agency.name}, so stops, geometry and schedules are unavailable —
                    positions below are the live feed itself.
                  </div>
                  <VehicleList
                    vehicles={selLiveVehicles}
                    onFollow={(v) => onFollowVehicle({ agencyId: agency.id, vehId: v.id, route: selShort, label: v.label })}
                  />
                </>
              )}
            </div>
          )}

          {agency && tab === 'alerts' && (
            <div className="space-y-2">
              {/* ── Watched stops & routes (device-local watch list) ── */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 mb-1">
                <div className="text-[9px] font-mono tracking-[0.18em] text-white/40 mb-1">YOUR WATCHED STOPS &amp; ROUTES</div>
                <div className="text-[8.5px] font-mono text-white/35 leading-relaxed mb-2">
                  Saved on this device. Status below is live while you're here — alerts are in-app only;
                  WorldEye doesn't send push notifications for transit yet.
                </div>
                {watchedHere.length === 0 && (
                  <div className="text-[10px] font-mono text-white/45">
                    Nothing watched yet — tap ☆ on a route, or ☆ WATCH STOP on a stop card.
                  </div>
                )}
                <div className="space-y-1">
                  {watchedHere.map((w) => {
                    const wid = watchId(w);
                    if (w.kind === 'stop') {
                      const live = watchArrivals[wid];
                      return (
                        <div key={wid} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                          <span className="text-[11px] shrink-0">🚏</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[10.5px] font-mono text-white/80 truncate">{w.label}</span>
                            <span className="flex items-center gap-1.5 text-[8.5px] font-mono text-white/40">
                              {!agency.network
                                ? 'live status needs a published network'
                                : !live
                                  ? 'checking…'
                                  : live.next
                                    ? <><span className="truncate">Next: <b className="text-white/70">{live.next.route}</b> {live.next.headsign ?? ''} · {live.next.inMin <= 0 ? 'Due' : `${live.next.inMin} min`}</span><DelayChip delayS={live.next.delayS} basis={live.next.basis} /></>
                                    : 'No departures in the next 3 hours'}
                              {live && live.alertCount > 0 && <span className="text-amber-300">⚠ {live.alertCount}</span>}
                            </span>
                          </span>
                          {w.lat != null && w.lng != null && (
                            <button
                              type="button"
                              onClick={() => onFocusStop(agency.id, { id: w.key, name: w.label, lat: w.lat!, lng: w.lng!, routes: [] })}
                              className="shrink-0 px-2 py-1 rounded-md border border-white/15 text-[8.5px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              VIEW
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Stop watching ${w.label}`}
                            onClick={() => toggleWatchEntry(w)}
                            className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[12px] text-amber-300 hover:bg-white/10 transition-colors"
                          >
                            ★
                          </button>
                        </div>
                      );
                    }
                    const st = statusByShort.get(w.key);
                    const liveN = liveCountForRoute(vehicles, w.key);
                    return (
                      <div key={wid} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                        <span className="text-[11px] shrink-0">🚌</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[10.5px] font-mono text-white/80 truncate">{w.label}</span>
                          <span className="flex items-center gap-1.5 text-[8.5px] font-mono text-white/40">
                            <span>{liveN > 0 ? `${liveN} vehicle${liveN === 1 ? '' : 's'} live` : 'nothing reporting right now'}</span>
                            {st && st.alerts.length > 0 && <span className="text-amber-300">⚠ {st.alerts.length} alert{st.alerts.length === 1 ? '' : 's'}</span>}
                          </span>
                        </span>
                        {st && <RouteStatusChip status={st} />}
                        <button
                          type="button"
                          onClick={() => openRoute(w.key)}
                          className="shrink-0 px-2 py-1 rounded-md border border-white/15 text-[8.5px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          OPEN
                        </button>
                        <button
                          type="button"
                          aria-label={`Stop watching ${w.label}`}
                          onClick={() => toggleWatchEntry(w)}
                          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[12px] text-amber-300 hover:bg-white/10 transition-colors"
                        >
                          ★
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Service status board (owner's ask: detours, disruptions, system-wide) ── */}
              {alertsEnabled && board && (
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] p-3 mb-1">
                  <div className="text-[9px] font-mono tracking-[0.18em] text-cyan-200/60 mb-2">
                    {agency.name} SERVICE STATUS — RIGHT NOW
                  </div>
                  {!boardHasNews(board) && (
                    <div className="text-[10.5px] font-mono text-white/60">
                      No detours or disruptions reported right now.
                      <span className="block text-[8.5px] text-white/35 mt-0.5">Routes not listed here are running normally.</span>
                    </div>
                  )}
                  {board.detour.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[8.5px] font-mono tracking-[0.14em] text-amber-300/80 mb-1">ON DETOUR</div>
                      <div className="flex flex-wrap gap-1">
                        {board.detour.map((b) => (
                          <button
                            key={b.route.id}
                            onClick={() => openRoute(b.route.short)}
                            className="text-[9px] font-mono font-bold rounded px-1.5 py-0.5 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 transition-colors"
                          >
                            {b.route.short}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {board.disrupted.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[8.5px] font-mono tracking-[0.14em] text-red-300/80 mb-1">DISRUPTED</div>
                      <div className="space-y-1">
                        {board.disrupted.map((b) => (
                          <button
                            key={b.route.id}
                            onClick={() => openRoute(b.route.short)}
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/[0.05]"
                          >
                            <span className="text-[10px] font-mono font-bold text-white/85 w-12 shrink-0">{b.route.short}</span>
                            <RouteStatusChip status={b.status} />
                            <span className="text-[8.5px] font-mono text-white/40 truncate">{b.status.alerts[0]?.header}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {board.systemWide.length > 0 && (
                    <div>
                      <div className="text-[8.5px] font-mono tracking-[0.14em] text-white/45 mb-1">SYSTEM-WIDE</div>
                      {board.systemWide.map((a, i) => (
                        <div key={`${a.header}-${i}`} className="text-[9.5px] font-mono text-white/60 leading-snug py-0.5">• {a.header}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!alertsEnabled && (
                <div className="text-[11px] font-mono text-white/50 leading-relaxed">
                  Service Alerts are switched off in Layers → Transit &amp; Mobility → LIVE TRANSIT NETWORK.
                  Turn them on there to see alerts here.
                </div>
              )}
              {alertsEnabled && !alerts && (
                <div className="text-[11px] font-mono text-white/45">Loading service alerts…</div>
              )}
              {alertsEnabled && alerts && !alerts.supported && (
                <div className="text-[11px] font-mono text-white/50 leading-relaxed">
                  {agency.name} does not publish a keyless GTFS-RT service-alerts feed, so there are no
                  alerts to show for this agency. (UTA is the covered alert feed today.)
                </div>
              )}
              {alertsEnabled && alerts?.supported && alerts.list.length === 0 && (
                <div className="text-[11px] font-mono text-white/50">No active service alerts for {agency.name}.</div>
              )}
              {alertsEnabled && alerts?.supported && alerts.list.map((a) => {
                const tone = alertTone(a.effect);
                const until = alertUntilMs(a);
                return (
                  <div key={a.id} className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="flex-1 min-w-[200px] text-[11px] font-mono font-bold text-amber-100 leading-snug">{a.header}</div>
                      <span
                        className="text-[8px] font-mono font-bold rounded px-1.5 py-0.5 shrink-0"
                        style={{
                          color: tone.tone === 'red' ? '#FCA5A5' : tone.tone === 'amber' ? '#FCD34D' : '#7DD3FC',
                          background: tone.tone === 'red' ? 'rgba(248,113,113,0.12)' : tone.tone === 'amber' ? 'rgba(252,211,77,0.10)' : 'rgba(125,211,252,0.10)',
                        }}
                      >
                        {tone.label}
                      </span>
                    </div>
                    {a.routes.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {a.routes.map((rt) => (
                          <button
                            key={rt}
                            onClick={() => openRoute(rt)}
                            className="text-[8px] font-mono rounded px-1.5 py-0.5 bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                          >
                            {rt}
                          </button>
                        ))}
                      </div>
                    )}
                    {until && (
                      <div className="mt-1.5 text-[9px] font-mono text-white/45">
                        Until {new Date(until).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    )}
                    {a.description && (
                      <div className="mt-1.5 text-[9.5px] font-mono text-white/55 leading-relaxed line-clamp-4">{a.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {agency && (
            <div className="mt-5 pt-3 border-t border-white/[0.06] text-[8.5px] font-mono tracking-[0.08em] text-white/30">
              {(agency.network && network?.phase === 'ready' && network.credit
                ? network.credit
                : `DATA: ${agency.attribution}`).toUpperCase()}
              {' · '}VEHICLES VIA GTFS-REALTIME
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleList({
  vehicles,
  onFollow,
}: {
  vehicles: LiveVehicleRow[];
  onFollow: (v: LiveVehicleRow) => void;
}) {
  if (vehicles.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 mb-1.5">LIVE VEHICLES ON THIS ROUTE</div>
      <div className="space-y-0.5">
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MODE_COLOR[v.mode] ?? '#B0BEC5' }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[10.5px] font-mono text-white/80 truncate">
                {v.label || v.id}{v.headsign ? ` · to ${v.headsign}` : ''}
              </span>
              <span className="flex items-center gap-1.5 text-[8.5px] font-mono text-white/35 truncate">
                {v.stopName ? <span className="truncate">Next: {v.stopName}</span> : null}
                {v.delay == null
                  ? <span>no delay data</span>
                  : <DelayChip delayS={v.delay} basis="realtime" />}
                {v.speedKmh != null ? <span>· {v.speedKmh} km/h</span> : null}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onFollow(v)}
              className="shrink-0 px-2 py-1 rounded-md border border-cyan-300/30 bg-cyan-300/[0.07] text-[8.5px] font-mono tracking-wider text-cyan-100/90 hover:bg-cyan-300/[0.14] transition-colors"
            >
              FOLLOW
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
