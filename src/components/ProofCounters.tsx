"use client";

/**
 * Wave 2 F8 — live proof counters for /pricing (and reusable near
 * upgrade prompts). Every number comes from GET /api/proof, which
 * computes them from the site's own data (analytics sessions + the
 * served camera catalogue). A counter whose data didn't arrive is
 * simply not rendered — the component never shows an invented or
 * stale figure, and renders nothing at all if no counter is real.
 */
import { useEffect, useState } from "react";

interface ProofData {
  watchingNow: number | null;
  watchingToday: number | null;
  countries: number | null;
  sources: number | null;
}

export default function ProofCounters() {
  const [data, setData] = useState<ProofData | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/proof", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setData(d as ProofData);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!data) return null;
  const items: { value: number; label: string }[] = [];
  if (typeof data.watchingNow === "number" && data.watchingNow > 0)
    items.push({ value: data.watchingNow, label: "watching now" });
  if (typeof data.watchingToday === "number" && data.watchingToday > 0)
    items.push({ value: data.watchingToday, label: "explorers today" });
  if (typeof data.countries === "number" && data.countries > 0)
    items.push({ value: data.countries, label: "countries covered" });
  if (typeof data.sources === "number" && data.sources > 0)
    items.push({ value: data.sources, label: "live camera sources" });
  if (items.length === 0) return null;

  return (
    <div
      aria-label="WorldEye in numbers, computed live"
      className="mx-auto mt-6 flex max-w-2xl flex-wrap items-stretch justify-center gap-2"
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="min-w-[120px] rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center"
        >
          <div className="text-xl font-bold tabular-nums text-[#D4AF37]">
            {it.value.toLocaleString("en-US")}
          </div>
          <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
