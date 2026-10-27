"use client";

/**
 * The interactive resort compare tool: two pickers (every resort with a
 * page, grouped by country) over the shared comparison table. The
 * selection lives in the URL (?a= / ?b=) so a comparison is shareable,
 * and mirrors the pair pages' data exactly — same rows, same links.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import type { SkiResortLogoMap } from "@/lib/ski-directory";
import {
  nextSelection,
  type CompareResortData,
  type CompareSelection,
} from "@/lib/ski-compare";
import SkiComparisonTable from "./SkiComparisonTable";

function ResortPicker({
  label,
  value,
  resorts,
  onChange,
}: {
  label: string;
  value: string | null;
  resorts: CompareResortData[];
  onChange: (slug: string | null) => void;
}) {
  const groups = useMemo(() => {
    const byCountry = new Map<string, CompareResortData[]>();
    for (const r of resorts) {
      const list = byCountry.get(r.country) ?? [];
      list.push(r);
      byCountry.set(r.country, list);
    }
    return [...byCountry.entries()]
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([country, list]) => ({
        country,
        resorts: [...list].sort((x, y) => x.name.localeCompare(y.name)),
      }));
  }, [resorts]);
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-white/45 mb-2">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-[#0a0f1c] px-4 py-3 text-sm font-semibold text-white/90 focus:border-[#D4AF37]/60 focus:outline-none"
      >
        <option value="">Choose a resort…</option>
        {groups.map(g => (
          <optgroup key={g.country} label={g.country}>
            {g.resorts.map(r => (
              <option key={r.slug} value={r.slug}>
                {r.name} — {r.region}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export default function SkiCompareTool({
  resorts,
  logos,
  initial,
}: {
  resorts: CompareResortData[];
  logos: SkiResortLogoMap;
  initial: CompareSelection;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<CompareSelection>(initial);
  const bySlug = useMemo(
    () => new Map(resorts.map(r => [r.slug, r] as const)),
    [resorts],
  );
  const a = selection.a ? bySlug.get(selection.a) : undefined;
  const b = selection.b ? bySlug.get(selection.b) : undefined;

  function apply(next: CompareSelection) {
    setSelection(next);
    const params = new URLSearchParams();
    if (next.a) params.set("a", next.a);
    if (next.b) params.set("b", next.b);
    const qs = params.toString();
    router.replace(qs ? `/ski-webcams/compare?${qs}` : "/ski-webcams/compare", {
      scroll: false,
    });
  }

  return (
    <div>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end max-w-3xl mx-auto">
        <ResortPicker
          label="Resort A"
          value={selection.a}
          resorts={resorts}
          onChange={slug => apply(nextSelection(selection, "a", slug))}
        />
        <button
          type="button"
          aria-label="Swap resorts"
          disabled={!selection.a && !selection.b}
          onClick={() => apply({ a: selection.b, b: selection.a })}
          className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white/70 hover:bg-white/5 transition disabled:opacity-40"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <ResortPicker
          label="Resort B"
          value={selection.b}
          resorts={resorts}
          onChange={slug => apply(nextSelection(selection, "b", slug))}
        />
      </div>

      <div className="mt-8">
        {a && b ? (
          <SkiComparisonTable a={a} b={b} logos={logos} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50 text-sm max-w-3xl mx-auto">
            {a || b
              ? `Now pick a second resort to compare with ${(a ?? b)!.name}.`
              : "Pick any two resorts to see their terrain, cameras and official links side by side."}
          </div>
        )}
      </div>
    </div>
  );
}
