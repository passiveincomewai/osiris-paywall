"use client";
// AI by Cosmo — made-to-order AI content for affiliates.
//
// HONESTY CONTRACT (do not soften): nothing here is instant. The
// affiliate places an order, credits are charged, Cosmo creates the
// piece outside the app, and it lands in My Creations when ready —
// usually within a few hours. A request unfulfilled after 7 days
// refunds automatically. There is no progress bar and no fake
// "generating…" state: a queued order is simply in Cosmo's queue.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton, EmptyState } from "@/components/affiliate/ui";
import {
  AI_KIND_META,
  AI_KINDS,
  AI_PLATFORMS,
  AI_TONES,
  type AiKind,
} from "@/lib/studio/credits-config";

const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50";
const labelCls = "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400 mb-1.5";

interface AiJob {
  id: string;
  kind: string;
  status: string;
  creditCost: number;
  subject: string;
  platform: string;
  tone: string;
  resultText: string | null;
  error: string | null;
  creationId: string | null;
  hasImage: boolean;
  createdAt: string;
  completedAt: string | null;
}

interface CreditsInfo {
  balance: number;
  config: { prices: Record<string, number> };
}

function statusChip(job: AiJob): { text: string; cls: string } {
  if (job.status === "queued") return { text: "In Cosmo's queue", cls: "border-amber-400/40 text-amber-200 bg-amber-400/10" };
  if (job.status === "done") return { text: "Ready", cls: "border-emerald-400/40 text-emerald-200 bg-emerald-400/10" };
  if (job.status === "refunded") return { text: "Refunded", cls: "border-white/15 text-slate-300 bg-white/5" };
  return { text: job.status, cls: "border-white/15 text-slate-300 bg-white/5" };
}

