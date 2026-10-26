"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { foldForSearch } from "@/lib/country-directory";

/**
 * Search-by-city for the country pages, rendered at the top of every
 * country page. The explorer's own machinery could always filter by an
 * exact city (server-side, /api/cctv/country/<slug>?city=), but a
 * visitor had no way to find a city: only the 24 largest got a filter
 * chip, and the free-text box matches camera names and sources as well
 * as cities, so a city search read as broken. This box is fed the
 * country's FULL city list (every area the catalogue holds for it,
 * computed on the server from the page's own records) and offers real
 * matching cities as the visitor types.
 *
 * Picking a city applies it as the explorer's area filter: the choice
 * is written to the URL (?city=) and broadcast on COUNTRY_CITY_EVENT,
 * which CountryCameraExplorer listens for (it also reads ?city= on
 * load, so a shared link lands pre-filtered). The explorer is the
 * page's own directory, so this works for every city in every country
 * — unlike the /city-webcams pages, which exist only for larger cities.
 */
export const COUNTRY_CITY_EVENT = "worldeye:country-city";

export interface CityOption {
  name: string;
  count: number;
}

const MAX_MATCHES = 8;

export default function CountryCitySearch({
  countryName,
  cities,
}: {
  countryName: string;
  cities: CityOption[];
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Folded (case- and diacritic-insensitive) match over the country's
     real city names — "zurich" finds Zürich, "gdansk" finds Gdańsk —
     with prefix matches ranked ahead of substring matches; inside each
     group the list's count order (biggest first) is preserved. */
  const matches = useMemo(() => {
    const q = foldForSearch(value.trim());
    if (!q) return [];
    const prefix: CityOption[] = [];
    const substring: CityOption[] = [];
    for (const c of cities) {
      const folded = foldForSearch(c.name);
      if (folded.startsWith(q)) prefix.push(c);
      else if (folded.includes(q)) substring.push(c);
    }
    return [...prefix, ...substring].slice(0, MAX_MATCHES);
  }, [value, cities]);

  if (cities.length < 2) return null;

  function choose(name: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("city", name);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new CustomEvent<string>(COUNTRY_CITY_EVENT, { detail: name }));
    document
      .getElementById("country-explorer")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setValue(name);
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
            choose(matches[0].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={`Search ${countryName} by city…`}
        aria-label={`Search ${countryName} by city`}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
      />
      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e18] shadow-2xl overflow-hidden">
          {matches.length > 0 ? (
            <ul>
              {matches.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(c.name);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="text-xs text-white/40 shrink-0">
                      {c.count.toLocaleString("en-US")} camera{c.count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-white/50">
              {`No cities in ${countryName} match "${value.trim()}".`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
