'use client';

/**
 * OSIRIS — Transit selection card: the small, dismissible readout for
 * a tapped transit vehicle or stop (Transit redesign, 2026-10-26).
 *
 * Replaces the MapLibre HTML popups the transit layers used to open.
 * Same honesty rules as those popups — a row renders only when the
 * feed (or the agency's static GTFS join) actually provided the field
 * — but as a React card it can carry the actions the popup never
 * could: View Route, Follow Vehicle, expand into the Transit
 * Explorer, and Close, which restores the unobstructed globe.
 *
 * On mobile it is a bottom card capped at ~38vh with its own scroll,
 * so the globe stays the main surface; on desktop it sits where the
 * old floating panel used to, at a card's size — never a panel.
 */

import { useEffect, useState } from 'react';

export interface TransitVehicleSelection {
  kind: 'vehicle';
  agencyId: string;
  coords: [number, number];
  /** Feature properties from the transit source (see OsirisMap). */
  p: Record<string, any>;
}

export interface TransitStopSelection {
  kind: 'stop';
  agencyId: string;
  coords: [number, number];
  /** Feature properties from the transit-stops source. */
  p: Record<string, any>;
}

export type TransitSelection = TransitVehicleSelection | TransitStopSelection;

const MODE_LABEL: Record<string, string> = {
  bus: 'BUS', tram: 'TRAM / LIGHT RAIL', metro: 'METRO', train: 'TRAIN', ferry: 'FERRY', transit: 'TRANSIT VEHICLE',
};
const STATUS_LABEL: Record<number, string> = { 0: 'Approaching stop', 1: 'At stop', 2: 'In transit' };
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MODE_COLOR: Record<string, string> = {
  bus: '#FFA726', tram: '#66BB6A', metro: '#42A5F5', train: '#AB47BC', ferry: '#26C6DA', transit: '#B0BEC5',
};

