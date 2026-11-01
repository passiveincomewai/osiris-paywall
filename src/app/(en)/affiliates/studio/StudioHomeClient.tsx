"use client";
// Marketing Studio home: personal card, featured templates rail, recent creations.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { CopyButton, EmptyState, RankBadge, SectionTitle } from "@/components/affiliate/ui";

/* ------------------------------------------------------------------ */
/* Types (local mirrors of the Studio API payloads)                    */
/* ------------------------------------------------------------------ */

export interface StudioTemplateLite {
  id: string;
  slug: string;
  title: string;
  category: string;
  kind: string;
  format?: string | null;
  width: number;
  height: number;
  assetUrl?: string | null;
  editableFields?: unknown;
  carouselGroup?: string | null;
  slideIndex?: number | null;
  featured?: boolean;
  sortOrder?: number;
  tags?: string[];
}

export interface StudioCreationLite {
  id: string;
  templateSlug?: string | null;
  templateId?: string | null;
  title?: string | null;
  kind?: string | null;
  values?: Record<string, unknown> | null;
  params?: Record<string, unknown> | null;
  caption?: string | null;
  captionText?: string | null;
  text?: string | null;
  /** Phase 3 (Cosmo AI): fulfilled text result, stored on the creation. */
  resultText?: string | null;
  /** Phase 3: true when an AI image result is stored (bytes served via
   *  the owner-only /creations/[id]/image route, never inlined). */
  hasImage?: boolean;
  createdAt: string;
  template?: { slug: string; title: string; category: string; kind?: string } | null;
}

/** Cosmo AI creations carry their job kind (ai_caption, ai_image, …). */
export function isAiCreation(c: StudioCreationLite): boolean {
  return typeof c.kind === "string" && c.kind.startsWith("ai_");
}

interface Me {
  profile: { referralCode: string; customCode: string | null; status: string; xp: number };
  rank: { name: string; badge: string; color: string; glow: string; commissionPct: number; tagline: string };
  referralLink: string;
  discount?: { code: string; pct: number; synced: boolean; status: string } | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors";

const CATEGORY_LABELS: Record<string, string> = {
  feed: "Feed Posts",
  story: "Stories",
  reel: "Reel Covers",
  tiktok: "TikTok",
  short: "Shorts",
  carousel: "Carousels",
  banner: "Banners",
  discount: "Discount",
  feature: "Feature Graphics",
  email: "Email & Blog",
  thumbnail: "YT Thumbnails",
  ambassador: "Ambassador",
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

export function renderUrl(
  slug: string,
  values: Record<string, unknown> | null | undefined,
  opts: { format?: string; scale?: number; preview?: boolean } = {},
): string {
  const params = new URLSearchParams();
  params.set("slug", slug);
  params.set("format", opts.format ?? "webp");
  params.set("scale", String(opts.scale ?? 0.35));
  if (opts.preview) params.set("preview", "1");
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      if (v === null || v === undefined) continue;
      params.set(`f_${k}`, typeof v === "boolean" ? (v ? "true" : "false") : String(v));
    }
  }
  return `/api/affiliate/studio/render?${params.toString()}`;
}

export function creationValues(c: StudioCreationLite): Record<string, unknown> {
  return c.values ?? c.params ?? {};
}

export function creationTemplateSlug(c: StudioCreationLite): string | null {
  return c.templateSlug ?? c.template?.slug ?? null;
}

export function creationCaptionText(c: StudioCreationLite): string | null {
  if (c.caption) return c.caption;
  if (c.captionText) return c.captionText;
  if (c.text) return c.text;
  const v = creationValues(c);
  for (const key of ["caption", "captionText", "text"]) {
    if (typeof v[key] === "string" && (v[key] as string).trim()) return v[key] as string;
  }
  return null;
}

