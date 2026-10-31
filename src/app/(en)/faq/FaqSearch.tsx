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
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--we-blue-strong)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.ariaLabel}
            className="w-full border pl-12 pr-4 py-3.5 text-base placeholder:text-white/35 focus:outline-none border-[var(--we-line-3)] bg-[var(--we-ink-2)] text-[var(--we-text-1)] focus:border-[var(--we-blue-strong)]"
            style={{ borderRadius: "var(--we-radius-2)" }}
          />
        </label>
        {matchCount !== null && !noResults && (
          <p className="text-center text-sm mt-3 text-[var(--we-text-2)]" role="status">
            {search.resultsTemplate.replace("{n}", String(matchCount))}
          </p>
        )}
      </div>

      {/* Empty state — routes to the help center / a human */}
      {noResults && (
        <div className="max-w-xl mx-auto mt-8 text-center border p-8 border-[var(--we-line-2)] bg-[var(--we-ink-2)]" style={{ borderRadius: "var(--we-radius-3)" }}>
          <h2 className="text-lg font-bold">{search.noResultsHeading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--we-text-2)]">
            {search.noResultsBody}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              href={contactHref}
              className="px-5 py-2.5 text-sm font-bold hover:brightness-110 transition bg-[var(--we-blue)] text-[var(--we-text-on-accent)]"
              style={{ borderRadius: "var(--we-radius-2)" }}
            >
              {search.helpCenterLink}
            </Link>
            <Link
              href={tutorialsHref}
              className="px-5 py-2.5 border text-sm font-semibold transition border-[var(--we-line-3)] text-[var(--we-text-1)] hover:border-[var(--we-blue-strong)]"
              style={{ borderRadius: "var(--we-radius-2)" }}
            >
              {helpCenter.tutorialsLabel}
            </Link>
          </div>
        </div>
      )}

      {/* Top recommended questions */}
      <div className="mt-12">
        <h2
          className="font-[family-name:var(--we-font-display)] text-center mb-6"
          style={{ color: "var(--we-text-1)", fontSize: "var(--we-size-title)", lineHeight: "var(--we-leading-display)", fontWeight: 560 }}
        >
          {recommended.heading}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {recommended.questions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => openQuestion(q)}
              className="flex items-center justify-between gap-3 text-left border px-5 py-4 transition border-[var(--we-line-2)] bg-[var(--we-ink-2)] hover:border-[var(--we-line-3)]"
              style={{ borderRadius: "var(--we-radius-2)" }}
            >
              <span className="font-medium text-sm text-[var(--we-text-1)]">{q}</span>
              <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "var(--we-blue-strong)" }} />
            </button>
          ))}
        </div>
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={viewAllQuestions}
            className="px-6 py-3 text-sm font-bold hover:brightness-110 transition bg-[var(--we-blue)] text-[var(--we-text-on-accent)]"
            style={{ borderRadius: "var(--we-radius-2)" }}
          >
            {viewAll.button}
          </button>
        </div>
      </div>
    </div>
  );
}
