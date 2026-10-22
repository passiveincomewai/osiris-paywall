import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import {
  getConversionReport,
  RANGES,
  type RangeKey,
  type SegmentRow,
  type FunnelStage,
} from "@/lib/conversion-analytics";

export const metadata = { title: "Conversion — Admin" };
export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function pct1(v: number | null): string {
  if (v === null || !isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

const RANGE_KEYS = RANGES.map((r) => r.key) as RangeKey[];

export default async function ConversionAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/conversion");
  if (!adminEmails().includes(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050810" }}>
        <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white">Admin access only</h1>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Signed in as <span className="text-white/80 font-mono">{email}</span>, which is not an admin.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const range: RangeKey = RANGE_KEYS.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : "7d";
  const r = await getConversionReport(range);
  const landed = r.stages[0]?.count ?? 0;
  const paidTotal = (r.stages.find((s) => s.key === "first")?.count ?? 0) + (r.stages.find((s) => s.key === "renewal")?.count ?? 0);
  const moneyStages: FunnelStage["key"][] = ["checkout", "trial", "first", "renewal"];

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">WorldEye Ops</div>
            <h1 className="text-2xl font-bold text-white mt-1">Conversion</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl">
              Where visitors come from and exactly where they stop progressing —
              landing to globe, camera, pricing, checkout, trial, first payment
              and renewal, from our own tracked data and Stripe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {RANGES.map((rg) => (
              <Link
                key={rg.key}
                href={`/admin/conversion?range=${rg.key}`}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  rg.key === range
                    ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10"
                    : "border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {rg.label}
              </Link>
            ))}
            <Link href="/admin" className="px-3 py-1.5 rounded-lg text-sm border border-white/15 text-white/60 hover:text-white">
              ← Admin
            </Link>
          </div>
        </div>

        {/* Owner exclusion + data honesty strip */}
        <p className="text-xs text-white/40 mt-4 leading-relaxed">
          Checkout, trial and payment counts <span className="text-white/70">exclude owner/test accounts</span>{" "}
          (Jameson&apos;s own addresses) so test checkouts never inflate the money stages. Session counts
          include all traffic. Money stages count subscriptions and invoices whose event falls in the
          window — they are not a strict subset of this window&apos;s sessions, so a renewal can outnumber
          a first payment here.
          {r.capped ? " The PageView read hit its row cap in this window — session counts are a floor, not a total." : ""}
        </p>

        {!r.stripeOk && (
          <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-5">
            <h2 className="font-bold text-amber-200 text-sm">Stripe data unavailable</h2>
            <p className="text-sm text-white/60 mt-1">
              Trial, first payment and renewal stages could not be read from Stripe for this window and
              are shown as —. The site stages and the checkout count (from our own checkout-attempt
              records) are unaffected.
            </p>
          </section>
        )}

        {/* Summary cards */}
        <section className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `Landed sessions (${range})`, value: fmt(landed), sub: "Distinct sessions with at least one tracked page view" },
            {
              label: "Biggest drop-off",
              value: r.biggestDropoff ? r.biggestDropoff.label : "—",
              sub: r.biggestDropoff
                ? `${fmt(r.biggestDropoff.dropFromPrev)} lost after the previous stage (${pct1(r.biggestDropoff.pctOfPrev)} continue)`
                : "No stage lost ground in this window",
            },
            {
              label: "Trials started",
              value: r.stripeOk ? fmt(r.stages.find((s) => s.key === "trial")?.count ?? 0) : "—",
              sub: "Stripe subscriptions created in the window with a trial, owner accounts excluded",
            },
            {
              label: "Paid end-to-end",
              value: r.stripeOk ? pct1(landed > 0 ? (100 * paidTotal) / landed : null) : "—",
              sub: `${fmt(paidTotal)} subscriptions with a payment event in the window, per landed session`,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">{c.label}</div>
              <div className="text-3xl font-bold text-white mt-2 tabular-nums">{c.value}</div>
              <div className="text-xs text-white/40 mt-1">{c.sub}</div>
            </div>
          ))}
        </section>

        {/* Funnel */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-bold text-white">The funnel</h2>
          <p className="text-xs text-white/40 mt-1">
            Site stages count distinct sessions; money stages count subscriptions / checkout attempts in
            the window. Bar widths are proportional to the count relative to Landed.
          </p>
          <div className="mt-5 space-y-3">
            {r.stages.map((s) => {
              const isMoney = moneyStages.includes(s.key);
              const stripeHidden = isMoney && s.key !== "checkout" && !r.stripeOk;
              const isBiggestDrop = r.biggestDropoff?.key === s.key;
              const widthPct = landed > 0 ? Math.max(s.count > 0 ? 1.5 : 0, (100 * s.count) / landed) : 0;
              return (
                <div key={s.key} className={isBiggestDrop ? "rounded-xl border border-amber-400/40 bg-amber-400/[0.04] p-3 -m-1" : ""}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="text-white/85 font-medium">
                      {s.label}
                      {isBiggestDrop && <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">biggest drop-off</span>}
                      {isMoney && <span className="ml-2 text-[11px] text-white/30">owner accounts excluded</span>}
                    </div>
                    <div className="text-white/60 tabular-nums whitespace-nowrap">
                      <span className="text-white font-bold">{stripeHidden ? "—" : fmt(s.count)}</span>
                      {stripeHidden ? (
                        <span className="text-white/35">{"  ·  "}Stripe unavailable</span>
                      ) : (
                        <>
                          {"  ·  "}
                          {s.key === "landed" ? "100%" : `${pct1(s.pctOfPrev)} of previous`}
                          {"  ·  "}
                          {pct1(s.pctOfLanded)} of landed
                          {s.key !== "landed" && s.dropFromPrev > 0 && (
                            <span className="text-white/35">  ·  −{fmt(s.dropFromPrev)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 h-3.5 rounded-md bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-md"
                      style={{
                        width: `${stripeHidden ? 0 : widthPct}%`,
                        background: isMoney
                          ? "linear-gradient(90deg,#b07fe8,#c084fc)"
                          : "linear-gradient(90deg,#0e7490,#22d3ee)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-white/30 mt-4 leading-relaxed">
            Checkout started is counted from our checkout-attempt records (one per subscription checkout
            created, recorded by the Stripe webhook) — {fmt(r.checkout.started)} attempts from{" "}
            {fmt(r.checkout.distinctCustomers)} distinct customer emails in this window
            {r.checkout.stripeCount !== null
              ? `; Stripe's own count for the same window is ${fmt(r.checkout.stripeCount)}, shown as a cross-check.`
              : "."}{" "}
            Trial = a Stripe subscription created in the window with a trial period. First payment = a
            subscription whose first-ever paid invoice lands in the window; renewal = a subscription with
            a second-or-later paid invoice in the window (a weekly plan converted and renewed inside a
            long window counts in both, by definition).
          </p>
        </section>

        {/* Segments */}
        <SegmentTable
          title="By traffic source"
          rows={r.segments.source}
          stripeOk={r.stripeOk}
          footnote="First-touch within the window: each session is labelled from the utmSource (or, failing that, the referrer host) on the first tracked row in the window that carries one — this is not lifetime first-touch. Smaller sources fold into “Other sources”. Money events join through the subscriber's account to their earliest session in the window; events that cannot be joined sit in “(unattributed)” rather than being spread across sources."
        />
        <SegmentTable
          title="By device"
          rows={r.segments.device}
          stripeOk={r.stripeOk}
          footnote="Device class as stamped by the analytics ingest (client-reported, else derived from the User-Agent). Rows recorded before device stamping existed read “unknown”."
        />
        <SegmentTable
          title="By landing page"
          rows={r.segments.landing}
          stripeOk={r.stripeOk}
          footnote="A session counts under the first page it was tracked on in the window. Top 12 by landings; the rest fold into “Other landing pages”."
        />

        <p className="text-[11px] text-white/30 mt-8 leading-relaxed">
          Data as of {new Date(r.generatedAtISO).toUTCString()} · window starts {new Date(r.sinceISO).toUTCString()}.
          Site stages: PageView rows from the first-party tracker (tracking began 2026-10-12). Globe interaction
          = a <span className="font-mono">globe_reached</span> event; camera opened = a{" "}
          <span className="font-mono">camera_open</span> event; pricing viewed = a page view of /pricing.
        </p>
      </div>
    </div>
  );
}

function SegmentTable({
  title,
  rows,
  stripeOk,
  footnote,
}: {
  title: string;
  rows: SegmentRow[];
  stripeOk: boolean;
  footnote: string;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-bold text-white">{title}</h2>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
              <th className="pb-2 pr-3 font-semibold">Segment</th>
              <th className="pb-2 pr-3 font-semibold text-right">Landed</th>
              <th className="pb-2 pr-3 font-semibold text-right">Globe</th>
              <th className="pb-2 pr-3 font-semibold text-right">Camera</th>
              <th className="pb-2 pr-3 font-semibold text-right">Pricing</th>
              <th className="pb-2 pr-3 font-semibold text-right">Trial</th>
              <th className="pb-2 pr-3 font-semibold text-right">Paid</th>
              <th className="pb-2 font-semibold text-right">Paid % of landed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-white/5">
                <td className="py-2 pr-3 text-white/80">{row.label}</td>
                <td className="py-2 pr-3 text-right text-white/85 tabular-nums">{fmt(row.landed)}</td>
                <td className="py-2 pr-3 text-right text-white/60 tabular-nums">
                  {fmt(row.globe)} <span className="text-white/30">({pct1(row.landed > 0 ? (100 * row.globe) / row.landed : null)})</span>
                </td>
                <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{fmt(row.camera)}</td>
                <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{fmt(row.pricing)}</td>
                <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{stripeOk ? fmt(row.trials) : "—"}</td>
                <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{stripeOk ? fmt(row.paid) : "—"}</td>
                <td className="py-2 text-right text-white/85 tabular-nums">{stripeOk ? pct1(row.endToEndPct) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-white/35 text-sm">
                  No sessions in this window yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-white/30 mt-3 leading-relaxed">{footnote}</p>
    </section>
  );
}
