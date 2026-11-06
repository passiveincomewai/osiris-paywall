'use client';

import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { Camera, ExternalLink, Loader2, Lock, Navigation, PlayCircle, Route, Search, SearchX, Video, X } from 'lucide-react';
import { forgetRecent, loadRecent, rememberPlace, type RecentPlace } from '@/lib/recent-places';
import {
  applyCameraFilters,
  cameraFiltersActive,
  cameraKindLabel,
  CAMERA_KIND_OPTIONS,
  canonicalCountry,
  countryFacets,
  EMPTY_CAMERA_FILTERS,
  matchCameras,
  type CameraSearchFilters,
  type SearchableCamera,
} from '@/lib/camera-search';
import { cameraMediaKind, type CameraMediaKind } from '@/lib/country-cameras';
import { buildSearchPerformedDetail } from '@/lib/analytics/search-event';
import { trackAnalyticsEvent } from './AnalyticsTracker';
import RequestCameraForm from './RequestCameraForm';
import { Highlight, Key, KindTile, PlaceRow, type PlaceLike } from './places';

/* ═══════════════════════════════════════════════════════════════
   OSIRIS — Search
   A place, an address, a landmark or a pair of coordinates, and the map
   flies there. Cameras from the catalogue ride along: basic search
   matches them by name, city and country over the records the page has
   already loaded for the map — no second index, no extra request.
   Pro's advanced filters (country / type / live feeds only) narrow the
   camera matches; places are never filtered. Before anything is typed
   it offers where you are and where you went last; each result can be
   handed to Directions as the destination. Ctrl+F (⌘F) from anywhere,
   arrows and Enter to choose, Shift+Enter for directions, Esc to close.
   ═══════════════════════════════════════════════════════════════ */

interface Hit extends PlaceLike {
  /** How close to fly. */
  zoom: number;
}

/** One row of the unified result list: a place, or a camera. */
type NavItem =
  | { type: 'place'; hit: Hit }
  | { type: 'camera'; cam: SearchableCamera };

interface SearchBarProps {
  onLocate: (lat: number, lng: number, zoom?: number) => void;
  /** Where the map is looking. Results near it rank first, and each shows how far it is. */
  center?: { lat: number; lng: number } | null;
  /** Close the panel: Esc on an empty box, a click elsewhere, or a pick. */
  onClose?: () => void;
  /** Hand a place to Directions as the destination. */
  onDirections?: (place: PlaceLike) => void;
  /** Inside another container (the phone drawer): no frame of its own. */
  embedded?: boolean;
  /** The camera catalogue as loaded so far — camera results match over it. */
  cameras?: readonly SearchableCamera[];
  /** Pro (subscriptionStatus 'active', resolved by the page): unlocks the advanced filters. */
  isPro?: boolean;
  /** Open a camera picked from the results (the page flies there and opens the viewer). */
  onOpenCamera?: (cam: SearchableCamera) => void;
}

/** How close to fly for each kind /api/geosearch returns. */
const ZOOM_BY_KIND: Record<string, number> = {
  address: 18,
  street: 16,
  poi: 16,
  city: 12,
  region: 8,
  country: 5,
  place: 13,
  coordinate: 15,
};

const TRY = ['Eiffel Tower', '10 Downing Street', '35.6586, 139.7454'];

/** Camera rows shown alongside the places — the rest are a filter away. */
const CAMERA_HITS_SHOWN = 6;

const KIND_ICON: Record<CameraMediaKind, typeof Video> = {
  video: Video,
  snapshot: Camera,
  embed: PlayCircle,
  link: ExternalLink,
};

