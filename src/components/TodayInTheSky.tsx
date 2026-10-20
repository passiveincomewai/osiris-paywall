'use client';

// Today in the Sky — a glanceable panel answering "what's happening up
// there today" from the feeds WorldEye already serves, and nothing else:
//
//   • LAUNCHES     — /api/launches (Launch Library 2), shaped by
//                    lib/sky-today with the mission board's own next /
//                    countdown maths, so the two can never disagree.
//   • IN ORBIT NOW — the ISS + CSS rows out of the satellites layer's
//                    own decoded payload (page.tsx passes them down) —
//                    real SGP4 positions, labelled with their as-of time.
//   • ACTIVE STORMS — /api/hurricanes (NOAA NHC), facts and positions
//                    joined by lib/sky-today.
//   • EARTH        — the strongest event in the USGS last-24h feed the
//                    page already loads for the earthquakes layer.
//
// Every row flies the globe to its subject and lights the matching
// layer; the footer offers the onboarding module's featured live camera
// through the same gated we:open-camera path. Empty feeds say so in
// plain words (lib/sky-today's SKY_COPY) — no filler rows, ever. The
// panel is free for everyone: it exists to pull globe visitors into the
// layers and cameras, not to sell anything.

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, CloudLightning, Rocket, Satellite as SatelliteIcon,
  Telescope, Video, X,
} from 'lucide-react';
import {
  SKY_COPY,
  fmtLatLng,
  relativeAgo,
  shapeLaunches,
  shapeQuakes,
  shapeStations,
  shapeStorms,
  type SkyLaunchRow,
  type SkyLaunches,
  type SkyLocateTarget,
  type SkyQuakeInput,
  type SkyStormRow,
} from '@/lib/sky-today';
import type { LaunchStatusKind } from '@/lib/launches/types';
import type { SatelliteRow } from '@/lib/satellite-payload';
import {
  dispatchOpenCamera,
  fetchFirstCamera,
  firstCameraPlace,
  type FirstCamera,
} from '@/lib/onboarding/first-camera';

export interface TodayInTheSkyProps {
  /** 'rail' — a button in the desktop right tool strip; 'chip' — a floating pill + bottom sheet on mobile. */
  placement: 'rail' | 'chip';
  /** Decoded /api/satellites rows the page already holds for the satellites layer. */
  satellites?: SatelliteRow[] | null;
  /** The satellites payload's own timestamp — the stations' as-of label. */
  satellitesAt?: string | number | null;
  /** The page's USGS last-24h earthquakes (its own transform shape). */
  earthquakes?: SkyQuakeInput[] | null;
  /** Fly the globe (and optionally light a layer) — page.tsx owns the map state. */
  onLocate: (target: SkyLocateTarget) => void;
}

/** The accent for this panel's rail button / chip. */
const ACCENT = '#38BDF8';

/** Status chip colours — the Space Missions board's own map, reused verbatim. */
const KIND_COLOR: Record<LaunchStatusKind, string> = {
  go: '#69F0AE',
  tbd: '#FFC107',
  success: '#40C4FF',
  failure: '#FF5252',
  other: '#B388FF',
};

const rowBtnCls =
  'w-full text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-2 py-1.5 transition-colors';
const rowDivCls =
  'w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtClock(v: string | number): string | null {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function Section({
  icon: Icon, label, note, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-3 py-2.5 border-t border-white/5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-[0.18em] text-white/45">
          <Icon className="w-3 h-3" /> {label}
        </span>
        {note && <span className="text-[8px] font-mono tracking-wider text-white/30 truncate">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono text-white/40 py-0.5">{children}</p>;
}

function StatusChip({ row }: { row: SkyLaunchRow }) {
  if (!row.statusName) return null;
  const color = KIND_COLOR[row.statusKind];
  return (
    <span
      className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em]"
      style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
    >
      {row.statusName.toUpperCase()}
    </span>
  );
}

/* ── Panel body (shared by the rail popover and the mobile sheet) ──── */

