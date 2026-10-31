'use client';
/**
 * SatelliteTimeSlider — the satellite basemap's time control.
 *
 * Rendered (by OsirisMap) only while the satellite basemap is on.
 * The slider walks Esri's World Imagery Wayback archive: one stop
 * per published release, oldest (Feb 2014) at the left, and a final
 * stop at the right for the live World Imagery service — the
 * imagery the globe has always shown, and the default position.
 *
 * The release list is enumerated at runtime from Esri's config
 * (lib/wayback-imagery), starting from a bundled sampled fallback so
 * the control works instantly and offline-of-Esri. The selection is
 * owned by the page (it decides which tiles the basemap loads);
 * this component owns only the release list and the readout.
 *
 * Honesty rules, same as the rest of the globe: an archive position
 * shows its release date and is labelled an archive release — never
 * "live" — and the note under the slider says plainly that a release
 * date is when Esri published that basemap version, so the imagery
 * over a given place can be older.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FALLBACK_WAYBACK_RELEASES,
  fetchWaybackReleases,
  formatReleaseDate,
  satelliteSelectionLabel,
  selectionAtSliderIndex,
  sliderIndexForSelection,
  type SatelliteImagerySelection,
  type WaybackRelease,
} from '@/lib/wayback-imagery';

interface SatelliteTimeSliderProps {
  selection: SatelliteImagerySelection;
  onSelectionChange: (selection: SatelliteImagerySelection) => void;
  /** True while the selected vintage is still loading (it crossfades
   *  in when ready; the readout says so instead of implying the map
   *  has already switched). */
  loading?: boolean;
}

export default function SatelliteTimeSlider({ selection, onSelectionChange, loading = false }: SatelliteTimeSliderProps) {
  const [releases, setReleases] = useState<readonly WaybackRelease[]>(FALLBACK_WAYBACK_RELEASES);

  useEffect(() => {
    let live = true;
    fetchWaybackReleases().then(list => {
      if (live && list.length > 0) setReleases(list);
    });
    return () => { live = false; };
  }, []);

  const index = sliderIndexForSelection(releases, selection);
  const max = releases.length;
  const oldest = releases[0];
  const step = (delta: number) => {
    const next = Math.max(0, Math.min(max, index + delta));
    if (next !== index) onSelectionChange(selectionAtSliderIndex(releases, next));
  };

  return (
    <div
      className="absolute z-[240] pointer-events-auto left-2 right-[104px] bottom-[112px] md:left-1/2 md:right-auto md:-translate-x-1/2 md:top-[64px] md:bottom-auto md:w-[600px] md:max-w-[94vw] rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg px-3 py-2 text-[var(--text-primary)]"
      role="group"
      aria-label="Satellite imagery time"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-60">
          Satellite imagery
        </span>
        <span className="text-[11px] font-semibold leading-none">
          {satelliteSelectionLabel(selection)}
          {loading && (
            <span className="ml-1.5 font-normal opacity-60 animate-pulse">· loading imagery…</span>
          )}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Older imagery release"
          disabled={index <= 0}
          onClick={() => step(-1)}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={index}
          aria-label="Imagery release"
          aria-valuetext={satelliteSelectionLabel(selection)}
          onChange={e => onSelectionChange(selectionAtSliderIndex(releases, Number(e.target.value)))}
          className="flex-1 min-w-0 accent-cyan-300 cursor-pointer"
        />
        <button
          type="button"
          aria-label="Newer imagery release"
          disabled={index >= max}
          onClick={() => step(1)}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-[9px] opacity-60 leading-tight">
        <span>{oldest ? formatReleaseDate(oldest.date) : ''}</span>
        <span className="text-center">
          {selection.kind === 'latest'
            ? 'Esri World Imagery — the current basemap'
            : 'Archive release — Esri World Imagery Wayback. Imagery in a release can be older than its date.'}
        </span>
        <span>Latest</span>
      </div>
    </div>
  );
}
