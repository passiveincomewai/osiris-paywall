'use client';

// Today in the Sky — a glanceable panel answering "what's happening up
// there today" from the feeds WorldEye already serves, and nothing else:
//
//   • LAUNCHES     — /api/launches (Launch Library 2), shaped by
//                    lib/sky-today with the mission board's own next /
//                    countdown maths, so the two can never disagree.
//   • IN ORBIT NOW — the ISS + CSS rows out of the satellites layer's
//                    own decoded payload (page.tsx passes them down) —
//                    real SGP4 positions, labelled with their as-of
//                    time. The OBJECTS card is that same payload's row
//                    count, which is the route's own `total`.
//   • ACTIVE STORMS — /api/hurricanes (NOAA NHC), facts and positions
//                    joined by lib/sky-today.
//   • EARTH        — the strongest event in the USGS last-24h feed the
//                    page already loads for the earthquakes layer.
//
// The skin is the owner's neon reference plate: a WorldEye header
// plate, one framed plate per section (thumbnail tiles cropped from
// the reference artwork in public/images/sky/), a stat card per
// section carrying the section's real headline number, and the
// featured-camera button. Every value is live feed data; empty feeds
// say so in plain words (lib/sky-today's SKY_COPY) — no filler rows,
// ever. Section chevrons collapse/expand their section; every row
// flies the globe to its subject and lights the matching layer; the
// footer offers the onboarding module's featured live camera through
// the same gated we:open-camera path. The panel is free for everyone:
// it exists to pull globe visitors into the layers and cameras, not
// to sell anything.

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, CalendarDays, ChevronRight, Clock3, CloudLightning, MapPin,
  Rocket, Satellite as SatelliteIcon, Telescope, Triangle, Video, Wind, X,
} from 'lucide-react';
import {
  SKY_COPY,
  countTrackedObjects,
  countdownClock,
  fmtCount,
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
  type SkyStationRow,
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

const plateCls =
  'mx-2.5 mt-2.5 overflow-hidden rounded-xl border border-sky-400/25 bg-[#03142B]/85 shadow-[0_0_18px_rgba(56,189,248,0.10)]';
const heroBtnCls =
  'block w-full rounded-lg border border-sky-300/15 bg-black/30 p-2 text-left transition-colors hover:bg-sky-400/10';
const heroDivCls =
  'block w-full rounded-lg border border-sky-300/15 bg-black/30 p-2';
const rowBtnCls =
  'w-full text-left rounded-lg border border-sky-300/15 bg-white/[0.03] hover:bg-sky-400/10 px-2 py-1.5 transition-colors';
const rowDivCls =
  'w-full rounded-lg border border-sky-300/15 bg-white/[0.03] px-2 py-1.5';

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

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono text-white/40 py-0.5">{children}</p>;
}

/** The section header's right-hand source badge: a label + a live dot. */
function LiveBadge({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[8px] font-mono font-bold tracking-[0.16em] text-white/50">
      {label}
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
    </span>
  );
}

/** One framed neon plate: header band (icon, label, badge, chevron) + body.
 *  The chevron is the section's collapse toggle — no decorative controls. */
function SkySection({
  icon: Icon, label, badge, open, onToggle, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={plateCls}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 pb-1 pt-2.5 text-left"
      >
        <Icon className="h-4 w-4 shrink-0 text-sky-300" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-mono font-bold tracking-[0.22em] text-white/90">
          {label}
        </span>
        {badge}
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-sky-300 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && <div className="px-2.5 pb-2.5 pt-1">{children}</div>}
    </section>
  );
}

/** A thumbnail tile cropped from the owner's reference artwork. */
function Thumb({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="h-[68px] w-[86px] shrink-0 rounded-md border border-sky-300/25 object-cover"
    />
  );
}

/** One icon + value line inside a hero card's field column. */
function FieldRow({
  icon: Icon, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[9.5px] font-mono leading-tight text-white/65">
      <Icon className="h-3 w-3 shrink-0 text-sky-300/80" />
      <span className="truncate">{children}</span>
    </div>
  );
}

/** The right-hand stat card: a labelled pill + the section's real number. */
function StatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-sky-300/20 bg-sky-400/[0.07] px-1 py-1.5 text-center">
      <span className="flex items-center gap-1 rounded-full border border-sky-300/30 px-1.5 py-px text-[6.5px] font-mono font-bold tracking-[0.1em] text-sky-200">
        <Icon className="h-2.5 w-2.5" /> {label}
      </span>
      <span className="font-mono text-[15px] font-bold tabular-nums leading-none text-white/95">{value}</span>
      {sub && <span className="text-[7px] font-mono tracking-wider text-white/40">{sub}</span>}
    </div>
  );
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

