'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SkiResort } from "@/lib/ski-resorts";
import {
  applySkiDirectoryQuery,
  resortFamilyInfo,
  resortInitials,
  skiCountryCounts,
  skiFamilyCounts,
  skiPassCounts,
  totalCameras,
  SKI_FAMILY_FILTER_LABELS,
  type SkiFamilyFilter,
  type SkiGroupBy,
  type SkiPassFilter,
  type SkiResortLogoMap,
  type SkiSortKey,
} from "@/lib/ski-directory";
import type { SkiPassName } from "@/lib/ski-resort-passes";

/**
 * The /ski-webcams resort directory: every resort as a card, with a
 * sticky search / country-filter / pass-filter / sort toolbar. The
 * server page hands over the full resort list (and the verified-logo
 * map), so the initial HTML still carries every card; filtering is a
 * pure client re-render over src/lib/ski-directory, the module the
 * tests pin. The hub's ?search= / ?pass= / ?group= links land here as
 * initial state (the page remounts this component per param set).
 */

const SORT_OPTIONS: Array<{ value: SkiSortKey; label: string }> = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "cameras", label: "Most cameras" },
];

const GROUP_OPTIONS: Array<{ value: SkiGroupBy; label: string }> = [
  { value: "country", label: "Group by country" },
  { value: "region", label: "Group by state / region" },
  { value: "pass", label: "Group by pass" },
];

function cameraLabel(resort: SkiResort): string {
  const n = totalCameras(resort);
  return `${n.toLocaleString("en-US")} live camera${n === 1 ? "" : "s"}`;
}

/**
 * The card's family line: only items backed by a data row — a
 * verified official lessons / rentals / parking page, or the
 * resort's sourced beginner-terrain share. A resort with none of
 * those rows renders no family line at all.
 */
function familyLine(resort: SkiResort): string | null {
  const info = resortFamilyInfo(resort.slug);
  const parts = [
    info.lessons ? SKI_FAMILY_FILTER_LABELS.lessons : null,
    info.rentals ? SKI_FAMILY_FILTER_LABELS.rentals : null,
    info.parking ? SKI_FAMILY_FILTER_LABELS.parking : null,
    info.beginnerTerrainPct !== null
      ? `Beginner terrain: ${info.beginnerTerrainPct}%`
      : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
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
        {familyLine(resort) && (
          <span className="block text-xs text-white/55 mt-1">{familyLine(resort)}</span>
        )}
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

function FilterChip({
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
  initialSearch = "",
  initialPass = null,
  initialGroupBy = "country",
}: {
  resorts: SkiResort[];
  logos: SkiResortLogoMap;
  /** C10 (§4.5): folded resorts render as hub listings without a
   *  page link. Slugs arrive as a prop so this client component
   *  never imports the gates module's datasets. */
  noPageSlugs?: string[];
  /** Landing state from the hub's ?search= / ?pass= / ?group= links. */
  initialSearch?: string;
  initialPass?: SkiPassFilter;
  initialGroupBy?: SkiGroupBy;
}) {
  const noPage = useMemo(() => new Set(noPageSlugs ?? []), [noPageSlugs]);
  const [search, setSearch] = useState(initialSearch);
  const [country, setCountry] = useState<string | null>(null);
  const [pass, setPass] = useState<SkiPassFilter>(initialPass);
  const [family, setFamily] = useState<SkiFamilyFilter[]>([]);
  const [groupBy, setGroupBy] = useState<SkiGroupBy>(initialGroupBy);
  const [sort, setSort] = useState<SkiSortKey>("name-asc");

  const countries = useMemo(() => skiCountryCounts(resorts), [resorts]);
  const passCounts = useMemo(() => skiPassCounts(resorts), [resorts]);
  const familyCounts = useMemo(() => skiFamilyCounts(resorts), [resorts]);
  const result = useMemo(
    () => applySkiDirectoryQuery(resorts, { search, country, pass, family, groupBy, sort }),
    [resorts, search, country, pass, family, groupBy, sort],
  );

  const toggleFamily = (filter: SkiFamilyFilter) =>
    setFamily((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );

  const reset = () => {
    setSearch("");
    setCountry(null);
    setPass(null);
    setFamily([]);
    setGroupBy("country");
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
          <label className="sr-only" htmlFor="ski-directory-group">
            Group resorts
          </label>
          <select
            id="ski-directory-group"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as SkiGroupBy)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37]/60 focus:outline-none [&>option]:bg-[#0b0f1a]"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by country">
          <FilterChip
            label="All countries"
            count={resorts.length}
            active={country === null}
            onClick={() => setCountry(null)}
          />
          {countries.map((c) => (
            <FilterChip
              key={c.country}
              label={c.country}
              count={c.count}
              active={country === c.country}
              onClick={() => setCountry(c.country)}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by pass">
          <FilterChip
            label="All passes"
            count={resorts.length}
            active={pass === null}
            onClick={() => setPass(null)}
          />
          {passCounts.passes.map(({ pass: p, count }) => (
            <FilterChip
              key={p}
              label={p}
              count={count}
              active={pass === p}
              onClick={() => setPass(p as SkiPassName)}
            />
          ))}
          <FilterChip
            label="Independent / no listed pass"
            count={passCounts.none}
            active={pass === "none"}
            onClick={() => setPass("none")}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Family planner filters">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            Family planner
          </span>
          {familyCounts.map(({ filter, count }) => (
            <FilterChip
              key={filter}
              label={SKI_FAMILY_FILTER_LABELS[filter]}
              count={count}
              active={family.includes(filter)}
              onClick={() => toggleFamily(filter)}
            />
          ))}
        </div>
        <p className="mt-1.5 max-w-3xl text-[11px] leading-relaxed text-white/40">
          Family planner items appear only where WorldEye has the data: lessons, rentals and
          parking link to the resort&apos;s own verified official page, and beginner terrain is
          the share of trails rated easiest in the resort&apos;s published trail breakdown
          (Wikipedia, checked Oct 2026). Resorts without a sourced figure don&apos;t show one.
        </p>
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
        <>
          {groupBy === "pass" && (
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-white/45">
              Grouped by the pass programmes WorldEye has a documented affiliation for. A resort
              on more than one pass appears under each of its programmes; resorts with no
              documented affiliation are grouped as independent.
            </p>
          )}
          {result.groups.map(({ key, label, resorts: list }) => (
            <div key={key} className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                {label}
              </h3>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((r) => (
                  <ResortCard key={r.slug} resort={r} logos={logos} hasPage={!noPage.has(r.slug)} />
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
