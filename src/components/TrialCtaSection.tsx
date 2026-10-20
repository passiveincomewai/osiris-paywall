// ── End-of-content trial CTA ────────────────────────────────────────────
// One reusable block for content pages that used to dead-end in a globe
// button (camera/country/city directories, the live-* hubs). The plan
// facts come from the billing config — TRIAL_PLAN_OPTIONS carries the
// names, prices, per-day figures and trial notes, and they are never
// restated here — the primary button goes to /pricing (the existing
// flow), the secondary link opens the free globe carrying the page's
// utm_source so click-throughs stay measurable, and the guarantee line
// is the canonical sentence from /pricing, verbatim. Reference
// implementation: the /gods-eye-view trial section, which shipped
// first. A page renders this at most once, at the natural end of its
// content — never mid-article.
import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";

/** The canonical 7-day first-charge guarantee sentence (as on /pricing). */
export const TRIAL_CTA_GUARANTEE =
  "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.";

export default function TrialCtaSection({
  utmSource,
  headline,
  blurb,
}: {
  /** utm_source for the globe link, e.g. "cameras" — one per page. */
  utmSource: string;
  headline?: ReactNode;
  blurb?: string;
}) {
  return (
    <section className="mt-20 max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-center">
        {headline ?? (
          <>
            The globe is free.{" "}
            <span className="text-[#D4AF37]">The locked layers aren&rsquo;t.</span>
          </>
        )}
      </h2>
      <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
        {blurb ??
          "Everything on this page is free with no signup. Paid plans unlock the intelligence toolkit, intel layers, timelapse, camera alerts and the recording studio — and every plan starts with a free trial. We email you before your trial's first charge."}
      </p>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {TRIAL_PLAN_OPTIONS.map((p) => (
          <div
            key={p.plan}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center"
          >
            <p className="text-xs font-semibold tracking-[0.25em] text-[#00E5FF]">
              {p.trialLabel.toUpperCase()}
            </p>
            <p className="font-display text-xl font-semibold mt-3">{p.name}</p>
            <p className="mt-2">
              <span className="font-mono text-3xl font-bold">{p.price}</span>
              <span className="text-white/50 text-sm">{p.per}</span>
            </p>
            <p className="text-xs text-white/40 mt-1">about {p.perDay} a day</p>
            <p className="text-xs text-white/50 mt-3 leading-relaxed">{p.note}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
          >
            Compare plans &amp; start a free trial
          </Link>
          <Link
            href={`/?utm_source=${utmSource}&utm_medium=trial-cta`}
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/75 font-semibold hover:text-white hover:border-white/30 transition"
          >
            Open the globe — free
          </Link>
        </div>
        <p className="mt-5 inline-flex items-start sm:items-center gap-2 text-sm text-white/50 max-w-xl text-left sm:text-center">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]/80 shrink-0 mt-0.5 sm:mt-0" />
          {TRIAL_CTA_GUARANTEE}
        </p>
      </div>
    </section>
  );
}
