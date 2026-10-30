"use client";
// Promote & Share: the affiliate's own distribution kit — referral
// link, QR code (public /api/affiliate/qr), a client-side UTM link
// builder, and a share kit of truthful pre-written posts. Share
// buttons open each platform's own composer (intent links); nothing
// here posts on the affiliate's behalf.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionTitle } from "@/components/affiliate/ui";

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const input =
  "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors disabled:opacity-50";
const codeBox =
  "block w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-sm text-cyan-300 break-all";

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — the text stays selectable */
        }
      }}
      className={btnGhost}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

interface MeState {
  code: string;
  link: string;
  discount: { code: string; pct: number; synced: boolean } | null;
}

const UTM_PRESETS: { label: string; source: string; medium: string }[] = [
  { label: "X / Twitter", source: "twitter", medium: "social" },
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "YouTube", source: "youtube", medium: "social" },
  { label: "TikTok", source: "tiktok", medium: "social" },
  { label: "Blog", source: "blog", medium: "referral" },
  { label: "Email", source: "newsletter", medium: "email" },
];

export default function PromoteClient() {
  const [me, setMe] = useState<MeState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<{ url: string; qr: string } | null>(null);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || typeof j.referralLink !== "string") {
          setError("Couldn't load your affiliate details. Refresh the page to try again.");
          setLoading(false);
          return;
        }
        const code =
          typeof j.profile?.customCode === "string"
            ? j.profile.customCode
            : typeof j.profile?.referralCode === "string"
              ? j.profile.referralCode
              : "";
        const state: MeState = {
          code,
          link: j.referralLink,
          discount:
            j.discount && typeof j.discount.code === "string"
              ? { code: j.discount.code, pct: Number(j.discount.pct) || 0, synced: !!j.discount.synced }
              : null,
        };
        setMe(state);
        if (code) {
          try {
            const qrRes = await fetch(`/api/affiliate/qr?code=${encodeURIComponent(code)}`, { cache: "no-store" });
            if (qrRes.ok) {
              const qj = await qrRes.json().catch(() => ({}));
              if (typeof qj.qr === "string" && typeof qj.url === "string") setQr({ url: qj.url, qr: qj.qr });
            }
          } catch {
            /* QR card degrades to the plain link */
          }
        }
      } catch {
        setError("Couldn't load your affiliate details. Refresh the page to try again.");
      }
      setLoading(false);
    })();
  }, []);

  const utmLink = useMemo(() => {
    if (!me) return "";
    try {
      const u = new URL(me.link);
      if (utmSource.trim()) u.searchParams.set("utm_source", utmSource.trim());
      if (utmMedium.trim()) u.searchParams.set("utm_medium", utmMedium.trim());
      if (utmCampaign.trim()) u.searchParams.set("utm_campaign", utmCampaign.trim());
      return u.toString();
    } catch {
      return me.link;
    }
  }, [me, utmSource, utmMedium, utmCampaign]);

  const posts = useMemo(() => {
    if (!me) return [];
    const link = me.link;
    const xText = `Watch the world live — 74,229 cameras, live flights and satellites on one free 3D globe. No signup needed to look around: ${link} #ad`;
    const socialText =
      `I've been exploring WorldEye — a free 3D globe with 74,229 live cameras around the world, ` +
      `plus live flight and satellite tracking. Take a look: ${link}\n\nAffiliate link — I may earn a commission if you join. #ad`;
    const instaText =
      `The whole planet, live. 🌍\n\n74,229 live cameras, real-time flights and satellites — all on one ` +
      `free globe you can spin. Link in bio to explore.\n\n${link}\n\n#ad #LiveCameras #Earth #Travel #Aviation`;
    const emailSubject = "Watch 74,229 live cameras on a free 3D globe";
    const emailBody =
      `Hi,\n\nThought you'd like this: WorldEye puts 74,229 live cameras from around the world — plus ` +
      `live flights and satellites — on one free 3D globe. No signup needed to explore.\n\nTake a look: ${link}\n\n` +
      `Affiliate link — I may earn a commission if you join.`;
    return [
      {
        id: "x",
        label: "X / Twitter",
        text: xText,
        intent: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`,
        intentLabel: "Open in X",
      },
      {
        id: "facebook",
        label: "Facebook",
        text: socialText,
        intent: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
        intentLabel: "Open in Facebook",
        intentNote: "Facebook only accepts the link — paste the post text in after it opens.",
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        text: socialText,
        intent: `https://wa.me/?text=${encodeURIComponent(socialText)}`,
        intentLabel: "Open in WhatsApp",
      },
      {
        id: "telegram",
        label: "Telegram",
        text: socialText,
        intent: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
          "Watch the world live — 74,229 cameras on a free 3D globe",
        )}`,
        intentLabel: "Open in Telegram",
      },
      {
        id: "instagram",
        label: "Instagram caption",
        text: instaText,
        intent: null as string | null,
        intentLabel: "",
        intentNote: "Instagram has no web share box — copy the caption and paste it into the app.",
      },
      {
        id: "email",
        label: "Email",
        text: `Subject: ${emailSubject}\n\n${emailBody}`,
        intent: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
        intentLabel: "Open in your mail app",
      },
    ];
  }, [me]);

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading your promote kit…</div>;
  if (error || !me) {
    return <EmptyState title="Promote kit unavailable" body={error || "Couldn't load your affiliate details."} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Promote &amp; Share</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Your link, your QR code, and ready-to-post copy — everything routes through your real referral link,
          so every signup is credited to you.
        </p>
      </div>

      {/* Referral link */}
      <div className={card}>
        <SectionTitle kicker="Your link" title="One link for everything" />
        <div className="flex flex-col sm:flex-row gap-2">
          <code className={codeBox + " flex-1"}>{me.link}</code>
          <CopyBtn text={me.link} label="Copy link" />
        </div>
        {me.discount?.synced ? (
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Your discount code <span className="font-mono text-cyan-300">{me.discount.code}</span> is live:
            people who join through you save {me.discount.pct}% at checkout.
          </p>
        ) : me.discount ? (
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Your {me.discount.pct}% discount code is still syncing — don&apos;t advertise it until this card
            shows it as live.
          </p>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* QR code */}
        <div className={card}>
          <SectionTitle kicker="QR code" title="Scan to visit your link" />
          {qr ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qr} alt="QR code for your referral link" className="w-52 h-52 rounded-xl bg-white p-1" />
              <code className="font-mono text-xs text-cyan-300 break-all text-center">{qr.url}</code>
              <a href={qr.qr} download="worldeye-referral-qr.png" className={btnGhost}>
                Download QR PNG
              </a>
              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                The same link your templates bake into their QR layers — those are decode-verified on every
                render.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Your QR code couldn&apos;t be generated — your link above works everywhere a QR would.</p>
          )}
        </div>

        {/* UTM builder */}
        <div className={card}>
          <SectionTitle kicker="Tracking" title="UTM link builder" />
          <div className="flex flex-wrap gap-2 mb-3">
            {UTM_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setUtmSource(p.source);
                  setUtmMedium(p.medium);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-all ${
                  utmSource === p.source && utmMedium === p.medium
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                    : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="utm-source" className="block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5">Source</label>
              <input id="utm-source" className={input} value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="e.g. twitter" />
            </div>
            <div>
              <label htmlFor="utm-medium" className="block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5">Medium</label>
              <input id="utm-medium" className={input} value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="e.g. social" />
            </div>
            <div>
              <label htmlFor="utm-campaign" className="block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5">Campaign</label>
              <input id="utm-campaign" className={input} value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="e.g. october-push" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <code className={codeBox + " flex-1 text-xs"}>{utmLink}</code>
            <CopyBtn text={utmLink} label="Copy tracked link" />
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Built in your browser — nothing is stored. The tags ride along for your own analytics; the
            referral code in the link is what credits you.
          </p>
        </div>
      </div>

      {/* Share kit */}
      <div className={card}>
        <SectionTitle
          kicker="Share kit"
          title="Ready-to-post copy"
          right={<span className="text-xs font-mono text-slate-500">every post carries the #ad disclosure</span>}
        />
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-2">{p.label}</div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{p.text}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <CopyBtn text={p.text} label="Copy post" />
                {p.intent && (
                  <a href={p.intent} target="_blank" rel="noreferrer" className={btnGhost}>
                    {p.intentLabel} ↗
                  </a>
                )}
                {p.intentNote && <span className="text-[11px] text-slate-500">{p.intentNote}</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Share buttons open each platform&apos;s own composer — you review and post yourself; nothing is
          ever posted for you. Only use claims you can back up, and keep the #ad disclosure wherever you post.
        </p>
      </div>

      {/* Embeds pointer */}
      <div className={card}>
        <SectionTitle kicker="On your site" title="Embed a live banner" />
        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
          Banner templates in the library now have an <span className="text-slate-200 font-mono text-[13px]">&lt;/&gt; Embed</span> action:
          copy the HTML, paste it into your blog or site, and the banner stays personalized with your link and
          QR code — served straight from WorldEye.
        </p>
        <Link href="/affiliates/studio/library" className={btnPrimary + " mt-4"} style={btnStyle}>
          Browse banners
        </Link>
        <p className="text-[11px] text-slate-500 mt-4">
          New to disclosing affiliate links? Read the{" "}
          <Link href="/affiliates/studio/compliance" className="text-cyan-300 hover:text-cyan-200 underline">
            compliance guide
          </Link>{" "}
          before you post.
        </p>
      </div>
    </div>
  );
}
