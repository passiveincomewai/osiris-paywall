'use client';

/**
 * Save/unsave toggle for the device-local saved-locations list
 * (lib/saved-locations). Two skins over one behaviour:
 *
 *  - 'text' — the place-page pill: "Save this place" / "Saved on
 *    this device", with a link through to /saved once saved and an
 *    inline explanation when the list is full.
 *  - 'icon' — the camera viewer's compact star, sized to sit beside
 *    the account "Save to My Cameras" bookmark without impersonating
 *    it: this one is the no-account, this-device save.
 *
 * State is read from storage on mount and on every
 * SAVED_LOCATIONS_EVENT / storage event, so two surfaces showing
 * the same entry never disagree.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Check, Star } from 'lucide-react';
import {
  loadSavedLocations,
  saveSavedLocations,
  toggleSavedLocation,
  isSavedLocation,
  savedId,
  MAX_SAVED_LOCATIONS,
  SAVED_LOCATIONS_EVENT,
  type SavedLocationInput,
} from '@/lib/saved-locations';

interface SaveLocationButtonProps {
  entry: SavedLocationInput;
  variant?: 'text' | 'icon';
  /** Verb for the text skin: "Save this place" (default by kind). */
  saveLabel?: string;
}

export default function SaveLocationButton({ entry, variant = 'text', saveLabel }: SaveLocationButtonProps) {
  const [saved, setSaved] = useState(false);
  const [full, setFull] = useState(false);
  // Parents pass a fresh entry object every render (the camera viewer
  // re-renders on a 1s clock); key the subscription on the entry's
  // identity and read the latest fields through a ref.
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const id = savedId(entry);

  const refresh = useCallback(() => {
    setSaved(isSavedLocation(loadSavedLocations(), entryRef.current));
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener(SAVED_LOCATIONS_EVENT, onStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SAVED_LOCATIONS_EVENT, onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh, id]);

  const onToggle = useCallback(() => {
    const result = toggleSavedLocation(loadSavedLocations(), entryRef.current);
    if (result.state === 'full') {
      setFull(true);
      window.setTimeout(() => setFull(false), 4000);
      return;
    }
    saveSavedLocations(result.entries);
    setSaved(result.state === 'added');
    setFull(false);
  }, []);

  if (variant === 'icon') {
    const title = full
      ? `Saved list is full (${MAX_SAVED_LOCATIONS}) — manage it in Saved locations`
      : saved
        ? 'Saved on this device — tap to remove'
        : 'Save to this device — no account needed';
    return (
      <button
        onClick={onToggle}
        className="p-1.5 rounded-sm bg-white/5 border border-white/10 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition-all"
        title={title}
        aria-label={title}
        aria-pressed={saved}
      >
        <Star
          className={`w-3 h-3 ${saved ? 'text-[#D4AF37]' : full ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
          fill={saved ? 'currentColor' : 'none'}
        />
      </button>
    );
  }

  const label = saveLabel ?? (entry.kind === 'camera' ? 'Save this camera' : 'Save this place');
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="inline-flex items-center gap-3">
        <button
          onClick={onToggle}
          aria-pressed={saved}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            saved
              ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
              : 'border-white/20 bg-white/[0.03] text-white/80 hover:border-[#D4AF37]/60 hover:text-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {saved ? 'Saved on this device' : label}
        </button>
        {saved && (
          <Link href="/saved" className="text-sm text-white/50 underline-offset-4 hover:text-[#D4AF37] hover:underline">
            View saved
          </Link>
        )}
      </div>
      {full && (
        <p className="text-xs text-amber-300/90" role="status">
          Your saved list is full ({MAX_SAVED_LOCATIONS}) —{' '}
          <Link href="/saved" className="underline underline-offset-2">remove one</Link> to add more.
        </p>
      )}
    </div>
  );
}
