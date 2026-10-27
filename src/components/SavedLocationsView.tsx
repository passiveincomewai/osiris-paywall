'use client';

/**
 * The /saved list: every place and camera saved on this device
 * (lib/saved-locations), grouped Places / Cameras, newest first
 * within each group. Rows lead with the jump back — the page link
 * for a place, the globe deep link for a camera — and carry remove
 * + clear-all. The device-only nature of the list is stated on the
 * page, not buried: nothing here syncs, and the account alternative
 * (My Cameras, for cameras) is named.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Camera, Globe2, MapPin, Trash2, X } from 'lucide-react';
import {
  loadSavedLocations,
  saveSavedLocations,
  removeSavedLocation,
  globeHrefFor,
  MAX_SAVED_LOCATIONS,
  SAVED_LOCATIONS_EVENT,
  type SavedLocation,
} from '@/lib/saved-locations';

export default function SavedLocationsView() {
  const [entries, setEntries] = useState<SavedLocation[]>([]);

  const refresh = useCallback(() => setEntries(loadSavedLocations()), []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(SAVED_LOCATIONS_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(SAVED_LOCATIONS_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const remove = useCallback((entry: SavedLocation) => {
    saveSavedLocations(removeSavedLocation(loadSavedLocations(), entry));
    refresh();
  }, [refresh]);

  const clearAll = useCallback(() => {
    if (!window.confirm('Remove every saved place and camera from this device?')) return;
    saveSavedLocations([]);
    refresh();
  }, [refresh]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <Bookmark className="w-8 h-8 mx-auto text-[#D4AF37]/70" />
        <h2 className="mt-4 text-lg font-semibold">Nothing saved yet</h2>
        <p className="mt-2 text-sm text-white/55 max-w-md mx-auto">
          When you find a place or a camera you want to come back to, save it —
          from any city, state or country page, or with the star on any camera view —
          and it will be waiting for you here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/cameras" className="rounded-full border border-[#D4AF37]/40 px-4 py-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
            Browse cameras
          </Link>
          <Link href="/city-webcams" className="rounded-full border border-white/15 px-4 py-2 text-white/75 hover:border-white/40 transition">
            City webcams
          </Link>
          <Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-white/75 hover:border-white/40 transition">
            Open the globe
          </Link>
        </div>
      </div>
    );
  }

  const places = entries.filter((e) => e.kind === 'place');
  const cameras = entries.filter((e) => e.kind === 'camera');

  const renderRow = (entry: SavedLocation) => {
    const globeHref = globeHrefFor(entry);
    return (
      <li key={`${entry.kind}|${entry.key}`} className="flex items-center gap-3 px-4 py-3">
        <span className="flex-shrink-0 w-9 h-9 rounded-lg border border-white/10 bg-white/[0.04] inline-flex items-center justify-center" aria-hidden="true">
          {entry.kind === 'camera'
            ? <Camera className="w-4 h-4 text-[#D4AF37]" />
            : <MapPin className="w-4 h-4 text-[#D4AF37]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white/90">{entry.label}</p>
          <p className="truncate text-xs text-white/40">
            {entry.kind === 'camera' ? 'Camera' : 'Place'}
            {entry.detail ? ` · ${entry.detail}` : ''}
            {' · Saved '}
            {new Date(entry.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={entry.href}
            className="rounded-full border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
          >
            {entry.kind === 'camera' ? 'Open on globe' : 'Open page'}
          </Link>
          {globeHref && (
            <Link
              href={globeHref}
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/40 transition"
            >
              <Globe2 className="w-3.5 h-3.5" /> On the globe
            </Link>
          )}
          <button
            onClick={() => remove(entry)}
            className="p-1.5 rounded-full text-white/40 hover:text-red-300 hover:bg-white/5 transition"
            title={`Remove ${entry.label}`}
            aria-label={`Remove ${entry.label}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  };

  const renderGroup = (title: string, group: SavedLocation[]) =>
    group.length === 0 ? null : (
      <section key={title} className="mt-6 first:mt-0">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">
          {title} <span className="text-white/30 normal-case tracking-normal">({group.length})</span>
        </h2>
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-white/[0.02]">
          {group.map(renderRow)}
        </ul>
      </section>
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-white/50" role="status">
          {entries.length} of {MAX_SAVED_LOCATIONS} saved
        </p>
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-red-300 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear all
        </button>
      </div>

      {renderGroup('Places', places)}
      {renderGroup('Cameras', cameras)}
    </div>
  );
}