/**
 * The launches stat card: the launch's real status as the pill, and
 * either a ticking H:M:S countdown (precise NETs only) or the NET date
 * itself (approximate NETs — never fake ticking seconds).
 */
function CountdownCard({ row }: { row: SkyLaunchRow }) {
  const clock = countdownClock(row.countdown);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const parts = clock
    ? [
        { k: 'H', v: clock.hours },
        { k: 'M', v: clock.minutes },
        { k: 'S', v: clock.seconds },
      ]
    : [];
  return (
    <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-sky-300/20 bg-sky-400/[0.07] px-1 py-1.5 text-center">
      {row.statusName ? (
        <span
          className="inline-block max-w-full truncate rounded-full px-1.5 py-px text-[7px] font-mono font-bold tracking-[0.12em]"
          style={{
            color: KIND_COLOR[row.statusKind],
            border: `1px solid ${KIND_COLOR[row.statusKind]}55`,
            background: `${KIND_COLOR[row.statusKind]}14`,
          }}
        >
          {row.statusName.toUpperCase()}
        </span>
      ) : (
        <span className="text-[7px] font-mono font-bold tracking-[0.12em] text-sky-200">UPCOMING</span>
      )}
      {clock ? (
        <>
          <span className="sr-only">{row.countdown.label}</span>
          <div aria-hidden="true" className="flex items-start justify-center gap-[3px] font-mono tabular-nums">
            <span className="pt-[3px] text-[8px] font-bold text-sky-300">{clock.sign}</span>
            {parts.map((p, i) => (
              <span key={p.k} className="flex items-start gap-[3px]">
                {i > 0 && <span className="pt-px text-[13px] font-bold leading-none text-sky-400/70">:</span>}
                <span className="flex flex-col items-center">
                  <span className="text-[13px] font-bold leading-none text-sky-100">{p2(p.v)}</span>
                  <span className="mt-0.5 text-[6px] tracking-[0.2em] text-white/35">{p.k}</span>
                </span>
              </span>
            ))}
          </div>
          {clock.days > 0 && (
            <span className="text-[7px] font-mono tracking-wider text-white/40">
              + {clock.days} DAY{clock.days === 1 ? '' : 'S'}
            </span>
          )}
        </>
      ) : (
        <div>
          <div className="font-mono text-[10px] font-bold leading-tight text-white/90">{fmtDateTime(row.net)}</div>
          <div className="mt-0.5 text-[7px] font-mono tracking-wider text-white/40">
            NET{row.netPrecision ? ` · ${row.netPrecision.toUpperCase()} PRECISION` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

/** The next launch, as the reference plate lays it out. */
function LaunchHero({ row, onGo }: { row: SkyLaunchRow; onGo?: () => void }) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] font-mono font-semibold text-white/95">{row.name}</span>
        {row.webcastLive && (
          <span className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em] text-[#FF5252] border border-[#FF5252]/40 bg-[#FF5252]/10">
            {SKY_COPY.webcastLive}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Thumb src="/images/sky/launches.webp" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <FieldRow icon={CalendarDays}>{fmtDateTime(row.net)}</FieldRow>
          <FieldRow icon={MapPin}>{row.place ?? '—'}</FieldRow>
          <FieldRow icon={Clock3}>{row.detail ?? '—'}</FieldRow>
        </div>
        <CountdownCard row={row} />
      </div>
    </>
  );
  return onGo ? (
    <button type="button" onClick={onGo} className={heroBtnCls}>{inner}</button>
  ) : (
    <div className={heroDivCls}>{inner}</div>
  );
}

/** The headline station (ISS first), with the tracked-objects stat card. */
function StationHero({
  station, objectCount, onGo,
}: {
  station: SkyStationRow;
  objectCount: number | null;
  onGo: () => void;
}) {
  return (
    <button type="button" onClick={onGo} className={heroBtnCls}>
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] font-mono font-semibold text-white/95">{station.name}</span>
        <span className="shrink-0 text-[8px] font-mono tracking-wider text-white/40">{station.mission.toUpperCase()}</span>
      </div>
      <div className="mt-1.5 flex gap-2">
        <Thumb src="/images/sky/orbit.webp" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <FieldRow icon={SatelliteIcon}>{station.mission.toUpperCase()}</FieldRow>
          <FieldRow icon={MapPin}>{fmtLatLng(station.lat, station.lng)}</FieldRow>
          <FieldRow icon={Triangle}>ALT {Math.round(station.altKm)} KM</FieldRow>
        </div>
        <StatCard icon={SatelliteIcon} label="OBJECTS" value={fmtCount(objectCount)} />
      </div>
    </button>
  );
}

/** The strongest active storm, with the active-storms stat card. */
function StormHero({
  storm, total, onGo,
}: {
  storm: SkyStormRow;
  total: number;
  onGo?: () => void;
}) {
  const facts = [
    storm.intensityKt !== null ? `${storm.intensityKt} KT${storm.intensityMph !== null ? ` · ${storm.intensityMph} MPH` : ''}` : null,
    storm.pressureMb !== null ? `${storm.pressureMb} MB` : null,
  ].filter(Boolean).join(' · ');
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] font-mono font-semibold text-white/95">{storm.name}</span>
        <span className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em] text-[#FFC107] border border-[#FFC107]/40 bg-[#FFC107]/10">
          {storm.classificationLabel.toUpperCase()}
        </span>
      </div>
      <div className="mt-1.5 flex gap-2">
        <Thumb src="/images/sky/storms.webp" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <FieldRow icon={CloudLightning}>{storm.classificationLabel.toUpperCase()}</FieldRow>
          <FieldRow icon={Wind}>{facts || '—'}</FieldRow>
          <FieldRow icon={MapPin}>
            {storm.lat !== null && storm.lng !== null ? fmtLatLng(storm.lat, storm.lng) : storm.movementLabel ?? '—'}
          </FieldRow>
        </div>
        <StatCard icon={CloudLightning} label="ACTIVE STORMS" value={fmtCount(total)} />
      </div>
    </>
  );
  return onGo ? (
    <button type="button" onClick={onGo} className={heroBtnCls}>{inner}</button>
  ) : (
    <div className={heroDivCls}>{inner}</div>
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
  const [openSections, setOpenSections] = useState({ launches: true, orbit: true, storms: true, earth: true });
  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

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
  const objectCount = useMemo(() => countTrackedObjects(satellites), [satellites]);
  const quakesKnown = Array.isArray(earthquakes);
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
    <div className="bg-[#020A1C] pb-2.5">
      {/* Header plate — the reference's WorldEye brand plate, live. */}
      <div className="relative overflow-hidden border-b border-sky-400/20 bg-gradient-to-b from-[#05224D] via-[#03142B] to-[#020A1C] px-3.5 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/worldeye-eye.png" alt="" className="h-9 w-auto object-contain" />
            <div>
              <div className="text-[16px] font-bold leading-none tracking-wide text-white">
                World<span className="text-sky-400">Eye</span>
              </div>
              <div className="mt-1 text-[6.5px] font-mono tracking-[0.3em] text-sky-200/50">
                LIVE CAMERAS • REAL TIME WORLD • GLOBAL INTEL
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              onClick={onClose}
              className="rounded-md border border-sky-300/30 bg-white/5 p-1.5 text-white/70 transition-colors hover:text-white"
              aria-label="Close Today in the Sky"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-px text-[8px] font-mono font-bold tracking-[0.16em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-sky-400/15 pt-2">
          <Telescope className="h-3.5 w-3.5" style={{ color: ACCENT }} />
          <span className="text-[10px] font-mono font-bold tracking-[0.24em] text-white/90">{SKY_COPY.title}</span>
        </div>
      </div>

      {/* ── Launches ── */}
      <SkySection
        icon={Rocket}
        label={SKY_COPY.sectionLaunches}
        badge={<LiveBadge label="LIVE" />}
        open={openSections.launches}
        onToggle={() => toggleSection('launches')}
      >
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
              <LaunchHero row={launches.next} onGo={launchGo(launches.next)} />
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
      </SkySection>

      {/* ── In orbit now ── */}
      {stations.length > 0 && (
        <SkySection
          icon={SatelliteIcon}
          label={SKY_COPY.sectionOrbit}
          badge={<LiveBadge label="LIVE" />}
          open={openSections.orbit}
          onToggle={() => toggleSection('orbit')}
        >
          <div className="space-y-1.5">
            <StationHero
              station={stations[0]}
              objectCount={objectCount}
              onGo={() => go({ lat: stations[0].lat, lng: stations[0].lng, zoom: 3, layer: 'satellites' })}
            />
            {stations.slice(1).map((s) => (
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
            {positionsAsOf && (
              <p className="text-right text-[8px] font-mono tracking-wider text-white/30">
                POSITIONS AS OF {positionsAsOf}
              </p>
            )}
          </div>
        </SkySection>
      )}

      {/* ── Active storms ── */}
      <SkySection
        icon={CloudLightning}
        label={SKY_COPY.sectionStorms}
        badge={<LiveBadge label="NOAA NHC" />}
        open={openSections.storms}
        onToggle={() => toggleSection('storms')}
      >
        {storms === 'loading' && <Muted>{SKY_COPY.stormsLoading}</Muted>}
        {storms === 'error' && <Muted>{SKY_COPY.stormsError}</Muted>}
        {Array.isArray(storms) && storms.length === 0 && <Muted>{SKY_COPY.stormsEmpty}</Muted>}
        {Array.isArray(storms) && storms.length > 0 && (
          <div className="space-y-1.5">
            <StormHero
              storm={storms[0]}
              total={storms.length}
              onGo={
                storms[0].lat !== null && storms[0].lng !== null
                  ? () => go({ lat: storms[0].lat as number, lng: storms[0].lng as number, zoom: 5, layer: 'hurricanes' })
                  : undefined
              }
            />
            {storms.slice(1).map((s) => {
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
      </SkySection>

      {/* ── Earth, last 24h ── */}
      <SkySection
        icon={Activity}
        label={SKY_COPY.sectionEarth}
        badge={<LiveBadge label="USGS" />}
        open={openSections.earth}
        onToggle={() => toggleSection('earth')}
      >
        {!quakesKnown ? (
          <Muted>{SKY_COPY.quakesLoading}</Muted>
        ) : quakes.strongest ? (
          <button
            type="button"
            onClick={
              quakes.strongest.lat !== null && quakes.strongest.lng !== null
                ? () => go({ lat: quakes.strongest?.lat as number, lng: quakes.strongest?.lng as number, zoom: 5, layer: 'earthquakes' })
                : undefined
            }
            className={heroBtnCls}
          >
            <div className="flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-[11px] font-mono font-semibold text-white/95">
                {quakes.strongest.place}
              </span>
              <span className="shrink-0 text-[9px] font-mono text-white/40">
                {relativeAgo(quakes.strongest.timeMs, nowMs)}
              </span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <Thumb src="/images/sky/earth.webp" />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                <FieldRow icon={Activity}>
                  <span className="font-bold text-[#FFC107]">M{quakes.strongest.magnitude.toFixed(1)}</span>
                  &nbsp;STRONGEST
                </FieldRow>
                <FieldRow icon={MapPin}>
                  {quakes.strongest.lat !== null && quakes.strongest.lng !== null
                    ? fmtLatLng(quakes.strongest.lat, quakes.strongest.lng)
                    : '—'}
                </FieldRow>
                <FieldRow icon={Clock3}>{relativeAgo(quakes.strongest.timeMs, nowMs)}</FieldRow>
              </div>
              <StatCard
                icon={Activity}
                label="EARTHQUAKES"
                value={fmtCount(quakes.count)}
                sub={quakes.strongCount > 0 ? `M2.5+ · ${quakes.strongCount} AT M4.5+` : 'M2.5+ EVENTS'}
              />
            </div>
          </button>
        ) : (
          <Muted>{SKY_COPY.quakesEmpty}</Muted>
        )}
      </SkySection>

      {/* ── Footer: the featured live camera + sources ── */}
      <div className="px-2.5 pt-2.5">
        {firstCam && (
          <button
            type="button"
            onClick={openFirstCamera}
            className="flex w-full items-center gap-2 overflow-hidden rounded-xl border border-cyan-300/40 bg-cyan-400/10 pl-3 text-left shadow-[0_0_16px_rgba(34,211,238,0.15)] transition-colors hover:bg-cyan-400/20"
          >
            <Video className="h-4 w-4 shrink-0 text-cyan-300" />
            <span className="min-w-0 flex-1 truncate py-2.5 text-[10px] font-mono font-bold tracking-[0.14em] text-cyan-100">
              {SKY_COPY.watchCamera}{camPlace ? ` — ${camPlace.toUpperCase()}` : ''}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" />
            <img
              src="/images/sky/camera.webp"
              alt=""
              aria-hidden="true"
              className="h-[38px] w-[76px] shrink-0 object-cover"
            />
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
            className="fixed left-3 bottom-[64px] z-[350] block rounded-[10px] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
            aria-label={SKY_COPY.title}
            aria-expanded={open}
          >
            <img
              src="/images/sky/launcher.webp"
              alt=""
              aria-hidden="true"
              className="block h-12 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
            />
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
        className="relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        title="Today in the Sky — launches, stations, storms and quakes at a glance"
        aria-label={SKY_COPY.title}
        aria-expanded={open}
      >
        {/* The owner's banner artwork, scaled whole (never cropped). The
            strip's hit box stays the standard 32px — the banner overflows
            left over the map, right-aligned with the strip, click-through
            outside the box so the strip's layout and every other button's
            placement are untouched. */}
        <img
          src="/images/sky/launcher.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 block h-8 w-auto max-w-none -translate-y-1/2"
        />
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
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-[340px] max-w-[86vw]">
          <div
            className="rounded-xl border border-sky-400/25 bg-[#02091A]/90 backdrop-blur-md shadow-xl max-h-[76vh] overflow-y-auto styled-scrollbar"
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
