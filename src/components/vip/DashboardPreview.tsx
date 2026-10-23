"use client";

/**
 * /vip — live preview of the REAL member dashboard.
 *
 * This is not a mockup, screenshot or sample data: it is a same-origin
 * embed of the actual /dashboard page in a frame on the hub. /dashboard
 * is frameable by the same origin only (the site-wide
 * `X-Frame-Options: SAMEORIGIN` header in next.config.ts), so the embed
 * works here and nowhere else.
 *
 * What the frame shows is whatever /dashboard itself serves:
 *  - signed in  → the member's own dashboard: their tracked cameras,
 *    camera alerts, recordings, plan badge and account stats, fully
 *    interactive;
 *  - signed out → /dashboard redirects to its sign-in screen, so the
 *    frame honestly shows that sign-in screen. Nothing is fabricated
 *    to fill the space.
 */
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";

export default function DashboardPreview({ signedIn }: { signedIn: boolean }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <section aria-label="Live preview of your dashboard">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
          Your dashboard — live preview
        </h2>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-xs font-bold text-[#04121f] transition hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
        >
          Open full dashboard <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mb-4 max-w-xl text-sm leading-relaxed text-slate-400">
        {signedIn ? (
          <>
            The window below is your real dashboard, live — your tracked cameras, camera
            alerts and recordings exactly as they are right now, not a picture of them.
            It is fully working: scroll it, open a camera, or jump to the full page.
          </>
        ) : (
          <>
            The window below is the real dashboard, live — not a picture of it. Signed
            out, the dashboard itself shows its sign-in screen; sign in there (or with
            the button above) and your tracked cameras, camera alerts and recordings
            appear right here.
          </>
        )}
      </p>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#05070d]">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#05070d] font-mono text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your live dashboard…
          </div>
        )}
        <iframe
          src="/dashboard"
          title="Live preview of your WorldEye dashboard"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="block h-[600px] w-full border-0 sm:h-[720px]"
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Live embed of <span className="font-mono text-slate-400">worldeye.app/dashboard</span>{" "}
        — the same page the button opens, shown here so you can use it without leaving the
        hub.
      </p>
    </section>
  );
}
