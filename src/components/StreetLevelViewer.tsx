'use client';

// Street Level viewer — one Panoramax picture in a side panel over the
// globe (the globe stays the home view; this never replaces it).
//
// Honesty rules rendered here, not just documented:
//   • The capture date is ALWAYS on screen, next to "STREET-LEVEL
//     PHOTOS ARE NOT LIVE" — this imagery is months-to-years old.
//   • Per-picture attribution: producer + licence, linked where the
//     provider publishes a licence URL. Panoramax pictures are mostly
//     CC BY-SA 4.0 (IGN instance: Licence Ouverte 2.0) — the licence
//     shown is the one THIS picture carries.
//   • Fields the provider does not publish (date, facing) render as
//     absent, never invented.

import { Camera, ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import type { StreetPicture } from '@/lib/streetlevel/types';

interface StreetLevelViewerProps {
  picture: StreetPicture;
  loading: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function fmtCaptured(iso: string | null): string {
  if (!iso) return 'CAPTURE DATE NOT PUBLISHED';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'CAPTURE DATE NOT PUBLISHED';
  return `CAPTURED ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`;
}

const navBtnCls =
  'flex-1 px-2 py-1.5 rounded border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:hover:bg-transparent flex items-center justify-center gap-1';

export default function StreetLevelViewer({ picture, loading, onClose, onNavigate }: StreetLevelViewerProps) {
  const img = picture.imageUrl ?? picture.thumbUrl;
  return (
    <div
      className="absolute right-2 bottom-24 z-[230] w-[340px] max-w-[88vw] max-h-[62vh] overflow-y-auto styled-scrollbar rounded-xl border border-[var(--border-secondary)] bg-black/70 backdrop-blur-md shadow-xl p-3"
      data-street-level-viewer
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">
          <Camera className="w-3.5 h-3.5" style={{ color: '#4DD0E1' }} /> STREET LEVEL · PANORAMAX
        </span>
        <button
          type="button"
          aria-label="Close street level viewer — return to globe"
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {img ? (
        // The display asset the Panoramax API itself publishes for
        // viewing (roles: visual/thumbnail) — used as intended.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt="Street-level photograph from Panoramax"
          className="w-full rounded-lg border border-white/10 object-cover"
          style={{ maxHeight: '30vh' }}
        />
      ) : (
        <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-[10px] font-mono text-white/50">
          NO DISPLAY IMAGE PUBLISHED FOR THIS PICTURE
        </div>
      )}

      <div className="mt-2 text-[10px] font-mono leading-relaxed">
        <span className="text-amber-200/90">{fmtCaptured(picture.capturedAt)}</span>
        <span className="text-white/50"> — STREET-LEVEL PHOTOS ARE NOT LIVE</span>
      </div>

      {picture.azimuthDeg !== null && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-white/60">
          <Compass className="w-3 h-3" /> CAMERA FACING ≈ {Math.round(picture.azimuthDeg)}°
        </div>
      )}

      <div className="mt-2 text-[9px] font-mono leading-relaxed text-white/45">
        © {picture.producer ?? 'Panoramax contributor'} · via{' '}
        <a href="https://panoramax.xyz" target="_blank" rel="noreferrer" className="underline hover:text-white/80">Panoramax</a>
        {picture.license && (
          <>
            {' · '}
            {picture.licenseUrl ? (
              <a href={picture.licenseUrl} target="_blank" rel="noreferrer" className="underline hover:text-white/80">{picture.license}</a>
            ) : (
              picture.license
            )}
          </>
        )}
        <br />
        {picture.lat.toFixed(5)}, {picture.lng.toFixed(5)} · Community-contributed imagery — coverage is densest in France and may be years old.
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" className={navBtnCls} disabled={!picture.prevId || loading} onClick={() => picture.prevId && onNavigate(picture.prevId)}>
          <ChevronLeft className="w-3 h-3" /> Prev in sequence
        </button>
        <button type="button" className={navBtnCls} disabled={!picture.nextId || loading} onClick={() => picture.nextId && onNavigate(picture.nextId)}>
          Next in sequence <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full px-2 py-1.5 rounded border border-[rgba(77,208,225,0.35)] bg-[rgba(77,208,225,0.08)] text-[10px] font-mono uppercase tracking-wider text-[#B2EBF2] hover:bg-[rgba(77,208,225,0.16)] transition-colors"
      >
        Return to globe
      </button>
      {loading && <div className="mt-2 text-center text-[9px] font-mono text-white/40">LOADING PHOTO…</div>}
    </div>
  );
}
