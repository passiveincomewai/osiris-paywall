"use client";
// Studio campaigns: join a posting campaign, submit your post URL, claim
// the XP + credit rewards. Rewards are granted server-side exactly once.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CopyButton, EmptyState } from "@/components/affiliate/ui";

export interface StudioCampaign {
  id: string;
  name: string;
  goal: string;
  description: string;
  startsAt: string;
  endsAt: string;
  requiredHashtags: string[];
  requiredCaptionSnippet?: string | null;
  landingUrl: string;
  xpReward: number;
  creditReward: number;
  channels: string[];
  templateSlugs: string[];
  status: string;
}

export interface CampaignParticipation {
  id: string;
  campaignId: string;
  postUrl?: string | null;
  postedAt?: string | null;
  reviewStatus: string;
  completedAt?: string | null;
  joinedAt: string;
}

export interface CampaignListItem {
  campaign: StudioCampaign;
  myParticipation: CampaignParticipation | null;
  trackedLink: string;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors";
const input =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function CampaignsClient() {
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postUrls, setPostUrls] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { ok, j } = await api("/api/affiliate/studio/campaigns");
    if (!ok) setError(typeof j.error === "string" ? j.error : "Couldn't load campaigns.");
    else {
      const list = Array.isArray(j.campaigns) ? (j.campaigns as CampaignListItem[]) : [];
      setItems(list);
      setPostUrls((prev) => {
        const next = { ...prev };
        for (const it of list) {
          if (it.myParticipation?.postUrl && !next[it.campaign.id]) next[it.campaign.id] = it.myParticipation.postUrl;
        }
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const join = async (id: string) => {
    setBusyId(id);
    setNotice((n) => ({ ...n, [id]: "" }));
    const { ok, j } = await api(`/api/affiliate/studio/campaigns/${encodeURIComponent(id)}/join`, { method: "POST" });
    if (ok) {
      setItems((prev) =>
        prev.map((it) =>
          it.campaign.id === id ? { ...it, myParticipation: j.participation as CampaignParticipation } : it,
        ),
      );
      setNotice((n) => ({ ...n, [id]: "You're in — grab the kit, post, then submit your post URL below." }));
    } else {
      setNotice((n) => ({ ...n, [id]: typeof j.error === "string" ? j.error : "Couldn't join this campaign." }));
    }
    setBusyId(null);
  };

  const complete = async (id: string) => {
    const postUrl = (postUrls[id] ?? "").trim();
    if (!postUrl) {
      setNotice((n) => ({ ...n, [id]: "Paste the URL of your post first." }));
      return;
    }
    setBusyId(id);
    setNotice((n) => ({ ...n, [id]: "" }));
    const { ok, j } = await api(`/api/affiliate/studio/campaigns/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postUrl }),
    });
    if (ok) {
      const rewards = (j.rewards ?? {}) as { xpAwarded?: number; creditsAwarded?: number; alreadyCompleted?: boolean };
      setItems((prev) =>
        prev.map((it) =>
          it.campaign.id === id ? { ...it, myParticipation: j.participation as CampaignParticipation } : it,
        ),
      );
      setNotice((n) => ({
        ...n,
        [id]: rewards.alreadyCompleted
          ? "Already claimed — rewards for this campaign were granted once."
          : `Rewards claimed: +${rewards.xpAwarded ?? 0} XP and +${rewards.creditsAwarded ?? 0} credits.`,
      }));
    } else {
      setNotice((n) => ({ ...n, [id]: typeof j.error === "string" ? j.error : "Couldn't claim rewards." }));
    }
    setBusyId(null);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading campaigns…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Campaigns</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Time-boxed posting challenges. Join one, post with the required hashtags and snippet, submit your post
          URL, and claim the XP and credit rewards.
        </p>
      </div>

      {error ? (
        <EmptyState title="Campaigns unavailable" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No active campaigns right now"
          body="New campaigns land here as they're published. In the meantime, the template library and caption generator are always open."
          cta={
            <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>
              Browse the library
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map(({ campaign: c, myParticipation: p }) => {
            const completed = !!p?.completedAt;
            return (
              <section key={c.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white">{c.name}</h2>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)}
                      {c.channels.length > 0 ? ` · ${c.channels.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 text-center">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">XP reward</div>
                      <div className="text-lg font-bold font-mono text-white">{c.xpReward}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Credits</div>
                      <div className="text-lg font-bold font-mono text-cyan-300">{c.creditReward}</div>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-semibold text-cyan-200 mt-3">{c.goal}</p>
                <p className="text-sm text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap">{c.description}</p>

                {c.requiredHashtags.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1.5">Required hashtags</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 font-mono text-sm text-cyan-300">
                        {c.requiredHashtags.join(" ")}
                      </code>
                      <CopyButton text={c.requiredHashtags.join(" ")} label="Copy hashtags" />
                    </div>
                  </div>
                )}

                {c.requiredCaptionSnippet && (
                  <div className="mt-3">
                    <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1.5">Required caption snippet</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 font-mono text-sm text-slate-200 break-all">
                        {c.requiredCaptionSnippet}
                      </code>
                      <CopyButton text={c.requiredCaptionSnippet} label="Copy snippet" />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/affiliates/studio/campaigns/${c.id}`} className={btnGhost}>
                    Open campaign kit →
                  </Link>
                  {!p ? (
                    <button onClick={() => void join(c.id)} disabled={busyId === c.id} className={btnPrimary + " disabled:opacity-50"} style={btnStyle}>
                      {busyId === c.id ? "Joining…" : "Join campaign"}
                    </button>
                  ) : completed ? (
                    <span className="text-sm font-mono text-emerald-300 inline-flex items-center gap-1.5"><Check className="w-4 h-4" strokeWidth={3} /> Completed — rewards claimed</span>
                  ) : (
                    <span className="text-sm font-mono text-cyan-300">
                      Joined{p.reviewStatus && p.reviewStatus !== "none" ? ` · review: ${p.reviewStatus}` : ""}
                    </span>
                  )}
                </div>

                {p && !completed && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <input
                      className={input}
                      placeholder="https://… link to your post"
                      value={postUrls[c.id] ?? ""}
                      onChange={(e) => setPostUrls((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => void complete(c.id)}
                      disabled={busyId === c.id}
                      className={btnPrimary + " disabled:opacity-50 whitespace-nowrap"}
                      style={btnStyle}
                    >
                      {busyId === c.id ? "Claiming…" : "Mark posted & claim rewards"}
                    </button>
                  </div>
                )}
                {p && completed && p.postUrl && (
                  <p className="mt-3 text-xs text-slate-400">
                    Your post:{" "}
                    <a href={p.postUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline break-all">
                      {p.postUrl}
                    </a>
                  </p>
                )}
                {notice[c.id] && <p className="mt-3 text-sm text-slate-300">{notice[c.id]}</p>}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
