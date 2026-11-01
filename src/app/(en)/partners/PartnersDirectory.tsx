"use client";

// Searchable opportunities directory for /partners: client-side search +
// category filter over OPPORTUNITIES (what WorldEye is seeking — not
// existing partnerships). "I'm interested" scrolls to the application
// form and preselects the category + opportunity via a window event the
// form listens for, so the two components stay decoupled.
import { useMemo, useState } from "react";
import { OPPORTUNITIES } from "./opportunities-data";

export interface PartnerTypeOption {
  value: string;
  label: string;
}

export const PARTNER_INTEREST_EVENT = "worldeye:partner-interest";

export interface PartnerInterestDetail {
  type: string;
  opportunity: string | null;
}

export function announceInterest(detail: PartnerInterestDetail) {
  window.dispatchEvent(new CustomEvent<PartnerInterestDetail>(PARTNER_INTEREST_EVENT, { detail }));
  document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none";

export default function PartnersDirectory({ types }: { types: PartnerTypeOption[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const labelFor = (value: string) => types.find((t) => t.value === value)?.label ?? value;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OPPORTUNITIES.filter((o) => {
      if (category !== "all" && o.category !== category) return false;
      if (!q) return true;
      const hay = `${o.title} ${o.description} ${o.model} ${labelFor(o.category)}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, types]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities — try “API”, “ski”, “cameras”, “research”…"
          aria-label="Search partnership opportunities"
          className={inputCls}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by partner category"
          className={`${inputCls} appearance-none [&>option]:bg-[#101014]`}
        >
          <option value="all">All categories</option>
          {types.filter((t) => t.value !== "other").map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-white/40" role="status">
        {results.length} {results.length === 1 ? "opportunity" : "opportunities"}
        {category !== "all" ? ` in ${labelFor(category)}` : ""}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-white/70">No listed opening matches that search.</p>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            The directory lists the collaborations we&apos;re actively looking for — it isn&apos;t
            exhaustive. If your idea doesn&apos;t fit a listed opening, propose it anyway: the
            application form has a “Startups &amp; Independent Entrepreneurs” category and a
            “Something else” option for exactly that.
          </p>
          <button
            type="button"
            onClick={() => announceInterest({ type: "startups-entrepreneurs", opportunity: null })}
            className="mt-5 rounded-full bg-[#D4AF37] px-6 py-3 font-semibold text-black transition hover:bg-[#e5c65c]"
          >
            Propose a Partnership
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {results.map((o) => (
            <article
              key={o.title}
              className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
                {labelFor(o.category)}
              </p>
              <h3 className="mt-2 font-semibold leading-snug text-white/90">{o.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{o.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/45">
                <span className="font-medium text-white/70">Collaboration model:</span> {o.model}
              </p>
              <button
                type="button"
                onClick={() => announceInterest({ type: o.category, opportunity: o.title })}
                className="mt-5 self-start rounded-full border border-[#D4AF37]/50 px-5 py-2.5 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
              >
                I&apos;m interested
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
