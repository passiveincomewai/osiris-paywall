"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

/**
 * Top-of-page search for the directory pages beyond the country
 * pages — the generalisation of CountryCitySearch (which stays as
 * the country pages' own box). One component serves every family:
 * it is fed the page scope's real areas (each with its true camera
 * count, computed from the same records the page's explorer serves),
 * offers matches as the visitor types, and on a pick either
 *
 *  - filters the on-page explorer: the choice is written to the URL
 *    (?area=) and broadcast on DIRECTORY_FILTER_EVENT, which
 *    DirectoryExplorer listens for (it also reads ?area= on load, so
 *    a shared link lands pre-filtered), or
 *  - navigates, when the option carries an href (the city hub and
 *    the world-city page, where each "area" is a city with its own
 *    page).
 *
 * No option is ever invented: the list is the scope's data, and the
 * empty state says plainly that nothing matches.
 */
export const DIRECTORY_FILTER_EVENT = "worldeye:directory-filter";

export interface DirectorySearchOption {
  name: string;
  count: number;
  /** When set, picking the option navigates here instead of filtering. */
  href?: string;
}

const MAX_MATCHES = 8;

export default function DirectorySearch({
  label,
  options,
  placeholder,
  emptyText,
  targetId = "directory-explorer",
}: {
  /** Scope name for the aria label, e.g. "Asia" or "Japan traffic". */
  label: string;
  options: DirectorySearchOption[];
  placeholder: string;
  /** Shown when nothing matches; receives the typed value. */
  emptyText: (value: string) => string;
  targetId?: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o.name.toLowerCase().includes(q))
      .slice(0, MAX_MATCHES);
  }, [value, options]);

  if (options.length < 2) return null;

  function choose(option: DirectorySearchOption) {
    if (option.href) {
      window.location.assign(option.href);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("area", option.name);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(
      new CustomEvent<string>(DIRECTORY_FILTER_EVENT, { detail: option.name }),
    );
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setValue(option.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  const showDropdown = open && value.trim().length > 0;

  return (
    <div className="relative max-w-xl mx-auto mt-7 text-left">
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches.length > 0) {
            e.preventDefault();
            choose(matches[0]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label={`Search ${label}`}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
      />
      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e18] shadow-2xl overflow-hidden">
          {matches.length > 0 ? (
            <ul>
              {matches.map((o) => (
                <li key={o.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(o);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                      <span className="truncate">{o.name}</span>
                    </span>
                    <span className="text-xs text-white/40 shrink-0">
                      {o.count.toLocaleString("en-US")} camera{o.count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-white/50">{emptyText(value.trim())}</p>
          )}
        </div>
      )}
    </div>
  );
}
