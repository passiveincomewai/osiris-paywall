'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlarmClock, Car, Loader2, Sunrise } from 'lucide-react';
import SkiRoadConditions from '@/components/SkiRoadConditions';
import {
  loadSavedRoutes,
  type SavedSkiRoute,
} from '@/lib/ski/saved-routes';
import {
  computeLeaveBy,
  forecastSunriseUrl,
  formatDurationMin,
  sunriseForDate,
  timeToMinutes,
  DEFAULT_BUFFER_MIN,
} from '@/lib/ski/first-chair';

export interface PlannerResort {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * The first-chair planner, composed in the browser: followed resorts
 * come from the server, saved routes live in this browser's
 * localStorage, and sunrise comes straight from Open-Meteo (modelled,
 * labelled with its fetch time).
 *
 * There are deliberately NO lift-open times anywhere in this planner:
 * no verified source publishes them (see the P8 evaluation), so the
 * plan is built on sunrise + the real stored drive time only, and the
 * page says exactly that. A saved route whose stored routing carried
 * no duration shows "drive time unavailable" — the distance is never
 * turned into an estimated time.
 */

function tomorrowLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface SunriseState {
  /** Resort-local sunrise ISO for the chosen date, when loaded. */
  sunrise: string | null;
  fetchedAt: string;
  failed: boolean;
}

export default function SkiFirstChairPlanner({
  followed,
}: {
  followed: PlannerResort[];
}) {
  const [routes, setRoutes] = useState<SavedSkiRoute[] | null>(null);
  const [resortSlug, setResortSlug] = useState<string>(followed[0]?.slug ?? '');
  const [routeId, setRouteId] = useState<string>('');
  const [date, setDate] = useState<string>(tomorrowLocalDate);
  const [mode, setMode] = useState<'sunrise' | 'custom'>('sunrise');
  const [customTime, setCustomTime] = useState<string>('08:00');
  const [bufferMin, setBufferMin] = useState<number>(DEFAULT_BUFFER_MIN);
  const [sunriseState, setSunriseState] = useState<SunriseState | null>(null);

  useEffect(() => {
    setRoutes(loadSavedRoutes());
  }, []);

  const resort = useMemo(
    () => followed.find((r) => r.slug === resortSlug) ?? null,
    [followed, resortSlug],
  );

  /** Saved routes that actually drive to the chosen resort. */
  const resortRoutes = useMemo(
    () => (routes ?? []).filter((r) => r.resortSlug === resortSlug),
    [routes, resortSlug],
  );

  useEffect(() => {
    if (resortRoutes.length > 0 && !resortRoutes.some((r) => r.id === routeId)) {
      setRouteId(resortRoutes[0].id);
    }
    if (resortRoutes.length === 0 && routeId !== '') setRouteId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resortRoutes]);

  const route = resortRoutes.find((r) => r.id === routeId) ?? null;

  /* Sunrise for the chosen resort + date, straight from Open-Meteo. */
  useEffect(() => {
    if (!resort || !date) return;
    let cancelled = false;
    setSunriseState(null);
    fetch(forecastSunriseUrl(resort.lat, resort.lng, date, date))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (cancelled) return;
        setSunriseState({
          sunrise: sunriseForDate(json, date),
          fetchedAt: new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          failed: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSunriseState({
            sunrise: null,
            fetchedAt: new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            }),
            failed: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resort, date]);

  if (followed.length === 0) {
    return (
      <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
        <Sunrise className="w-8 h-8 mx-auto text-[#D4AF37]" />
        <p className="mt-4 text-white/70 leading-relaxed">
          The first-chair planner starts from a resort you follow. You are not
          following any resorts yet — open a resort page and tap{' '}
          <strong className="text-white">Follow</strong>, then come back here
          to plan your leave-by time around its sunrise.
        </p>
        <Link
          href="/ski-webcams"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          Browse the ski resort directory
        </Link>
      </div>
    );
  }

  const driveMin =
    route && route.durationMin > 0 ? route.durationMin : null;
  const targetMinutes =
    mode === 'sunrise'
      ? sunriseState?.sunrise
        ? timeToMinutes(sunriseState.sunrise)
        : null
      : timeToMinutes(customTime);
  const plan =
    targetMinutes !== null && date
      ? computeLeaveBy({
          targetDate: date,
          targetMinutes,
          driveDurationMin: driveMin,
          bufferMin,
        })
      : null;

  const selectClass =
    'rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white [&>option]:text-black';
  const labelClass = 'block text-xs font-semibold tracking-wide text-white/50 mb-1.5';

  return (
    <div className="mt-12 space-y-10">
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="fc-resort" className={labelClass}>
              Resort you follow
            </label>
            <select
              id="fc-resort"
              className={`${selectClass} w-full`}
              value={resortSlug}
              onChange={(e) => setResortSlug(e.target.value)}
            >
              {followed.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fc-date" className={labelClass}>
              Ski day
            </label>
            <input
              id="fc-date"
              type="date"
              className={`${selectClass} w-full`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fc-route" className={labelClass}>
              Saved route to this resort
            </label>
            {routes === null ? (
              <p className="flex items-center gap-2 text-sm text-white/60" role="status">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> Loading
                your saved routes…
              </p>
            ) : resortRoutes.length === 0 ? (
              <p className="text-sm text-white/60 leading-relaxed">
                No saved route to {resort?.name ?? 'this resort'} in this browser
                yet, so there is no drive time to plan with.{' '}
                <Link
                  href={`/ski-webcams/${resortSlug}#drive`}
                  className="font-semibold text-[#00E5FF] hover:underline"
                >
                  Plan the drive on the resort page
                </Link>{' '}
                and tap <strong className="text-white">Save this route</strong> —
                saved routes live in this browser only.
              </p>
            ) : (
              <select
                id="fc-route"
                className={`${selectClass} w-full`}
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
              >
                {resortRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.start.label} → {r.dest.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="fc-buffer" className={labelClass}>
              Your prep buffer (minutes — boots, coffee, loading up)
            </label>
            <input
              id="fc-buffer"
              type="number"
              min={0}
              max={480}
              step={5}
              className={`${selectClass} w-full`}
              value={Number.isNaN(bufferMin) ? '' : bufferMin}
              onChange={(e) => setBufferMin(e.target.valueAsNumber)}
            />
          </div>
        </div>

        <div className="mt-6">
          <span className={labelClass}>Be at the resort by</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-white/75">
              <input
                type="radio"
                name="fc-target"
                checked={mode === 'sunrise'}
                onChange={() => setMode('sunrise')}
              />
              Sunrise
              {sunriseState?.sunrise && (
                <span className="text-white/50">
                  ({sunriseState.sunrise.slice(11)} resort local time)
                </span>
              )}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-white/75">
              <input
                type="radio"
                name="fc-target"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
              />
              A time I pick
            </label>
            {mode === 'custom' && (
              <input
                type="time"
                aria-label="Custom arrival time"
                className={selectClass}
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            )}
          </div>
          {mode === 'sunrise' &&
            (sunriseState === null ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-white/60" role="status">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> Fetching
                sunrise for {resort?.name}…
              </p>
            ) : sunriseState.failed || sunriseState.sunrise === null ? (
              <p className="mt-2 text-sm text-white/55">
                Sunrise for this date is unavailable from Open-Meteo right now —
                pick a custom arrival time instead, or try again in a moment.
                Nothing is estimated in its place.
              </p>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                Sunrise: Open-Meteo (modelled, not measured), fetched at{' '}
                {sunriseState.fetchedAt}. Times are the resort&apos;s local time.
              </p>
            ))}
        </div>

        {/* The plan — arithmetic shown plainly */}
        <div className="mt-8 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.05] p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <AlarmClock className="w-5 h-5 text-[#D4AF37]" /> Your leave-by plan
          </h2>
          {!route ? (
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Pick a saved route to this resort above and the plan will appear
              here.
            </p>
          ) : driveMin === null ? (
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Drive time unavailable for this route — the route tool stored no
              routing duration for it, so no leave-by time is calculated.
              Re-plan the drive on the{' '}
              <Link
                href={`/ski-webcams/${resortSlug}#drive`}
                className="font-semibold text-[#00E5FF] hover:underline"
              >
                resort page
              </Link>{' '}
              and save it again to store a real drive time. The distance is
              never converted into a guessed duration.
            </p>
          ) : targetMinutes === null ? (
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Waiting on a target time — sunrise above, or a custom arrival
              time.
            </p>
          ) : plan ? (
            <>
              <p className="mt-3 text-2xl md:text-3xl font-bold">
                Leave by {plan.leaveClock}
                {plan.isPreviousDay && (
                  <span className="text-[#e8c55a]"> — the evening before</span>
                )}
              </p>
              {plan.isPreviousDay && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-200/85 leading-relaxed">
                  Heads up: this plan has you leaving on {plan.leaveDate}, the
                  day before your {plan.targetDate} ski day — the drive plus
                  your buffer reaches back past midnight.
                </p>
              )}
              <ul className="mt-4 space-y-1.5 text-sm text-white/70">
                <li>
                  At the resort by:{' '}
                  <strong className="text-white">{plan.targetClock}</strong>
                  {mode === 'sunrise' ? ' (sunrise)' : ' (your pick)'} on{' '}
                  {plan.targetDate}
                </li>
                <li>
                  Minus drive: <strong className="text-white">{formatDurationMin(plan.driveMin)}</strong>{' '}
                  ({route.start.label} → {route.dest.label}, the routing
                  duration stored when you saved this route)
                </li>
                <li>
                  Minus your prep buffer:{' '}
                  <strong className="text-white">{formatDurationMin(plan.bufferMin)}</strong>
                </li>
                <li>
                  = Leave by: <strong className="text-white">{plan.leaveClock}</strong>
                  {plan.isPreviousDay ? ` on ${plan.leaveDate}` : ''}
                </li>
              </ul>
            </>
          ) : null}
          <p className="mt-4 text-[11px] leading-relaxed text-white/35">
            Lift-open times aren&apos;t included — no verified source publishes
            them, so this planner does not invent or estimate them. It plans
            from sunrise and your real drive time only.
          </p>
        </div>
      </section>

      {/* Check before you leave — road events on the chosen route.
          Omits itself cleanly when there is no route or the feed fails. */}
      {route && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
            <Car className="w-5 h-5 text-[#D4AF37]" /> Check before you leave
          </h2>
          <SkiRoadConditions route={route} />
        </section>
      )}
    </div>
  );
}