export default function AiClient() {
  const [kind, setKind] = useState<AiKind>("ai_caption");
  const [platform, setPlatform] = useState<string>("Instagram");
  const [tone, setTone] = useState<string>(AI_TONES[0]);
  const [subject, setSubject] = useState("");
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [jobsRes, creditsRes] = await Promise.all([
        fetch("/api/affiliate/studio/ai", { cache: "no-store" }),
        fetch("/api/affiliate/studio/credits", { cache: "no-store" }),
      ]);
      const jj = await jobsRes.json().catch(() => ({}));
      if (jobsRes.ok && Array.isArray(jj.jobs)) setJobs(jj.jobs as AiJob[]);
      const cj = await creditsRes.json().catch(() => ({}));
      if (creditsRes.ok) setCredits(cj as CreditsInfo);
    } catch {
      setError("Couldn't load the AI studio — refresh to try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const price = credits?.config.prices[kind] ?? 0;
  const balance = credits?.balance ?? 0;

  const submit = async () => {
    setSubmitting(true);
    setNotice("");
    setError("");
    try {
      const r = await fetch("/api/affiliate/studio/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, subject, platform, tone }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "insufficient_credits") {
          setError(
            `Not enough credits — this order costs ${j.cost} and your balance is ${j.balance}. Grab a pack on the credits page.`,
          );
        } else if (typeof j.message === "string") {
          setError(j.message);
        } else {
          setError(typeof j.error === "string" ? j.error : "Couldn't place that order.");
        }
      } else {
        setNotice(
          `Order placed — ${j.cost} credits. Cosmo will craft it and drop it in your My Creations, usually within a few hours.`,
        );
        setSubject("");
        await load();
      }
    } catch {
      setError("Network error — your order was not placed.");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Opening the AI studio…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">AI by Cosmo ✨</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Made-to-order content for your WorldEye promotion — written and designed around your referral link.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.05] p-4 text-sm text-cyan-100/85 leading-relaxed">
        <span className="font-bold text-cyan-200">Crafted by Cosmo, WorldEye&apos;s AI — made to order, usually ready within a few hours.</span>{" "}
        This isn&apos;t an instant generator: you place an order, Cosmo creates it, and it appears in your{" "}
        <Link href="/affiliates/studio/creations" className="underline decoration-cyan-300/50 underline-offset-2">My Creations</Link>{" "}
        when it&apos;s done. If a request ever sits unfulfilled for 7 days, your credits are refunded automatically.
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-100" role="alert">
          {error}{" "}
          {error.includes("credits") && (
            <Link href="/affiliates/studio/credits" className="underline underline-offset-2 font-semibold">
              Go to Credits &amp; Packs →
            </Link>
          )}
        </div>
      )}

      {/* Order form */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-white">Place an order</div>
          <div className="text-xs font-mono text-slate-400">
            Balance: <span className="text-white font-bold">{balance}</span> credits
          </div>
        </div>

        <div>
          <span className={labelCls}>What should Cosmo make?</span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {AI_KINDS.map((k) => {
              const meta = AI_KIND_META[k];
              const p = credits?.config.prices[k] ?? 0;
              const selected = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${
                    selected
                      ? "border-cyan-400/60 bg-cyan-400/[0.08]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-white">{meta.label}</span>
                    <span className="text-[11px] font-mono text-cyan-300 whitespace-nowrap">{p} credits</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">{meta.deliverable}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="ai-platform">Platform</label>
            <select id="ai-platform" className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {AI_PLATFORMS.map((p) => (
                <option key={p} value={p} className="bg-[#0a1628]">{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ai-tone">Tone</label>
            <select id="ai-tone" className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
              {AI_TONES.map((t) => (
                <option key={t} value={t} className="bg-[#0a1628]">{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="ai-subject">What&apos;s it about?</label>
          <textarea
            id="ai-subject"
            className={inputCls}
            rows={3}
            maxLength={500}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Promote the live Tokyo street cameras to night-owl scrollers — angle: 'the city that never sleeps, live on your phone'"
          />
          <div className="text-[11px] font-mono text-slate-500 mt-1 text-right">{subject.length}/500</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || subject.trim().length === 0}
            className={btnPrimary}
            style={btnStyle}
          >
            {submitting ? "Placing order…" : `Order from Cosmo — ${price} credits`}
          </button>
          <span className="text-xs text-slate-500">
            Charged when you order. Refunded automatically if Cosmo can&apos;t deliver.
          </span>
        </div>
      </div>

      {/* Orders */}
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase mb-3">Your AI orders</div>
        {jobs.length === 0 ? (
          <EmptyState
            title="No AI orders yet"
            body="Place your first order above — Cosmo will craft it around your referral link and deliver it to My Creations."
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const chip = statusChip(job);
              const meta = AI_KIND_META[job.kind as AiKind];
              return (
                <div key={job.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">
                        {meta ? meta.label : job.kind}
                        {job.subject ? <span className="font-normal text-slate-300"> — {job.subject}</span> : null}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {job.platform} · {job.tone} · ordered {new Date(job.createdAt).toLocaleString()} · {job.creditCost} credits
                      </div>
                    </div>
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${chip.cls}`}>
                      {chip.text}
                    </span>
                  </div>

                  {job.status === "queued" && (
                    <p className="text-xs text-slate-400 mt-2.5">
                      In Cosmo&apos;s queue — no action needed. It will appear in My Creations when ready.
                    </p>
                  )}
                  {job.status === "refunded" && (
                    <p className="text-xs text-slate-400 mt-2.5">
                      {job.error ?? "This request couldn't be fulfilled — your credits were refunded."}
                    </p>
                  )}
                  {job.status === "done" && job.resultText && (
                    <div className="mt-3">
                      <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed rounded-xl border border-white/10 bg-black/30 p-3 max-h-56 overflow-y-auto">
                        {job.resultText}
                      </pre>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CopyButton text={job.resultText} label="Copy result" />
                        {job.creationId && (
                          <Link
                            href="/affiliates/studio/creations"
                            className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60"
                          >
                            View in My Creations
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                  {job.status === "done" && !job.resultText && job.hasImage && job.creationId && (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/affiliate/studio/creations/${encodeURIComponent(job.creationId)}/image`}
                        alt={job.subject || "AI image by Cosmo"}
                        className="max-h-72 rounded-xl border border-white/10"
                        loading="lazy"
                      />
                      <div className="mt-2">
                        <Link
                          href="/affiliates/studio/creations"
                          className="px-4 py-2 inline-block rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60"
                        >
                          View in My Creations
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
