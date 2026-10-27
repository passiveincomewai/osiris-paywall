"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Competitor = {
  slug: string;
  name: string;
  website: string | null;
  categories: string[];
  tagline: string | null;
};

export default function CompareHub({
  competitors,
  categories,
}: {
  competitors: Competitor[];
  categories: { id: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return competitors.filter((c) => {
      if (cat && !c.categories.includes(cat)) return false;
      if (needle && !(c.name.toLowerCase().includes(needle) || (c.tagline ?? "").toLowerCase().includes(needle)))
        return false;
      return true;
    });
  }, [competitors, q, cat]);

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search competitors…"
            aria-label="Search competitors"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#0096FF]/60"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
        <button
          onClick={() => setCat(null)}
          className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${cat === null ? "bg-[#0096FF] border-[#0096FF] text-white" : "border-white/15 text-white/55 hover:text-white"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${cat === c.id ? "bg-[#0096FF] border-[#0096FF] text-white" : "border-white/15 text-white/55 hover:text-white"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/40 text-sm py-12 text-center">No competitors match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-[#0096FF]/50 hover:bg-white/[0.05] transition"
            >
              <h2 className="font-bold text-white group-hover:text-[#0096FF] transition">WorldEye vs {c.name}</h2>
              {c.tagline && <p className="text-xs text-white/45 mt-2 leading-relaxed line-clamp-2">{c.tagline}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.categories.slice(0, 3).map((id) => (
                  <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0096FF]/10 text-[#7cc4ff] border border-[#0096FF]/20">
                    {categories.find((x) => x.id === id)?.label ?? id}
                  </span>
                ))}
              </div>
              <span className="inline-block mt-4 text-xs font-semibold text-[#0096FF]">Read comparison →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
