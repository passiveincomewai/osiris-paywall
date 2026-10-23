"use client";

// Today's Drop card (Phase 4, §16): renders ONLY when the admin has
// published a drop for today — no placeholder, no countdown, no fake
// scarcity. Downloading/claiming grants the drop's XP bonus once per
// affiliate per day (the claim row + XP idempotency key enforce it
// server-side in /api/affiliate/studio/drops/claim).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { renderUrl } from "./StudioHomeClient";

interface DropTemplateLite {
  slug: string;
  title: string;
}

interface TodayDrop {
  id: string;
  title: string;
  note: string | null;
  xpBonus: number;
  template: DropTemplateLite | null;
}

export default function TodayDropCard() {
  const [drop, setDrop] = useState<TodayDrop | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awarded, setAwarded] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/affiliate/studio/drops");
        if (!res.ok) return;
        const j = (await res.json()) as { drop: TodayDrop | null; claimed: boolean };
        if (cancelled) return;
        setDrop(j.drop);
        setClaimed(Boolean(j.claimed));
      } catch {
        // No card on failure — the Studio home works without it.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !drop) return null;

  async function claimAndDownload() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/affiliate/studio/drops/claim", { method: "POST" });
      if (res.ok) {
        const j = (await res.json()) as { xpAwarded: number; alreadyClaimed: boolean };
        setClaimed(true);
        if (!j.alreadyClaimed) setAwarded(j.xpAwarded);
      }
    } catch {
      // Claim is idempotent — a retry is safe.
    } finally {
      setBusy(false);
    }
    if (drop?.template) {
      window.open(renderUrl(drop.template.slug, null, { format: "png", scale: 1 }), "_blank");
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-400/10 via-white/5 to-cyan-400/10 p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        {drop.template ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={renderUrl(drop.template.slug, null, { scale: 0.3, format: "webp", preview: true })}
            alt={drop.template.title}
            className="h-28 w-auto rounded-xl border border-white/10 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
            Today&apos;s Drop
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{drop.title}</h2>
          {drop.note ? <p className="mt-1 text-sm text-slate-300">{drop.note}</p> : null}
          <p className="mt-1 text-xs text-slate-400">
            A fresh Studio asset for today.{" "}
            {claimed
              ? awarded !== null
                ? `Claimed — +${awarded} XP added.`
                : "You've claimed today's drop."
              : `Download it and earn +${drop.xpBonus} XP (once per day).`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={claimAndDownload}
            disabled={busy}
            className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy
              ? "Claiming…"
              : claimed
                ? drop.template
                  ? "Download again"
                  : (<>Claimed <Check className="w-4 h-4 inline-block align-[-2px] ml-0.5" strokeWidth={3} /></>)
                : `Download & claim +${drop.xpBonus} XP`}
          </button>
          {drop.template ? (
            <Link
              href={`/affiliates/studio/create/${drop.template.slug}`}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:border-cyan-300/50"
            >
              Customize it →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