const parseCoords = (s: string): { lat: number; lng: number } | null => {
  const m = s.trim().match(/^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
};

/** A camera in the result list — the PlaceRow's shape, a camera's facts. */
function CameraRow({ cam, query, on, onPick, onHover, id }: {
  cam: SearchableCamera;
  query: string;
  on: boolean;
  onPick: () => void;
  onHover?: () => void;
  id?: string;
}) {
  const kind = cameraMediaKind(cam);
  const country = canonicalCountry(cam.country)?.label ?? '';
  const context = [cam.city, country].filter(Boolean).join(' · ') || cam.source || '';
  return (
    <div id={id} role="option" aria-selected={on} onMouseEnter={onHover}
      className={`group relative flex items-center rounded-lg transition-colors ${on ? 'bg-[rgba(var(--gold-rgb),0.08)]' : 'hover:bg-white/[0.035]'}`}>
      {on && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--gold-primary)]" />}
      <button type="button" onClick={onPick} tabIndex={-1}
        className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-2 text-left">
        <KindTile on={on} icon={KIND_ICON[kind]} />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] leading-snug truncate text-[var(--text-heading)]">
            <Highlight text={cam.name} query={query} />
          </span>
          {context && <span className="block mt-0.5 text-[11px] leading-snug truncate text-[var(--text-muted)]">{context}</span>}
        </span>
        <span className="text-[9px] font-mono tracking-[0.12em] uppercase text-[var(--text-muted)] flex-shrink-0 pl-1">
          {cameraKindLabel(kind)}
        </span>
      </button>
    </div>
  );
}