function SkyPanel({
  satellites, satellitesAt, earthquakes, onLocate, onClose,
}: {
  satellites?: SatelliteRow[] | null;
  satellitesAt?: string | number | null;
  earthquakes?: SkyQuakeInput[] | null;
  onLocate: (target: SkyLocateTarget) => void;
  onClose: () => void;
}) {
  const [launchBody, setLaunchBody] = useState<unknown>(null);
  const [launchFailed, setLaunchFailed] = useState(false);
  const [stormBody, setStormBody] = useState<unknown>(null);
  const [stormFailed, setStormFailed] = useState(false);
  const [firstCam, setFirstCam] = useState<FirstCamera | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    const loadLaunches = async () => {
      try {
        const r = await fetch('/api/launches');
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (!r.ok || !j) { setLaunchFailed(true); return; }
        setLaunchFailed(false);
        setLaunchBody(j);
      } catch {
        if (live) setLaunchFailed(true);
      }
    };
    const loadStorms = async () => {
      try {
        const r = await fetch('/api/hurricanes');
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (!r.ok || !j) { setStormFailed(true); return; }
        setStormFailed(false);
        setStormBody(j);
      } catch {
        if (live) setStormFailed(true);
      }
    };
    void loadLaunches();
    void loadStorms();
    void fetchFirstCamera().then((c) => { if (live) setFirstCam(c); });
    // Both routes are CDN-cached server-side; a slow refresh is plenty.
    const refresh = setInterval(() => { void loadLaunches(); void loadStorms(); }, 180_000);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => { live = false; clearInterval(refresh); clearInterval(tick); };
  }, []);

  const launches: SkyLaunches | 'loading' = launchFailed
    ? { kind: 'error' }
    : launchBody == null
      ? 'loading'
      : shapeLaunches(launchBody, nowMs);
  const storms: SkyStormRow[] | 'loading' | 'error' = stormFailed
    ? 'error'
    : stormBody == null
      ? 'loading'
      : shapeStorms(stormBody);
  const stations = useMemo(() => shapeStations(satellites), [satellites]);
  const quakes = useMemo(() => shapeQuakes(earthquakes, nowMs), [earthquakes, nowMs]);
  const positionsAsOf = satellitesAt != null ? fmtClock(satellitesAt) : null;

  const go = (t: SkyLocateTarget) => { onLocate(t); onClose(); };
  const launchGo = (row: SkyLaunchRow) =>
    row.lat !== null && row.lng !== null
      ? () => go({ lat: row.lat as number, lng: row.lng as number, zoom: 5, layer: 'space_missions' })
      : undefined;
  const openFirstCamera = () => {
    if (!firstCam) return;
    dispatchOpenCamera(firstCam.id);
    onClose();
  };
  const camPlace = firstCameraPlace(firstCam);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="flex items-center gap-2 text-[11px] font-mono font-bold tracking-[0.2em] text-white/90">
          <Telescope className="w-3.5 h-3.5" style={{ color: ACCENT }} /> {SKY_COPY.title}
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1 transition-colors" aria-label="Close Today in the Sky" title="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Launches ── */}
      <Section icon={Rocket} label={SKY_COPY.sectionLaunches}>
        {launches === 'loading' && <Muted>{SKY_COPY.launchesLoading}</Muted>}
        {launches !== 'loading' && launches.kind === 'error' && <Muted>{SKY_COPY.launchesError}</Muted>}
        {launches !== 'loading' && launches.kind === 'ok' && (
          <div className="space-y-1.5">
            {launches.recent && (
              <div className={rowDivCls}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-mono font-bold tracking-[0.15em] text-white/40">
                    {SKY_COPY.launchedPrefix} {relativeAgo(Date.parse(launches.recent.net ?? ''), nowMs)}
                  </span>
                  <StatusChip row={launches.recent} />
                </div>
                <div className="text-[11px] font-mono text-white/85 truncate mt-0.5">{launches.recent.name}</div>
              </div>
            )}
            {launches.next ? (
              <button type="button" onClick={launchGo(launches.next)} className={rowBtnCls}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-mono font-bold tracking-[0.15em]" style={{ color: ACCENT }}>
                    {SKY_COPY.nextLaunch}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {launches.next.webcastLive && (
                      <span className="inline-block rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em] text-[#FF5252] border border-[#FF5252]/40 bg-[#FF5252]/10">
                        {SKY_COPY.webcastLive}
                      </span>
                    )}
                    <StatusChip row={launches.next} />
                  </span>
                </div>
                <div className="text-[12px] font-mono font-semibold text-white/95 truncate mt-0.5">{launches.next.name}</div>
                {(launches.next.detail || launches.next.place) && (
                  <div className="text-[10px] font-mono text-white/50 truncate">
                    {[launches.next.detail, launches.next.place].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  {launches.next.countdown.approximate ? (
                    <>
                      <span className="text-[13px] font-mono font-bold text-white/90">{fmtDateTime(launches.next.net)}</span>
                      <span className="text-[8px] font-mono tracking-wider text-white/35">
                        NET{launches.next.netPrecision ? ` · ${launches.next.netPrecision.toUpperCase()} PRECISION` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[15px] font-mono font-bold tabular-nums" style={{ color: ACCENT }}>
                        {launches.next.countdown.label}
                      </span>
                      <span className="text-[9px] font-mono text-white/40">{fmtDateTime(launches.next.net)}</span>
                    </>
                  )}
                </div>
              </button>
            ) : (
              <Muted>{SKY_COPY.launchesEmpty}</Muted>
            )}
            {launches.more.map((row) => (
              <button key={row.id} type="button" onClick={launchGo(row)} className={rowBtnCls}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-white/85 truncate">{row.name}</span>
                  <span className="text-[9px] font-mono tabular-nums text-white/45 shrink-0">
                    {row.countdown.approximate ? fmtDateTime(row.net) : row.countdown.label}
                  </span>
                </div>
              </button>
            ))}
            {launches.stale && (
              <p className="text-[8px] font-mono tracking-wider text-white/30">{SKY_COPY.staleNote.toUpperCase()}</p>
            )}
          </div>
        )}
      </Section>

      {/* ── In orbit now ── */}
      {stations.length > 0 && (
        <Section
          icon={SatelliteIcon}
          label={SKY_COPY.sectionOrbit}
          note={positionsAsOf ? `POSITIONS AS OF ${positionsAsOf}` : undefined}
        >
          <div className="space-y-1.5">
            {stations.map((s) => (
              <button
                key={s.noradId || s.name}
                type="button"
                onClick={() => go({ lat: s.lat, lng: s.lng, zoom: 3, layer: 'satellites' })}
                className={rowBtnCls}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold text-white/90 truncate">{s.name}</span>
                  <span className="text-[8px] font-mono tracking-wider text-white/40 shrink-0">{s.mission.toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-mono text-white/50 tabular-nums">
                  {fmtLatLng(s.lat, s.lng)} · ALT {Math.round(s.altKm)} KM
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Active storms ── */}
      <Section icon={CloudLightning} label={SKY_COPY.sectionStorms} note="NOAA NHC">
        {storms === 'loading' && <Muted>{SKY_COPY.stormsLoading}</Muted>}
        {storms === 'error' && <Muted>{SKY_COPY.stormsError}</Muted>}
        {Array.isArray(storms) && storms.length === 0 && <Muted>{SKY_COPY.stormsEmpty}</Muted>}
        {Array.isArray(storms) && storms.length > 0 && (
          <div className="space-y-1.5">
            {storms.map((s) => {
              const facts = [
                s.intensityKt !== null ? `${s.intensityKt} KT${s.intensityMph !== null ? ` · ${s.intensityMph} MPH` : ''}` : null,
                s.pressureMb !== null ? `${s.pressureMb} MB` : null,
                s.movementLabel,
              ].filter(Boolean).join(' · ');
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-semibold text-white/90 truncate">{s.name}</span>
                    <span className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em] text-[#FFC107] border border-[#FFC107]/40 bg-[#FFC107]/10">
                      {s.classificationLabel.toUpperCase()}
                    </span>
                  </div>
                  {facts && <div className="text-[10px] font-mono text-white/50 tabular-nums">{facts}</div>}
                </>
              );
              return s.lat !== null && s.lng !== null ? (
                <button
                  key={s.stormId || s.name}
                  type="button"
                  onClick={() => go({ lat: s.lat as number, lng: s.lng as number, zoom: 5, layer: 'hurricanes' })}
                  className={rowBtnCls}
                >
                  {inner}
                </button>
              ) : (
                <div key={s.stormId || s.name} className={rowDivCls}>{inner}</div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Earth, last 24h ── */}
      <Section icon={Activity} label={SKY_COPY.sectionEarth} note="USGS">
        {quakes.strongest ? (
          <button
            type="button"
            onClick={
              quakes.strongest.lat !== null && quakes.strongest.lng !== null
                ? () => go({ lat: quakes.strongest?.lat as number, lng: quakes.strongest?.lng as number, zoom: 5, layer: 'earthquakes' })
                : undefined
            }
            className={rowBtnCls}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-mono font-bold text-[#FFC107]">
                M{quakes.strongest.magnitude.toFixed(1)}
              </span>
              <span className="text-[9px] font-mono text-white/40">
                {relativeAgo(quakes.strongest.timeMs, nowMs)}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/60 truncate">{quakes.strongest.place}</div>
          </button>
        ) : (
          <Muted>{SKY_COPY.quakesEmpty}</Muted>
        )}
        {quakes.count > 0 && (
          <p className="text-[8px] font-mono tracking-wider text-white/30 mt-1">
            {quakes.count} EVENTS M2.5+ IN 24H{quakes.strongCount > 0 ? ` · ${quakes.strongCount} AT M4.5+` : ''}
          </p>
        )}
      </Section>

      {/* ── Footer: the featured live camera + sources ── */}
      <div className="px-3 py-3 border-t border-white/5">
        {firstCam && (
          <button
            type="button"
            onClick={openFirstCamera}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#00E5FF]/30 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 px-2 py-2 text-[10px] font-mono font-bold tracking-[0.14em] text-[#00E5FF] transition-colors"
          >
            <Video className="w-3.5 h-3.5" />
            {SKY_COPY.watchCamera}{camPlace ? ` — ${camPlace.toUpperCase()}` : ''}
          </button>
        )}
        <p className="text-[8px] font-mono tracking-wider text-white/25 text-center mt-2">
          {SKY_COPY.sources} · CELESTRAK
        </p>
      </div>
    </div>
  );
}

/* ── Mount: trigger + popover, in the strip's and the sheet's shapes ── */

export default function TodayInTheSky({
  placement, satellites, satellitesAt, earthquakes, onLocate,
}: TodayInTheSkyProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  if (placement === 'chip') {
    return (
      <>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed left-3 bottom-[64px] z-[350] flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-2 text-[9px] font-mono font-bold tracking-[0.14em] text-white/80"
            aria-label={SKY_COPY.title}
            aria-expanded={open}
          >
            <Telescope className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            {SKY_COPY.chipLabel}
          </button>
        )}
        {open && (
          <div
            className="fixed inset-x-0 bottom-[52px] z-[400] glass-panel rounded-b-none max-h-[58vh] overflow-y-auto styled-scrollbar"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
            role="dialog"
            aria-label={SKY_COPY.title}
          >
            <div className="mobile-drawer-handle" />
            <SkyPanel
              satellites={satellites}
              satellitesAt={satellitesAt}
              earthquakes={earthquakes}
              onLocate={onLocate}
              onClose={close}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${open ? 'bg-[#38BDF8]/20' : 'hover:bg-white/10'}`}
        title="Today in the Sky — launches, stations, storms and quakes at a glance"
        aria-label={SKY_COPY.title}
        aria-expanded={open}
      >
        <Telescope className={`w-4 h-4 ${open ? 'text-[#38BDF8]' : 'text-white/60'}`} />
        {open && (
          <span
            aria-hidden="true"
            className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#38BDF8]"
          />
        )}
      </button>
      <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">
        {SKY_COPY.railTooltip}
      </span>
      {open && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-80 max-w-[86vw]">
          <div
            className="rounded-xl border border-[var(--border-secondary)] bg-black/80 backdrop-blur-md shadow-xl max-h-[76vh] overflow-y-auto styled-scrollbar"
            role="dialog"
            aria-label={SKY_COPY.title}
          >
            <SkyPanel
              satellites={satellites}
              satellitesAt={satellitesAt}
              earthquakes={earthquakes}
              onLocate={onLocate}
              onClose={close}
            />
          </div>
        </div>
      )}
    </div>
  );
}
