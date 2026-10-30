"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { FaqCopy } from "@/i18n/dictionaries/en/faq";

/**
 * Client enhancer for /faq (2026-10-29): live search, the
 * top-recommended list and the view-all affordance.
 *
 * The accordion itself stays server-rendered (see FaqClient): every
 * answer is in the HTML for crawlers and no-JS visitors. This
 * component only filters those nodes in place — it hides non-matching
 * <details data-faq-item> elements and any group section left empty,
 * and opens the matches. Clearing the search restores the full list
 * untouched. Recommended buttons open + scroll to the real item in
 * the full list; nothing is duplicated, so the FAQPage JSON-LD (built
 * from the same dictionary groups) always matches what is rendered.
 */
export default function FaqSearch({
  search,
  recommended,
  viewAll,
  helpCenter,
  contactHref,
  tutorialsHref,
}: {
  search: FaqCopy["search"];
  recommended: FaqCopy["recommended"];
  viewAll: FaqCopy["viewAll"];
  helpCenter: FaqCopy["helpCenter"];
  contactHref: string;
  tutorialsHref: string;
}) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const items = useCallback(
    () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("#faq-all [data-faq-item]")
      ),
    []
  );

  const applyFilter = useCallback(
    (raw: string) => {
      const q = raw.trim().toLowerCase();
      let visible = 0;
      for (const el of items()) {
        const match =
          q === "" || (el.textContent || "").toLowerCase().includes(q);
        el.style.display = match ? "" : "none";
        if (el instanceof HTMLDetailsElement) {
          if (q !== "" && match) el.open = true;
          if (q === "") el.open = false;
        }
        if (match) visible++;
      }
      document
        .querySelectorAll<HTMLElement>("#faq-all [data-faq-group]")
        .forEach((g) => {
          const any = Array.from(
            g.querySelectorAll<HTMLElement>("[data-faq-item]")
          ).some((i) => i.style.display !== "none");
          g.style.display = any ? "" : "none";
        });
      setMatchCount(q === "" ? null : visible);
    },
    [items]
  );

  const onSearch = (value: string) => {
    setQuery(value);
    applyFilter(value);
  };

  const openQuestion = (question: string) => {
    setQuery("");
    applyFilter("");
    const target = items().find(
      (i) => i.getAttribute("data-faq-q") === question
    );
    if (target) {
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const viewAllQuestions = () => {
    setQuery("");
    applyFilter("");
    for (const el of items()) {
      if (el instanceof HTMLDetailsElement) el.open = true;
    }
    document
      .getElementById("faq-all")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const noResults = matchCount === 0;

  return (
    <div className="mb-14">
      {/* Search */}
      <div className="max-w-xl mx-auto">
        <label className="relative block">
          <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.ariaLabel}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.03] pl-12 pr-4 py-3.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-[#D4AF37]/60"
          />
        </label>
        {matchCount !== null && !noResults && (
          <p className="text-center text-sm text-white/45 mt-3" role="status">
            {search.resultsTemplate.replace("{n}", String(matchCount))}
          </p>
        )}
      </div>

      {/* Empty state — routes to the help center / a human */}
      {noResults && (
        <div className="max-w-xl mx-auto mt-8 text-center rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-lg font-bold">{search.noResultsHeading}</h2>
          <p className="text-white/55 mt-2 text-sm leading-relaxed">
            {search.noResultsBody}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              href={contactHref}
              className="px-5 py-2.5 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              {search.helpCenterLink}
            </Link>
            <Link
              href={tutorialsHref}
              className="px-5 py-2.5 rounded-2xl border border-white/15 text-sm font-semibold text-white/80 hover:border-[#D4AF37]/50 hover:text-white transition"
            >
              {helpCenter.tutorialsLabel}
            </Link>
          </div>
        </div>
      )}

      {/* Top recommended questions */}
      <div className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6">
          <span className="text-[#D4AF37]">{recommended.heading}</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {recommended.questions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => openQuestion(q)}
              className="flex items-center justify-between gap-3 text-left border border-white/10 rounded-2xl bg-white/[0.02] px-5 py-4 hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition"
            >
              <span className="font-medium text-white/90 text-sm">{q}</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37] shrink-0" />
            </button>
          ))}
        </div>
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={viewAllQuestions}
            className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            {viewAll.button}
          </button>
        </div>
      </div>
    </div>
  );
}