export default function SearchBar({ onLocate, center = null, onClose, onDirections, embedded = false, cameras, isPro = false, onOpenCamera }: SearchBarProps) {
  /* Basic search is free for everyone, signed in or not — /api/geosearch
     was never gated server-side, so the old Pro card here was the whole
     fence. Removing it also removes a hooks hazard: the card returned
     before the hooks below, so a session resolving mid-mount changed the
     hook count. The advanced FILTERS below are the Pro perk: their
     controls lock for non-Pro, and lib/camera-search makes them inert
     for non-Pro even if the state were set some other way. */
  const [value, setValue] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  // The query the current results answer, so "no results" is never shown for a search still on its way.
  const [answered, setAnswered] = useState('');
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<RecentPlace[]>(() => (typeof window === 'undefined' ? [] : loadRecent()));
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState('');
  const [filters, setFilters] = useState<CameraSearchFilters>(EMPTY_CAMERA_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 50); return () => clearTimeout(t); }, []);

  // Ctrl+F / ⌘F while open: back to the box, with what is in it selected.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  // A click anywhere else closes it, except on the button that toggles it (which closes it itself).
  useEffect(() => {
    if (!onClose || embedded) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (boxRef.current?.contains(t as Node) || t?.closest('[data-search-toggle]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, embedded]);

  const typing = value.trim().length > 0;
  const you: Hit = { label: 'Your location', context: locateNote || 'Fly to where you are', lat: 0, lng: 0, kind: 'current', zoom: 14 };

  /* Camera matches are synchronous — the catalogue is already here — so
     they never wait on the places round-trip. Filters apply to them and
     only to them (access-aware: inert unless Pro). */
  const facets = useMemo(() => countryFacets(cameras ?? []), [cameras]);
  const matchedCameras = useMemo(
    () => (typing ? matchCameras(cameras ?? [], value) : []),
    [cameras, value, typing],
  );
  const filteredCameras = useMemo(
    () => applyCameraFilters(matchedCameras, filters, isPro ? 'pro' : 'free'),
    [matchedCameras, filters, isPro],
  );
  const cameraHits = filteredCameras.slice(0, CAMERA_HITS_SHOWN);
  const filtersEmptiedCameras = isPro && cameraFiltersActive(filters) && matchedCameras.length > 0 && filteredCameras.length === 0;

  const placeItems: Hit[] = typing ? results : [you, ...recent.map(r => ({ ...r, zoom: ZOOM_BY_KIND[r.kind ?? ''] ?? 13 }))];
  const items: NavItem[] = typing
    ? [
        ...cameraHits.map((cam): NavItem => ({ type: 'camera', cam })),
        ...results.map((hit): NavItem => ({ type: 'place', hit })),
      ]
    : placeItems.map((hit): NavItem => ({ type: 'place', hit }));
  const active = Math.min(selected, Math.max(0, items.length - 1));

  const search = useCallback((q: string) => {
    setValue(q);
    setSelected(0);
    if (timerRef.current) clearTimeout(timerRef.current);

    const coords = parseCoords(q);
    if (coords) {
      abortRef.current?.abort();
      setLoading(false);
      setResults([{ label: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, context: 'Coordinates', ...coords, kind: 'coordinate', zoom: 15 }]);
      setAnswered(q);
      return;
    }
    if (q.trim().length < 2) { abortRef.current?.abort(); setResults([]); setLoading(false); setAnswered(q); return; }

    /* Through our own route, never straight to Nominatim: one cache and one
       budget for every visitor instead of one search per person per keystroke
       (see lib/nominatim.ts). It sends where the map is looking, so
       "Notre-Dame" over Montreal is the basilica rather than a village in
       Normandy, and abandons the lookup for an earlier keystroke, so a slow
       reply for "Par" can never land after the one for "Paris". */
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const bias = center ? `&lat=${center.lat}&lng=${center.lng}` : '';
        const res = await fetch(`/api/geosearch?q=${encodeURIComponent(q)}${bias}`, { signal: ctrl.signal });
        const data = await res.json();
        if (ctrl.signal.aborted) return;
        setResults((data.results || []).map((r: { name: string; context: string; lat: number; lng: number; kind: string }) => ({
          label: r.name, context: r.context, lat: r.lat, lng: r.lng, kind: r.kind || 'place', zoom: ZOOM_BY_KIND[r.kind] ?? 13,
        })));
      } catch {
        // An abandoned lookup is not a failure; the newer one owns the list.
        if (ctrl.signal.aborted) return;
        setResults([]);
      }
      setAnswered(q);
      setLoading(false);
    }, 380);
  }, [center]);

  /** Where you are: the browser's fix when it will give one, else the network's rough idea. */
  const locate = useCallback(async () => {
    setLocating(true);
    setLocateNote('');
    const fix = await new Promise<GeolocationPosition | null>(resolve => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    });
    if (fix) {
      onLocate(fix.coords.latitude, fix.coords.longitude, 15);
      setLocating(false);
      onClose?.();
      return;
    }
    try {
      const d = await (await fetch('/api/geo')).json();
      if (d?.lat && d?.lon) {
        onLocate(d.lat, d.lon, 11);
        setLocating(false);
        onClose?.();
        return;
      }
    } catch { /* fall through to the note */ }
    setLocateNote('Location unavailable: allow it in the browser, or search instead');
    setLocating(false);
  }, [onLocate, onClose]);

  /* Analytics: one `search_performed` event per SUBMITTED search — a pick
     (go/directions below) or the settled no-results state further down —
     never per keystroke. The detail carries the result count and the
     normalized query token (lib/analytics/search-event); it powers
     zero-result mining, which previously had no on-site data at all. */
  const reportSearch = () => {
    const detail = buildSearchPerformedDetail(value, results.length + filteredCameras.length);
    if (detail) trackAnalyticsEvent('search_performed', detail);
  };

  const go = (item: NavItem) => {
    // A pick is a submitted search — but only with a query in the box;
    // recents and "Your location" (empty box) are not searches.
    if (typing) reportSearch();
    if (item.type === 'camera') {
      if (onOpenCamera) onOpenCamera(item.cam);
      else onLocate(item.cam.lat, item.cam.lng, 15);
      setValue('');
      setResults([]);
      onClose?.();
      return;
    }
    const h = item.hit;
    if (h.kind === 'current') { void locate(); return; }
    onLocate(h.lat, h.lng, h.zoom);
    setRecent(rememberPlace({ label: h.label, context: h.context, lat: h.lat, lng: h.lng, kind: h.kind }));
    setValue('');
    setResults([]);
    onClose?.();
  };

  const directions = (item: NavItem) => {
    if (item.type !== 'place' || !onDirections) return;
    const h = item.hit;
    if (h.kind === 'current') return;
    if (typing) reportSearch();
    setRecent(rememberPlace({ label: h.label, context: h.context, lat: h.lat, lng: h.lng, kind: h.kind }));
    onDirections({ label: h.label, context: h.context, lat: h.lat, lng: h.lng, kind: h.kind });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (value) { search(''); } else onClose?.();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[active];
      if (!item) return;
      if (e.shiftKey) directions(item); else go(item);
    }
  };

  const noResults = typing && !loading && answered === value && value.trim().length >= 2
    && results.length === 0 && cameraHits.length === 0 && !filtersEmptiedCameras;

  /* A settled search with nothing to pick is still a submitted search —
     and it is the zero-result mining signal. Fire once per query: the
     ref keeps re-renders (and the open panel) from repeating it, while a
     new query that also settles empty fires again. */
  const zeroReportedRef = useRef('');
  useEffect(() => {
    if (!noResults || zeroReportedRef.current === value) return;
    zeroReportedRef.current = value;
    const detail = buildSearchPerformedDetail(value, 0);
    if (detail) trackAnalyticsEvent('search_performed', detail);
  }, [noResults, value]);

  const selectClass = 'h-8 max-w-[150px] rounded-lg border border-[var(--border-primary)] bg-black/40 px-1.5 text-[11.5px] text-[var(--text-secondary)] outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div ref={boxRef} className={embedded ? 'flex flex-col' : 'glass-panel tool-glass relative overflow-hidden flex flex-col max-h-[min(72vh,600px)]'}>
      {!embedded && <span aria-hidden className="absolute inset-x-0 top-0 h-px z-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--gold-rgb),0.7) 30%, rgba(var(--gold-rgb),0.7) 70%, transparent)' }} />}

      {/* ── the box ── */}
      <div className={`relative flex items-center gap-3 flex-shrink-0 ${embedded ? 'h-12 px-3.5 rounded-xl border border-[var(--border-primary)] bg-black/40 focus-within:border-[var(--border-active)]' : 'h-14 px-4 border-b border-[var(--border-secondary)]'}`}>
        <Search className="w-[18px] h-[18px] flex-shrink-0 text-[var(--gold-primary)]" />
        <input
          ref={inputRef}
          value={value}
          onChange={e => search(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search places, cameras, addresses or coordinates"
          aria-label="Search places and cameras"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
          className="flex-1 min-w-0 bg-transparent text-[15px] text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-[var(--gold-primary)]" aria-label="Searching" />}
        {value ? (
          <button onClick={() => { search(''); inputRef.current?.focus(); }} aria-label="Clear the search"
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4" />
          </button>
        ) : !embedded && (
          <span className="hidden md:flex items-center gap-1 flex-shrink-0" aria-hidden><Key>Ctrl</Key><Key>F</Key></span>
        )}
        {/* While a search is on its way, a line of gold runs under the box. */}
        {loading && !embedded && <span aria-hidden className="absolute left-0 right-0 bottom-[-1px] h-px overflow-hidden"><span className="tool-scan block h-full w-1/3" /></span>}
      </div>

      {/* ── advanced filters (Pro): camera results only, never places ── */}
      <div className={`flex-shrink-0 ${embedded ? 'pt-2.5' : 'px-4 py-2.5 border-b border-[var(--border-secondary)]'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--text-muted)] mr-0.5">Filters</span>
          {!isPro && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-[rgba(var(--gold-rgb),0.4)] text-[9px] font-mono tracking-[0.12em] text-[var(--gold-light)]">
              <Lock className="w-3 h-3" /> PRO
            </span>
          )}
          <select
            aria-label="Filter cameras by country"
            title={isPro ? 'Only show cameras in this country' : 'Country filter — a Pro feature'}
            disabled={!isPro || facets.length === 0}
            value={filters.countryKey ?? ''}
            onChange={e => setFilters(f => ({ ...f, countryKey: e.target.value || null }))}
            className={selectClass}
          >
            <option value="">All countries</option>
            {facets.map(f => (
              <option key={f.key} value={f.key}>{f.label} · {f.count.toLocaleString('en-US')}</option>
            ))}
          </select>
          <select
            aria-label="Filter cameras by type"
            title={isPro ? 'Only show cameras of this type' : 'Type filter — a Pro feature'}
            disabled={!isPro}
            value={filters.kind ?? ''}
            onChange={e => setFilters(f => ({ ...f, kind: (e.target.value || null) as CameraMediaKind | null }))}
            className={selectClass}
          >
            <option value="">All types</option>
            {CAMERA_KIND_OPTIONS.map(o => (
              <option key={o.kind} value={o.kind}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={filters.liveOnly}
            aria-label="Only show cameras with a live feed"
            title={isPro ? 'Hide listing-only cameras that carry no feed of their own' : 'Live feeds only — a Pro feature'}
            disabled={!isPro}
            onClick={() => setFilters(f => ({ ...f, liveOnly: !f.liveOnly }))}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11.5px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              filters.liveOnly
                ? 'border-[rgba(var(--gold-rgb),0.55)] bg-[rgba(var(--gold-rgb),0.1)] text-[var(--gold-light)]'
                : 'border-[var(--border-primary)] bg-black/40 text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
            }`}
          >
            <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${filters.liveOnly ? 'bg-[var(--gold-primary)]' : 'bg-white/25'}`} />
            Live feeds only
          </button>
          {isPro && cameraFiltersActive(filters) && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_CAMERA_FILTERS)}
              className="h-8 px-2 text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
            >
              Clear
            </button>
          )}
          {!isPro && (
            <a href="/pricing" className="ml-auto text-[11px] text-[var(--gold-light)] hover:text-[var(--gold-primary)] transition-colors">
              Unlock with Pro
            </a>
          )}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--text-muted)]">
          Filters narrow camera results — places are never filtered.
        </p>
      </div>

      {/* ── what to choose from ── */}
      <div className={`min-h-0 overflow-y-auto styled-scrollbar ${embedded ? 'pt-3' : 'p-2'}`}>
        {!typing && (
          <span className={`block px-3 pt-1 pb-1.5 text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--text-muted)] ${embedded ? 'px-1' : ''}`}>
            {recent.length ? 'Jump to' : 'Start here'}
          </span>
        )}
        <div id={listId} role="listbox" aria-label={typing ? 'Search results' : 'Suggestions'} className="flex flex-col gap-0.5">
          {typing && cameraHits.length > 0 && (
            <span className="block px-3 pt-1 pb-1.5 text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--text-muted)]">
              Cameras{filteredCameras.length > cameraHits.length ? ` — first ${cameraHits.length} of ${filteredCameras.length}` : ''}
            </span>
          )}
          {items.map((item, i) => {
            if (item.type === 'camera') {
              return (
                <CameraRow key={`camera-${item.cam.id}`} id={`${listId}-${i}`} cam={item.cam} query={value}
                  on={i === active} onPick={() => go(item)} onHover={() => setSelected(i)} />
              );
            }
            const h = item.hit;
            const firstPlaceIndex = typing ? cameraHits.length : 0;
            return (
              <div key={`place-${h.kind}-${h.label}-${h.lat}-${i}`} className="contents">
                {typing && results.length > 0 && i === firstPlaceIndex && cameraHits.length > 0 && (
                  <span className="block px-3 pt-2 pb-1.5 text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--text-muted)]">
                    Places
                  </span>
                )}
                <PlaceRow id={`${listId}-${i}`} place={h} query={typing ? value : ''} on={i === active}
                  onPick={() => go(item)} onHover={() => setSelected(i)} from={center}
                  kindOverride={!typing && h.kind !== 'current' ? 'recent' : undefined}
                  trailing={h.kind === 'current'
                    ? (locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-[var(--gold-primary)]" /> : undefined)
                    : onDirections && (
                      <button onClick={() => directions(item)} aria-label={`Directions to ${h.label}`} title="Directions (Shift+Enter)"
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${i === active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'} border-[rgba(var(--gold-rgb),0.35)] text-[var(--gold-light)] bg-[rgba(var(--gold-rgb),0.06)] hover:bg-[rgba(var(--gold-rgb),0.16)]`}>
                        <Route className="w-4 h-4" />
                      </button>
                    )} />
              </div>
            );
          })}
        </div>

        {filtersEmptiedCameras && (
          <p role="status" className="px-3 py-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
            Cameras match “{value.trim()}”, but none survive those filters — widen them to see them.
          </p>
        )}

        {!typing && recent.length > 0 && (
          <button onClick={() => { forgetRecent(); setRecent([]); setSelected(0); }}
            className="mt-1 ml-3 text-[10.5px] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors">
            Clear recent places
          </button>
        )}

        {!typing && (
          <div className={`mt-3 mb-1 flex flex-wrap items-center gap-1.5 ${embedded ? '' : 'px-3'}`}>
            <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[var(--text-muted)] mr-1">Try</span>
            {TRY.map(t => (
              <button key={t} onClick={() => { search(t); inputRef.current?.focus(); }}
                className="h-7 px-2.5 rounded-full border border-[var(--border-secondary)] bg-white/[0.02] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-heading)] hover:border-[var(--border-primary)] transition-colors">
                {t}
              </button>
            ))}
          </div>
        )}

        {noResults && (
          <div role="status" className="flex flex-col items-center text-center px-6 py-8">
            <span className="w-11 h-11 rounded-full flex items-center justify-center border border-[var(--border-secondary)] bg-white/[0.02]">
              <SearchX className="w-5 h-5 text-[var(--text-muted)]" />
            </span>
            <p className="mt-3 text-[13px] text-[var(--text-heading)]">Nothing matches “{value.trim()}”</p>
            <p className="mt-1 max-w-[320px] text-[11.5px] leading-relaxed text-[var(--text-muted)]">
              Try a city, a street, a landmark, a camera name, or coordinates such as 48.8584, 2.2945.
            </p>
            <RequestCameraForm initialPlace={value.trim()} query={value.trim()} />
          </div>
        )}

        {typing && loading && results.length === 0 && (
          <div className="flex flex-col gap-0.5" aria-hidden>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <span className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
                <span className="flex-1 flex flex-col gap-1.5">
                  <span className="h-3 rounded bg-white/[0.05] animate-pulse" style={{ width: `${62 - i * 12}%` }} />
                  <span className="h-2.5 rounded bg-white/[0.03] animate-pulse" style={{ width: `${44 - i * 8}%` }} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── keys and credit ── */}
      <div className={`flex items-center gap-3 flex-shrink-0 text-[10px] text-[var(--text-muted)] ${embedded ? 'pt-2' : 'px-4 h-9 border-t border-[var(--border-secondary)]'}`}>
        {!embedded && (
          <span className="hidden md:flex items-center gap-2.5">
            <span className="flex items-center gap-1"><Key>↑</Key><Key>↓</Key> move</span>
            <span className="flex items-center gap-1"><Key>↵</Key> go</span>
            {onDirections && <span className="flex items-center gap-1"><Key>⇧</Key><Key>↵</Key><Navigation className="w-3 h-3" /> route</span>}
            <span className="flex items-center gap-1"><Key>Esc</Key> close</span>
          </span>
        )}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-[var(--gold-light)] transition-colors">
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
}
