'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  applyCountryDirectoryQuery,
  countryRegionCounts,
  isCountryDirectoryFiltering,
  type CountryDirectoryEntry,
  type CountryRegionKey,
  type CountrySortKey,
} from "@/lib/country-directory";

/**
 * The /cameras/countries directory table: every country as a row,
 * with a sticky search / region-filter / sort toolbar. The server
 * page hands over the full country list, so the initial HTML still
 * carries every row; filtering is a pure client re-render over
 * src/lib/country-directory, the module the tests pin. The default
 * view (Name A–Z, no filter) is the table this page has always
 * rendered — the JSON-LD ItemList is built server-side from the same
 * alphabetical order and never follows the UI sort.
 */

const SORT_OPTIONS: Array<{ value: CountrySortKey; label: string }> = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "cameras-desc", label: "Most cameras" },
  { value: "cameras-asc", label: "Fewest cameras" },
];

const fmt = (n: number) => n.toLocaleString("en-US");

function RegionChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-[#D4AF37]/70 bg-[#D4AF37]/15 text-white"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
      }`}
    >
      {label} <span className={active ? "text-[#D4AF37]" : "text-white/35"}>{count}</span>
    </button>
  );
}

export default function CountriesDirectory({
  countries,
}: {
  countries: CountryDirectoryEntry[];
}) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<CountryRegionKey | null>(null);
  const [sort, setSort] = useState<CountrySortKey>("name-asc");

  const regions = useMemo(() => countryRegionCounts(countries), [countries]);
  const filtering = isCountryDirectoryFiltering({ search, region });
  const rows = useMemo(
    () => applyCountryDirectoryQuery(countries, { search, region, sort }),
    [countries, search, region, sort],
  );

  const reset = () => {
    setSearch("");
    setRegion(null);
    setSort("name-asc");
  };

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-20 -mx-2 bg-[#05070d]/95 px-2 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="countries-directory-search">
            Search countries
          </label>
          <input
            id="countries-directory-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by country or top city"
            className="min-w-0 flex-1 basis-56 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none"
          />
          <label className="sr-only" htmlFor="countries-directory-sort">
            Sort countries
          </label>
          <select
            id="countries-directory-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as CountrySortKey)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37]/60 focus:outline-none [&>option]:bg-[#0b0f1a]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by region">
          <RegionChip
            label="All"
            count={countries.length}
            active={region === null}
            onClick={() => setRegion(null)}
          />
          {regions.map(({ region: r, count }) => (
            <RegionChip
              key={r.key}
              label={r.label}
              count={count}
              active={region === r.key}
              onClick={() => setRegion(r.key)}
            />
          ))}
        </div>
        {filtering && (
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/50" role="status">
              {rows.length} {rows.length === 1 ? "country" : "countries"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-xs font-semibold text-[#D4AF37] hover:underline"
            >
              Clear search &amp; filters
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">
            No countries match that search. Try a city name — Tokyo finds Japan — or
            clear the filters to browse all {countries.length} countries.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-full border border-[#D4AF37]/60 px-4 py-1.5 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            Clear search &amp; filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold">#</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Country</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Cameras</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold hidden sm:table-cell">Top area</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr
                  key={c.slug}
                  className="border-t border-white/[0.06] hover:bg-white/[0.03] transition"
                >
                  <td className="px-4 md:px-6 py-3.5 text-white/35 tabular-nums">{i + 1}</td>
                  <td className="px-4 md:px-6 py-3.5 font-medium">
                    <Link
                      href={`/cameras/countries/${c.slug}`}
                      className="text-[#D4AF37] hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                    {fmt(c.count)}
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-white/50 hidden sm:table-cell">
                    {c.topCities[0]?.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
