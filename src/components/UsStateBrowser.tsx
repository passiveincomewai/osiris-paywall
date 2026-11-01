"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  applyUsStateQuery,
  isUsStateFiltering,
  US_STATE_SORT_OPTIONS,
  type UsStateEntry,
  type UsStateSortKey,
} from "@/lib/us-state-browser";

/**
 * The searchable state list on the United States pages: a search box
 * that filters the state cards as you type (name or USPS code), a
 * sort control (A–Z / most cameras / fewest), and the card grid
 * itself — every card a link to the state's page with the count the
 * state page itself renders (the generated us-states index, handed
 * over by the server page). Filtering is a pure client re-render over
 * src/lib/us-state-browser; the initial render is the full A–Z grid,
 * so every state link is in the server HTML with or without JS.
 */
const fmt = (n: number) => n.toLocaleString("en-US");

export default function UsStateBrowser({
  states,
  idPrefix,
}: {
  states: readonly UsStateEntry[];
  /** Namespaces the control ids — the component renders on two
   *  different pages, and the ids stay unique per surface. */
  idPrefix: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UsStateSortKey>("name-asc");

  const filtering = isUsStateFiltering({ search, sort });
  const rows = useMemo(
    () => applyUsStateQuery(states, { search, sort }),
    [states, search, sort],
  );

  const reset = () => {
    setSearch("");
    setSort("name-asc");
  };

  const searchId = `${idPrefix}-state-search`;
  const sortId = `${idPrefix}-state-sort`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={searchId}>
          Search states
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearch("");
          }}
          placeholder="Search states — try “Texas” or “TX”…"
          className="min-w-0 flex-1 basis-56 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none"
        />
        <label className="sr-only" htmlFor={sortId}>
          Sort states
        </label>
        <select
          id={sortId}
          value={sort}
          onChange={(e) => setSort(e.target.value as UsStateSortKey)}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37]/60 focus:outline-none [&>option]:bg-[#0b0f1a]"
        >
          {US_STATE_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {filtering && (
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-white/50" role="status">
            {rows.length} {rows.length === 1 ? "state" : "states"}
          </p>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-xs font-semibold text-[#D4AF37] hover:underline"
          >
            Clear search &amp; sort
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">
            No state matches “{search.trim()}”. Check the spelling, try the
            two-letter code (TX, CA, FL…), or clear the search to browse all{" "}
            {states.length} state pages.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-full border border-[#D4AF37]/60 px-4 py-1.5 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            Clear search &amp; sort
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {rows.map((s) => (
            <Link
              key={s.slug}
              href={`/us-traffic-cameras/${s.slug}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-[#D4AF37]/40 transition group"
            >
              <span className="text-sm font-medium group-hover:text-[#D4AF37] transition">
                {s.name} traffic cameras
              </span>
              <span className="block text-xs text-white/40 mt-0.5">
                {fmt(s.count)} cameras
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
