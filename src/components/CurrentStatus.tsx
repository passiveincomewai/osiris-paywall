import Link from "next/link";
import type { StatusRow } from "@/lib/place-breakdown";

/**
 * The owner's "Current Status" block for the generated place pages:
 * the questions people actually type ("is it snowing in X right now",
 * "how bad is traffic on Y") answered only with what the page can
 * honestly show — a real weather snapshot when one was fetched, the
 * live camera counts always, and a link to the cameras instead of an
 * invented condition when no feed is wired. Rows are built by
 * src/lib/place-breakdown.ts; this component only renders them.
 */
export default function CurrentStatus({
  place,
  rows,
}: {
  place: string;
  rows: StatusRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-12" aria-label={`Current status in ${place}`}>
      <h2 className="text-xl md:text-2xl font-bold mb-5 flex items-center gap-3">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
        </span>
        {place} right now
      </h2>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
          >
            <p className="font-semibold text-sm">{r.q}</p>
            <p className="text-sm text-white/60 leading-relaxed mt-1.5">{r.a}</p>
            {r.href && r.linkLabel && (
              <Link
                href={r.href}
                className="text-xs text-[#00E5FF] hover:underline mt-2 inline-block"
              >
                {r.linkLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