function fmtClock(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

function ageText(ts: any, nowMs: number): string | null {
  if (!ts) return null;
  const ageS = Math.max(0, Math.round(nowMs / 1000 - Number(ts)));
  if (!Number.isFinite(ageS)) return null;
  return ageS < 60 ? `${ageS}s ago` : ageS < 3600 ? `${Math.floor(ageS / 60)}m ago` : `${Math.floor(ageS / 3600)}h ago`;
}

const actionBtn =
  'px-2 py-1.5 rounded-md border border-cyan-300/30 bg-cyan-300/[0.07] text-[9px] font-mono tracking-wider text-cyan-100/90 hover:bg-cyan-300/[0.14] transition-colors';

export default function TransitSelectionCard({
  sel,
  onClose,
  onViewRoute,
  onFollowVehicle,
  onOpenExplorer,
}: {
  sel: TransitSelection;
  onClose: () => void;
  /** Open the Explorer on this route (agency id + public label). */
  onViewRoute: (agencyId: string, routeShort: string) => void;
  onFollowVehicle: (sel: TransitVehicleSelection) => void;
  onOpenExplorer: (agencyId: string) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className="absolute left-2 bottom-24 z-[230] w-[324px] max-w-[88vw] max-h-[56vh] overflow-y-auto styled-scrollbar rounded-xl border border-[var(--border-secondary)] bg-black/75 backdrop-blur-md shadow-xl p-3 max-sm:left-2 max-sm:right-2 max-sm:w-auto max-sm:bottom-[4.25rem] max-sm:max-h-[38vh]"
      data-transit-selection-card
      role="dialog"
      aria-label={sel.kind === 'vehicle' ? 'Selected transit vehicle' : 'Selected transit stop'}
    >
      {sel.kind === 'vehicle' ? (
        <VehicleBody sel={sel} onClose={onClose} onViewRoute={onViewRoute} onFollowVehicle={onFollowVehicle} onOpenExplorer={onOpenExplorer} />
      ) : (
        <StopBody sel={sel} onClose={onClose} onViewRoute={onViewRoute} onOpenExplorer={onOpenExplorer} />
      )}
    </div>
  );
}

function CardHeader({ color, title, sub, onClose }: { color: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-mono font-bold leading-tight" style={{ color }}>{title}</div>
        {sub && <div className="text-[9px] font-mono text-white/55 mt-0.5 truncate">{sub}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
      >
        ×
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8px] font-mono tracking-[0.08em] text-white/35">{label}</div>
      <div className="text-[10px] font-mono text-white/85 leading-snug">{children}</div>
    </div>
  );
}

function VehicleBody({
  sel, onClose, onViewRoute, onFollowVehicle, onOpenExplorer,
}: {
  sel: TransitVehicleSelection;
  onClose: () => void;
  onViewRoute: (agencyId: string, routeShort: string) => void;
  onFollowVehicle: (sel: TransitVehicleSelection) => void;
  onOpenExplorer: (agencyId: string) => void;
}) {
  const p = sel.p;
  const mode = String(p.mode ?? 'transit');
  const delayTxt = p.delay == null ? null
    : p.delay >= 60 ? `${Math.round(p.delay / 60)} min late`
    : p.delay <= -60 ? `${Math.round(-p.delay / 60)} min early` : 'On time';
  const heading = p.bearing != null ? COMPASS[Math.round(Number(p.bearing) / 45) % 8] : null;
  const age = ageText(p.ts, Date.now());
  const vehicleTxt = p.label || p.vehId || '';
  return (
    <>
      <CardHeader
        color={MODE_COLOR[mode] ?? '#B0BEC5'}
        title={`🚌 ${MODE_LABEL[mode] ?? 'TRANSIT'}${p.route ? ` · ${p.route}` : ''}`}
        sub={`${p.agency ?? ''}${p.headsign ? ` · to ${p.headsign}` : ''}`}
        onClose={onClose}
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2.5">
        <Field label="ROUTE">{p.route ? <>{p.route}{p.routeName ? <span className="block text-white/50">{p.routeName}</span> : null}</> : 'Not in service'}</Field>
        <Field label="STATUS">{p.status != null ? (STATUS_LABEL[Number(p.status)] ?? '—') : '—'}</Field>
        {p.headsign ? <Field label="DESTINATION">{p.headsign}</Field> : null}
        {p.stopName ? <Field label={Number(p.status) === 1 ? 'AT STOP' : 'NEXT STOP'}>{p.stopName}</Field> : null}
        <Field label="DELAY">{delayTxt ?? '—'}</Field>
        <Field label="SPEED">{p.speedKmh != null ? `${p.speedKmh} km/h` : '—'}</Field>
        {heading ? <Field label="HEADING">{heading}</Field> : null}
        {vehicleTxt ? <Field label="VEHICLE">{vehicleTxt}</Field> : null}
        {age ? <Field label="UPDATED">{age}</Field> : null}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {p.route ? (
          <button type="button" className={actionBtn} onClick={() => onViewRoute(sel.agencyId, String(p.route))}>
            VIEW ROUTE
          </button>
        ) : null}
        <button type="button" className={actionBtn} onClick={() => onFollowVehicle(sel)}>
          FOLLOW VEHICLE
        </button>
        <button type="button" className={actionBtn} onClick={() => onOpenExplorer(sel.agencyId)}>
          TRANSIT EXPLORER ↗
        </button>
      </div>
      <div className="text-[8px] font-mono tracking-[0.08em] text-white/30">
        DATA — GTFS-REALTIME · {String(p.attribution || p.agency || '').toUpperCase()}
      </div>
    </>
  );
}

interface StopArrival { route: string; headsign?: string; inMin: number; time: string; basis: string; delayS?: number | null }

function StopBody({
  sel, onClose, onViewRoute, onOpenExplorer,
}: {
  sel: TransitStopSelection;
  onClose: () => void;
  onViewRoute: (agencyId: string, routeShort: string) => void;
  onOpenExplorer: (agencyId: string) => void;
}) {
  const p = sel.p;
  const [state, setState] = useState<
    | { phase: 'loading' }
    | { phase: 'error' }
    | { phase: 'ready'; name: string; routes: string[]; arrivals: StopArrival[]; live: boolean; credit: string }
  >({ phase: 'loading' });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/transit/stop?agency=${encodeURIComponent(sel.agencyId || 'uta')}&id=${encodeURIComponent(p.stopId)}`);
        const j = await r.json();
        if (!live) return;
        if (!r.ok || j.error) { setState({ phase: 'error' }); return; }
        setState({
          phase: 'ready',
          name: j.stop?.name ?? p.name ?? 'Stop',
          routes: (j.stop?.routes ?? []).map((x: any) => x.short),
          arrivals: j.arrivals ?? [],
          live: !!j.rt?.live,
          credit: j.credit ?? '',
        });
      } catch { if (live) setState({ phase: 'error' }); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.agencyId, p.stopId]);

  const name = state.phase === 'ready' ? state.name : (p.name || 'Stop');
  const routeChips = state.phase === 'ready' ? state.routes : String(p.routes ?? '').split(' · ').filter(Boolean);
  return (
    <>
      <CardHeader color="#ECEFF1" title={`🚏 ${String(name).toUpperCase()}`} onClose={onClose} />
      {routeChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {routeChips.map((rt) => (
            <button
              key={rt}
              type="button"
              onClick={() => onViewRoute(sel.agencyId, rt)}
              className="text-[8px] font-mono rounded px-1.5 py-0.5 bg-white/10 text-white/75 hover:bg-white/20 transition-colors"
              title={`View route ${rt}`}
            >
              {rt}
            </button>
          ))}
        </div>
      )}
      {state.phase === 'loading' && <div className="text-[9px] font-mono text-white/45 mb-2">Loading next arrivals…</div>}
      {state.phase === 'error' && (
        <div className="text-[9px] font-mono text-[#FFAB91] mb-2">Arrivals unavailable right now — the timetable service did not answer.</div>
      )}
      {state.phase === 'ready' && (
        <>
          <div className="mb-2">
            {state.arrivals.length === 0 && (
              <div className="text-[9px] font-mono text-white/45">No departures in the next 3 hours.</div>
            )}
            {state.arrivals.map((a, i) => (
              <div key={i} className="flex justify-between gap-2.5 text-[10px] font-mono py-[3px] border-b border-white/[0.06]">
                <span className="text-white/85 min-w-0 truncate"><b>{a.route}</b> {a.headsign ?? ''}</span>
                <span className="whitespace-nowrap text-white/85">
                  {a.inMin <= 0 ? 'Due' : a.inMin === 1 ? '1 min' : `${a.inMin} min`}{' '}
                  <span className="text-white/40">{fmtClock(a.time)}</span>{' '}
                  {a.basis === 'realtime'
                    ? <span className="text-[#66BB6A] font-bold">REALTIME</span>
                    : <span className="text-white/40">SCHEDULED</span>}
                  {a.delayS != null && Math.abs(a.delayS) >= 60
                    ? <span className="text-white/60"> · {a.delayS > 0 ? `${Math.round(a.delayS / 60)} min late` : `${Math.round(-a.delayS / 60)} min early`}</span>
                    : null}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button type="button" className={actionBtn} onClick={() => onOpenExplorer(sel.agencyId)}>
              TRANSIT EXPLORER ↗
            </button>
          </div>
          <div className="text-[8px] font-mono tracking-[0.08em] text-white/30">
            {state.live ? 'REALTIME PREDICTIONS ACTIVE' : 'SHOWING TIMETABLE TIMES'} · {state.credit.toUpperCase()}
          </div>
        </>
      )}
    </>
  );
}
