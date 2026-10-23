"use client";
// Campaign kit page: everything needed to post for one campaign in one
// place — requirements checklist with copy buttons, the campaign's
// templates, and a ready-to-paste caption starter. (No ZIP download:
// the kit is this page; templates open in the creator.)
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Square } from "lucide-react";
import { CopyButton, EmptyState, SectionTitle } from "@/components/affiliate/ui";
import { categoryLabel, renderUrl, type StudioTemplateLite } from "../../StudioHomeClient";
import type { CampaignListItem, StudioCampaign } from "../CampaignsClient";

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CopyRow({ label, text, copyLabel }: { label: string; text: string; copyLabel: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5 border-b border-white/5 last:border-0">
      <div className="sm:w-44 shrink-0 text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase">{label}</div>
      <code className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 font-mono text-sm text-cyan-200 break-all">
        {text}
      </code>
      <CopyButton text={text} label={copyLabel} />
    </div>
  );
}

export default function KitClient({ campaignId }: { campaignId: string }) {
  const [item, setItem] = useState<CampaignListItem | null>(null);
  const [templates, setTemplates] = useState<StudioTemplateLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { ok, j } = await api("/api/affiliate/studio/campaigns");
      if (!ok) {
        setError(typeof j.error === "string" ? j.error : "Couldn't load this campaign.");
        setLoading(false);
        return;
      }
      const list = Array.isArray(j.campaigns) ? (j.campaigns as CampaignListItem[]) : [];
      const found = list.find((it) => it.campaign.id === campaignId) ?? null;
      if (!found) {
        setError("This campaign isn't active right now.");
        setLoading(false);
        return;
      }
      setItem(found);
      if (found.campaign.templateSlugs.length > 0) {
        const t = await api("/api/affiliate/studio/templates");
        if (t.ok && Array.isArray(t.j.templates)) {
          const all = t.j.templates as StudioTemplateLite[];
          const wanted = new Set(found.campaign.templateSlugs);
          setTemplates(all.filter((tpl) => wanted.has(tpl.slug)));
        }
      }
      setLoading(false);
    })();
  }, [campaignId]);

  const captionStarter = useMemo(() => {
    if (!item) return "";
    const c: StudioCampaign = item.campaign;
    const parts = [
      c.requiredCaptionSnippet ?? "",
      item.trackedLink,
      c.requiredHashtags.join(" "),
    ].filter((s) => s.trim().length > 0);
    return parts.join("\n\n");
  }, [item]);

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading the campaign kit…</div>;
  if (error || !item) {
    return (
      <EmptyState
        title="Campaign kit unavailable"
        body={error || "This campaign couldn't be loaded."}
        cta={
          <Link href="/affiliates/studio/campaigns" className={btnPrimary} style={btnStyle}>
            Back to campaigns
          </Link>
        }
      />
    );
  }

  const c = item.campaign;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/affiliates/studio/campaigns" className="text-sm font-mono text-cyan-300 hover:text-cyan-200">
          ← All campaigns
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">{c.name} — Campaign Kit</h1>
        <p className="text-sm text-slate-400 mt-1">
          {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)} · Rewards: {c.xpReward} XP + {c.creditReward} credits
        </p>
        <p className="text-sm font-semibold text-cyan-200 mt-3">{c.goal}</p>
        <p className="text-sm text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap max-w-3xl">{c.description}</p>
      </div>

      <section className={card}>
        <SectionTitle kicker="Requirements" title="Posting checklist" />
        <ul className="text-sm text-slate-300 space-y-1.5 mb-3 list-none">
          <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Post on {c.channels.length > 0 ? c.channels.join(", ") : "your channel"} before {fmtDate(c.endsAt)}.</span></li>
          {c.requiredCaptionSnippet && <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Include the required caption snippet, word for word.</span></li>}
          {c.requiredHashtags.length > 0 && <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Include every required hashtag.</span></li>}
          <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Link to the campaign landing page using your tracked link below.</span></li>
          <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Add your #ad disclosure (see the <Link href="/affiliates/studio/compliance" className="text-cyan-300 hover:underline">compliance page</Link>).</span></li>
          <li className="flex gap-2"><Square className="w-3.5 h-3.5 mt-[3px] shrink-0 text-slate-500" /><span>Come back to the campaigns page, paste your post URL, and claim your rewards.</span></li>
        </ul>
        {c.requiredHashtags.length > 0 && (
          <CopyRow label="Hashtags" text={c.requiredHashtags.join(" ")} copyLabel="Copy hashtags" />
        )}
        {c.requiredCaptionSnippet && (
          <CopyRow label="Required snippet" text={c.requiredCaptionSnippet} copyLabel="Copy snippet" />
        )}
        <CopyRow label="Landing URL" text={c.landingUrl} copyLabel="Copy landing URL" />
        <CopyRow label="My tracked link" text={item.trackedLink} copyLabel="Copy my link" />
      </section>

      <section className={card}>
        <SectionTitle kicker="Start here" title="Caption starter" />
        <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed rounded-xl border border-white/10 bg-black/30 p-3">
          {captionStarter}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={captionStarter} label="Copy caption starter" />
          <Link href="/affiliates/studio/captions" className={btnGhost}>
            Open the caption generator
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Edit the starter freely — just keep the required snippet, hashtags, and your tracked link in the final post.
        </p>
      </section>

      <section>
        <SectionTitle kicker="Made for this campaign" title="Campaign templates" />
        {c.templateSlugs.length === 0 ? (
          <EmptyState
            title="No templates attached to this campaign"
            body="Any library template works — pick one that fits your channel and personalize it with your link."
            cta={
              <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>
                Browse the library
              </Link>
            }
          />
        ) : templates.length === 0 ? (
          <EmptyState title="Templates are loading" body="The campaign's templates couldn't be loaded — the full library has them all." />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-400/50 transition-colors"
              >
                <div className="bg-black/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderUrl(t.slug, null, { scale: 0.35, format: "webp", preview: true })}
                    alt={t.title}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{t.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {categoryLabel(t.category)} · {t.width} × {t.height}
                    </div>
                  </div>
                  <Link href={`/affiliates/studio/create/${t.slug}`} className={btnGhost + " shrink-0"}>
                    Customize
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
