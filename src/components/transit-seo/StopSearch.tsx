"use client";

/**
 * Agency-hub stop search — a TOOL, not a page family (owner scope
 * call 2026-10-26: no indexable stop pages). It loads the agency's
 * stop list once from /api/transit/stops (the same compact payload
 * the globe uses) and answers "which routes serve this stop?" with
 * links into the route pages, anchored at the stop's row.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchStops } from "@/lib/transit/explorer";

interface StopRow {
  id: string;
  name: string;
  routes: string[];
  code?: string;
}

// Mirrors stopAnchor() in lib/transit/seo (kept inline so this
// client bundle never imports the server-side GTFS stack).
function anchorFor(stopId: string): string {
  return `stop-${stopId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export default function StopSearch({
  agencyId,
  agencyName,
  routePaths,
}: {
  agencyId: string;
  agencyName: string;
  /** route short name → route page path (without anchor). */
  routePaths: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<StopRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const loadingRef = useRef(false);

  const ensureLoaded = () => {
    if (stops || loadingRef.current) return;
    loadingRef.current = true;
    fetch(`/api/transit/stops?agency=${encodeURIComponent(agencyId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stops"))))
      .then((j) => setStops(Array.isArray(j?.stops) ? j.stops : []))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (query.trim()) ensureLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const results = useMemo(
    () => (stops && query.trim() ? searchStops(stops, query, 8) : []),
    [stops, query],
  );

  return (
    <div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={ensureLoaded}
          type="search"
          placeholder={`Search ${agencyName} stops — try a street or station name`}
          aria-label={`Search ${agencyName} stops`}
          className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60"
        />
      </div>
      {failed && (
        <p className="text-sm text-white/45 mt-3">
          Stop search didn&apos;t load — the route list below covers every stop by route.
        </p>
      )}
      {query.trim() && stops && results.length === 0 && (
        <p className="text-sm text-white/45 mt-3">
          No {agencyName} stop matches “{query.trim()}”. Check the spelling, or browse the
          routes below.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {results.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-sm text-white/85">
              {s.name}
              {s.code && <span className="text-white/35 text-xs ml-2">Stop {s.code}</span>}
            </p>
            <p className="flex flex-wrap gap-1.5 mt-2">
              {s.routes.map((short) => {
                const path = routePaths[short];
                if (!path) return null;
                return (
                  <Link
                    key={short}
                    href={`${path}#${anchorFor(s.id)}`}
                    className="text-[11px] font-semibold rounded-md border border-white/15 px-2 py-1 text-white/75 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition"
                  >
                    Route {short}
                  </Link>
                );
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
