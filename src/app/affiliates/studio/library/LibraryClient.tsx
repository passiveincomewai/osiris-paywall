"use client";
// Template library: category chips + search, carousel groups collapse to one card.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionTitle } from "@/components/affiliate/ui";
import { categoryLabel, renderUrl, type StudioTemplateLite } from "../StudioHomeClient";

interface CategoryCount {
  key: string;
  count: number;
}

const CATEGORY_ORDER = [
  "feed",
  "story",
  "reel",
  "tiktok",
  "short",
  "carousel",
  "banner",
  "discount",
  "feature",
  "email",
  "thumbnail",
];

const input =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";

function tagList(tags: StudioTemplateLite["tags"]): string[] {
  if (Array.isArray(tags)) return tags;
  return [];
}

export default function LibraryClient() {
  const [templates, setTemplates] = useState<StudioTemplateLite[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/studio/templates", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(typeof j.error === "string" ? j.error : "Couldn't load templates.");
        } else {
          setTemplates(Array.isArray(j.templates) ? (j.templates as StudioTemplateLite[]) : []);
          setApiCategories(Array.isArray(j.categories) ? (j.categories as CategoryCount[]) : []);
        }
      } catch {
        setError("Couldn't load templates.");
      }
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of apiCategories) map.set(c.key, c.count);
    if (map.size === 0) {
      for (const t of templates) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    }
    return map;
  }, [apiCategories, templates]);

  const chips = useMemo(() => {
    const keys = CATEGORY_ORDER.filter((k) => (counts.get(k) ?? 0) > 0);
    // Include any unexpected categories the API returns, after the known order.
    for (const k of counts.keys()) {
      if (!keys.includes(k) && (counts.get(k) ?? 0) > 0) keys.push(k);
    }
    return keys;
  }, [counts]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (typeof t.format === "string" && t.format.trim()) set.add(t.format);
    }
    return [...set].sort();
  }, [templates]);

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (format !== "all" && t.format !== format) return false;
      if (!needle) return true;
      const hay = [t.title, t.category, t.kind, ...tagList(t.tags)].join(" ").toLowerCase();
      return hay.includes(needle);
    });

    type Card = { key: string; template: StudioTemplateLite; slides: number };
    const byGroup = new Map<string, Card>();
    const ordered: Card[] = [];
    for (const t of [...filtered].sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0))) {
      if (t.carouselGroup) {
        const existing = byGroup.get(t.carouselGroup);
        if (existing) {
          existing.slides += 1;
          continue;
        }
        const card: Card = { key: `group:${t.carouselGroup}`, template: t, slides: 1 };
        byGroup.set(t.carouselGroup, card);
        ordered.push(card);
      } else {
        ordered.push({ key: t.slug, template: t, slides: 1 });
      }
    }
    return ordered;
  }, [templates, category, format, q]);

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading templates…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Template Library</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Every template is personalized with your referral link and QR code at render time. Pick one to edit it.
        </p>
      </div>

      {error ? (
        <EmptyState title="Templates unavailable" body={error} />
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
              <button
                onClick={() => setCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-all ${
                  category === "all"
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                    : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                All · {templates.length}
              </button>
              {chips.map((key) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-all ${
                    category === key
                      ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                      : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {categoryLabel(key)} · {counts.get(key) ?? 0}
                </button>
              ))}
            </div>
            <div className="md:w-72">
              <input
                className={input}
                placeholder="Search templates…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {formats.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
              <span className="text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase shrink-0">Format</span>
              <button
                onClick={() => setFormat("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-all ${
                  format === "all"
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                    : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                All formats
              </button>
              {formats.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-all ${
                    format === f
                      ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                      : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {cards.length === 0 ? (
            <EmptyState
              title="No templates in this category yet"
              body={
                q.trim()
                  ? "Nothing matches that search in this category. Try a different term or category."
                  : "New templates are added regularly — check another category in the meantime."
              }
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map(({ key, template: t, slides }) => (
                <Link
                  key={key}
                  href={`/affiliates/studio/create/${t.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-400/50 transition-colors group"
                >
                  <div className="relative bg-black/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={renderUrl(t.slug, null, { scale: 0.35, format: "webp", preview: true })}
                      alt={t.title}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                    />
                    {slides > 1 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border border-cyan-400/50 text-cyan-200 bg-black/60">
                        {slides} slides
                      </span>
                    )}
                    {t.featured && (
                      <span className="absolute top-2 left-2 text-amber-300 text-sm" title="Featured">★</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-bold text-white truncate">{t.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {t.width} × {t.height} · {categoryLabel(t.category)}
                    </div>
                    {tagList(t.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tagList(t.tags).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10 text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="pt-2">
            <SectionTitle kicker="Tip" title="Carousels post as one set" />
            <p className="text-sm text-slate-400 max-w-2xl -mt-2">
              Templates marked with a slide count are carousels — open one and you can step through and edit every
              slide, then save or download the whole set.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