export function isCaptionCreation(c: StudioCreationLite): boolean {
  if (c.kind === "caption") return true;
  return !creationTemplateSlug(c) && creationCaptionText(c) !== null;
}

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface StudioDemoBundle {
  me: Me;
  featured: StudioTemplateLite[];
  creations: StudioCreationLite[];
  templateCount: number;
}

export default function StudioHomeClient({
  initialFeatured,
  initialCreations,
  initialTemplateCount,
  demo,
}: {
  initialFeatured: StudioTemplateLite[];
  initialCreations: StudioCreationLite[];
  initialTemplateCount: number;
  demo?: StudioDemoBundle;
}) {
  const isDemo = !!demo;
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(demo?.me ?? null);
  const [notJoined, setNotJoined] = useState(false);
  const [loading, setLoading] = useState(!isDemo);
  const [joinMsg, setJoinMsg] = useState("");
  const [demoNote, setDemoNote] = useState("");
  const [featured, setFeatured] = useState<StudioTemplateLite[]>(demo?.featured ?? initialFeatured);
  const [creations, setCreations] = useState<StudioCreationLite[]>(demo?.creations ?? initialCreations);
  const [templateCount, setTemplateCount] = useState<number>(demo?.templateCount ?? initialTemplateCount);
  const [creationsCount, setCreationsCount] = useState<number>((demo?.creations ?? initialCreations).length);

  const loadStudioData = useCallback(async () => {
    // Featured templates (fall back to / refresh from the API).
    try {
      const { ok, j } = await api("/api/affiliate/studio/templates");
      if (ok && Array.isArray(j.templates)) {
        const all = j.templates as StudioTemplateLite[];
        setTemplateCount(all.length);
        const feat = all.filter((t) => t.featured);
        setFeatured(feat.length > 0 ? feat : all.slice(0, 12));
      }
    } catch { /* keep server-provided data */ }
    try {
      const { ok, j } = await api("/api/affiliate/studio/creations");
      if (ok && Array.isArray(j.creations)) {
        const list = j.creations as StudioCreationLite[];
        setCreationsCount(list.length);
        setCreations(list.slice(0, 6));
      }
    } catch { /* keep server-provided data */ }
  }, []);

  useEffect(() => {
    if (isDemo) return;
    (async () => {
      const { ok, status, j } = await api("/api/affiliate/me");
      if (!ok && status === 404 && j.join) {
        setNotJoined(true);
        setLoading(false);
        return;
      }
      if (ok) {
        setMe(j as unknown as Me);
        await loadStudioData();
      }
      setLoading(false);
    })();
  }, [loadStudioData]);

  const join = async () => {
    setJoinMsg("Activating…");
    const { ok, j } = await api("/api/affiliate/join", { method: "POST" });
    if (ok) {
      setNotJoined(false);
      setJoinMsg("");
      const meRes = await api("/api/affiliate/me");
      if (meRes.ok) setMe(meRes.j as unknown as Me);
      await loadStudioData();
    } else {
      setJoinMsg(typeof j.error === "string" ? j.error : "Couldn't activate. Try again.");
    }
  };

  const generateNextAd = () => {
    if (isDemo) {
      setDemoNote("Ad generation is available in the live Studio — the demo is read-only.");
      return;
    }
    if (featured.length === 0) return;
    const pick = featured[Math.floor(Math.random() * featured.length)];
    router.push(`/affiliates/studio/create/${pick.slug}`);
  };

  const quickLinks = useMemo(
    () => [
      { href: "/affiliates/studio/library", title: "Template Library", body: "Browse every template by category and format." },
      { href: "/affiliates/studio/repurpose", title: "Repurposing Machine", body: "Turn one video you own into many platform-ready variations — new hooks, pacing, captions and formats, each with your link and its own creative ID." },
      { href: "/affiliates/studio/ai", title: "AI by Cosmo", body: "Captions, hooks, scripts, and images — crafted to order by WorldEye's AI around your link." },
      { href: "/affiliates/studio/captions", title: "Caption Generator", body: "Platform-ready captions with your link + #ad disclosure." },
      { href: "/affiliates/studio/promote", title: "Promote & Share", body: "Your QR code, a UTM link builder, embeddable banners, and a ready-to-post share kit." },
      { href: "/affiliates/studio/creations", title: "My Creations", body: "Everything you've saved — download or delete anytime." },
      { href: "/affiliates/studio/credits", title: "Credits & Packs", body: "Your balance, monthly allowance, and top-up packs." },
      { href: "/affiliates/studio/campaigns", title: "Campaigns", body: "Join a posting campaign, submit your post, claim XP + credits." },
      { href: "/affiliates/studio/ambassador", title: "Ambassador", body: "Apply for ambassador perks — exclusive templates and early access." },
      { href: "/affiliates/studio/analytics", title: "Analytics", body: "Creations, credits, referrals, and your public bio page." },
      { href: "/affiliates/studio/leaderboard", title: "Leaderboard", body: "This month's Studio rankings — creations, XP, campaigns." },
      { href: "/affiliates/studio/compliance", title: "Compliance", body: "FTC disclosure rules and the required snippet, ready to copy." },
    ],
    [],
  );

  if (loading && !me && !notJoined) {
    return <div className="text-slate-400 font-mono text-sm">Opening the studio…</div>;
  }

  if (notJoined) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-3">Affiliate Marketing Studio</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Your Creative Studio.<br />Unlimited Possibilities.
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
          Turn your WorldEye referral link into professional marketing campaigns — templates, captions, and
          ready-to-download graphics. Join the free affiliate program to unlock it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={join} className={btnPrimary} style={btnStyle}>Become an Affiliate — Free</button>
          <Link href="/affiliates" className={btnGhost}>Learn about the program</Link>
        </div>
        {joinMsg && <div className="mt-3 text-sm text-slate-400">{joinMsg}</div>}
      </div>
    );
  }

  if (!me) return <EmptyState title="Couldn't load the studio" body="Refresh the page to try again." />;

  return (
    <div className="space-y-8">
      {isDemo && (
        <div className="rounded-2xl border border-pink-400/50 bg-pink-400/[0.08] px-4 py-3 text-sm text-pink-100">
          <span className="font-mono font-bold tracking-widest">DEMO</span> — the real Marketing Studio home
          on a sample persona. The template catalog below is the live one; creations and figures are
          illustrative, and template previews render in the live Studio.
          {demoNote && <div className="mt-2 text-cyan-200">{demoNote}</div>}
        </div>
      )}
      {/* Hero */}
      <section className="text-center pt-2 pb-2">
        <div className="text-[11px] font-mono tracking-[0.3em] text-cyan-400 uppercase mb-3">Affiliate Marketing Studio</div>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Your Creative Studio.<br className="hidden sm:block" /> Unlimited Possibilities.
        </h1>
        <p className="text-slate-400 mt-3 max-w-xl mx-auto">
          Turn your WorldEye referral link into professional marketing campaigns.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>Create an Ad</Link>
          <Link href="/affiliates/studio/ai" className={btnGhost + " inline-flex items-center gap-1.5"}><Sparkles className="w-4 h-4 text-cyan-300" /> AI by Cosmo</Link>
          <Link href="/affiliates/studio/library" className={btnGhost}>Browse Templates</Link>
          <Link href="/affiliates/studio/creations" className={btnGhost}>My Creations</Link>
        </div>
      </section>

      {/* Personal card */}
      <section className={card}>
        <SectionTitle kicker="Your studio" title="Personalized for you" />
        <div className="grid lg:grid-cols-[1fr_auto] gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">Referral link — embedded in every design</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <code className="flex-1 truncate rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-sm text-cyan-300">
                  {me.referralLink}
                </code>
                <CopyButton text={me.referralLink} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">XP</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{me.profile.xp.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Commission</div>
                <div className="text-xl font-bold font-mono mt-0.5" style={{ color: me.rank.color }}>{me.rank.commissionPct}%</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Templates</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{templateCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Creations</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{creationsCount}</div>
              </div>
            </div>
            {me.discount ? (
              <p className="text-xs text-slate-400">
                Your discount code <span className="font-mono font-bold text-emerald-300">{me.discount.code}</span> gives
                your audience {me.discount.pct}% off their first payment
                {me.discount.synced
                  ? " — it appears automatically in discount templates."
                  : " — it's activating and will appear in discount templates once live."}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Discount codes: not available yet — your ads never display a fake discount.
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-4">
            <RankBadge name={me.rank.name} badge={me.rank.badge} color={me.rank.color} glow={me.rank.glow} size="lg" />
            <button
              onClick={generateNextAd}
              disabled={featured.length === 0}
              className={btnPrimary + " disabled:opacity-50"}
              style={btnStyle}
            >
              <Sparkles className="w-4 h-4 inline-block align-[-2px] mr-1.5" /> Generate My Next Ad
            </button>
            {featured.length === 0 && (
              <span className="text-xs text-slate-500">Featured templates are loading — browse the library meanwhile.</span>
            )}
          </div>
        </div>
      </section>

      {/* Featured templates rail */}
      <section>
        <SectionTitle
          kicker="Start creating"
          title="Featured templates"
          right={<Link href="/affiliates/studio/library" className="text-sm font-mono text-cyan-300 hover:text-cyan-200">View all →</Link>}
        />
        {featured.length === 0 ? (
          <EmptyState
            title="No featured templates yet"
            body="The full library is still the place to start — new featured picks land here as templates are published."
            cta={<Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>Browse the library</Link>}
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
            {featured.map((t) => (
              <Link
                key={t.id}
                href={`/affiliates/studio/create/${t.slug}`}
                className="w-60 shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-400/50 transition-colors group"
              >
                <div className="bg-black/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {isDemo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-4 text-center"
                      style={{ background: "radial-gradient(300px 160px at 50% 0%, #0a2a55 0%, #050b18 75%)" }}>
                      <span className="font-mono text-[9px] tracking-[0.3em] text-cyan-300">WORLDEYE TEMPLATE</span>
                      <span className="text-sm font-bold text-white leading-snug">{t.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">preview renders in the live Studio</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={renderUrl(t.slug, null, { scale: 0.3, format: "webp", preview: true })}
                      alt={t.title}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                    />
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-white truncate">{t.title}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {categoryLabel(t.category)} · {t.width} × {t.height}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent creations */}
      <section>
        <SectionTitle
          kicker="Your work"
          title="Recent creations"
          right={<Link href="/affiliates/studio/creations" className="text-sm font-mono text-cyan-300 hover:text-cyan-200">All creations →</Link>}
        />
        {creations.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            body="Pick a template, personalize it, and save it — your creations will show up here."
            cta={<Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>Create your first ad</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {creations.map((c) => {
              const slug = creationTemplateSlug(c);
              const caption = isCaptionCreation(c) ? creationCaptionText(c) : null;
              return (
                <Link
                  key={c.id}
                  href="/affiliates/studio/creations"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-400/50 transition-colors"
                >
                  <div className="bg-black/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {slug && !caption && !isDemo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={renderUrl(slug, creationValues(c), { scale: 0.3, format: "webp", preview: true })}
                        alt={c.title ?? "Creation"}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="p-4 text-xs text-slate-300 line-clamp-6 whitespace-pre-wrap w-full">
                        {caption ?? c.title ?? "Caption"}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-bold text-white truncate">{c.title ?? (caption ? "Caption" : "Untitled creation")}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid md:grid-cols-3 gap-4">
        {quickLinks.map((q) => (
          <Link key={q.title} href={q.href} className={card + " hover:border-cyan-400/50 transition-colors block"}>
            <div className="text-white font-bold mb-1 flex items-center gap-1.5">
              {q.href === "/affiliates/studio/ai" && <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />}
              {q.title} →
            </div>
            <div className="text-sm text-slate-400">{q.body}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
