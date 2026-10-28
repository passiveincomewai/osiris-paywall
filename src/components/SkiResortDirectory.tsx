'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SkiResort } from "@/lib/ski-resorts";
import {
  applySkiDirectoryQuery,
  resortInitials,
  skiCountryCounts,
  totalCameras,
  type SkiResortLogoMap,
  type SkiSortKey,
} from "@/lib/ski-directory";

/**
 * The /ski-webcams resort directory: every resort as a card, with a
 * sticky search / country-filter / sort toolbar. The server page hands
 * over the full resort list (and the verified-logo map), so the initial
 * HTML still carries every card; filtering is a pure client re-render
 * over src/lib/ski-directory, the module the tests pin.
 */

const SORT_OPTIONS: Array<{ value: SkiSortKey; label: string }> = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "cameras", label: "Most cameras" },
];

function cameraLabel(resort: SkiResort): string {
  const n = totalCameras(resort);
  return `${n.toLocaleString("en-US")} live camera${n === 1 ? "" : "s"}`;
}

/**
 * The resort's own logo on a white tile (many resort marks are dark and
 * would vanish on the page's dark cards). Falls back — on a missing
 * logo or a failed load — to a gold monogram of the resort's initials.
 */
function LogoTile({ resort, logos }: { resort: SkiResort; logos: SkiResortLogoMap }) {
  const [failed, setFailed] = useState(false);
  const logo = logos[resort.slug];
  if (logo && !failed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
        {/* Static public asset with unknown intrinsic size — a plain
            img keeps SVG and odd-ratio icons honest. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-sm font-bold tracking-wide text-[#D4AF37]"
    >
      {resortInitials(resort.name)}
    </span>
  );
}

function ResortCard({
  resort,
  logos,
  hasPage,
}: {
  resort: SkiResort;
  logos: SkiResortLogoMap;
  hasPage: boolean;
}) {
  const body = (
    <>
      <LogoTile resort={resort} logos={logos} />
      <span className="min-w-0">
        <span className="font-semibold text-sm">{resort.name}</span>
        <span className="block text-xs text-white/45 mt-1">
          {resort.town}, {resort.region}
        </span>
        <span className="block text-xs text-[#D4AF37] mt-1.5">{cameraLabel(resort)}</span>
        {!hasPage && (
          <span className="block text-xs text-white/40 mt-1">
            Listed on this hub — no separate page
          </span>
        )}
      </span>
    </>
  );
  return (
    <li>
      {hasPage ? (
        <Link
          href={`/ski-webcams/${resort.slug}`}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#D4AF37]/50 hover:bg-white/[0.05] transition"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {body}
        </div>
      )}
    </li>
  );
}

function CountryChip({
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

export default function SkiResortDirectory({
  resorts,
  logos,
  noPageSlugs,
}: {
  resorts: SkiResort[];
  logos: SkiResortLogoMap;
  /** C10 (§4.5): folded resorts render as hub listings without a
   *  page link. Slugs arrive as a prop so this client component
   *  never imports the gates module's datasets. */
  noPageSlugs?: string[];
}) {
  const noPage = useMemo(() => new Set(noPageSlugs ?? []), [noPageSlugs]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [sort, setSort] = useState<SkiSortKey>("name-asc");

  const countries = useMemo(() => skiCountryCounts(resorts), [resorts]);
  const result = useMemo(
    () => applySkiDirectoryQuery(resorts, { search, country, sort }),
    [resorts, search, country, sort],
  );

  const reset = () => {
    setSearch("");
    setCountry(null);
    setSort("name-asc");
  };

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-2 bg-[#05070d]/95 px-2 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ski-directory-search">
            Search ski resorts
          </label>
          <input
            id="ski-directory-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by resort, town, region or country"
            className="min-w-0 flex-1 basis-56 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none"
          />
          <label className="sr-only" htmlFor="ski-directory-sort">
            Sort resorts
          </label>
          <select
            id="ski-directory-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SkiSortKey)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37]/60 focus:outline-none [&>option]:bg-[#0b0f1a]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by country">
          <CountryChip
            label="All"
            count={resorts.length}
            active={country === null}
            onClick={() => setCountry(null)}
          />
          {countries.map((c) => (
            <CountryChip
              key={c.country}
              label={c.country}
              count={c.count}
              active={country === c.country}
              onClick={() => setCountry(c.country)}
            />
          ))}
        </div>
        {result.filtering && (
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/50" role="status">
              {result.total} {result.total === 1 ? "resort" : "resorts"}
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

      {result.filtering ? (
        result.total === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-white/70">
              No resorts match that search. Try a town or region — or clear the filters to browse
              all {resorts.length} resorts.
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
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.flat.map((r) => (
              <ResortCard key={r.slug} resort={r} logos={logos} hasPage={!noPage.has(r.slug)} />
            ))}
          </ul>
        )
      ) : (
        result.groups.map(({ country: groupCountry, resorts: list }) => (
          <div key={groupCountry} className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
              {groupCountry}
            </h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((r) => (
                <ResortCard key={r.slug} resort={r} logos={logos} hasPage={!noPage.has(r.slug)} />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
