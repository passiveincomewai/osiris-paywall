"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Globe, Orbit, Plane, Video } from "lucide-react";
import { GATE_ACCOUNT_BENEFIT, gateAuthHref } from "@/lib/account-gate";

/**
 * The sign-up wall for the time-boxed globe account gate
 * (lib/account-gate: ACCOUNT_GATE_UNTIL, owner-ordered 2026-10-27).
 *
 * Rendered by src/app/page.tsx INSTEAD of the globe shell while the
 * gate is active and the visitor is definitively signed out — and,
 * with `checking`, while the session read is still resolving, so the
 * globe never flashes for a signed-out visitor. Signed-in visitors
 * only ever see the checking state, briefly.
 *
 * Visual language is the auth pages' (components/auth/AuthShell):
 * same backdrop, glows, card and gold primary CTA, so the wall reads
 * as part of sign-in, not as an error page.
 *
 * The CTAs carry the visitor back to the exact URL they opened —
 * deep links (?geo=, ?flight=, ?camera=) and ad landings included —
 * via the site's own gateAuthHref helper: after sign-up/sign-in the
 * auth pages return them to that URL, where the gate now passes.
 */
export default function GlobeAccountGate({ checking = false }: { checking?: boolean }) {
  // The callback is read after mount: during SSR (and the first client
  // render) it is the globe root, then it becomes this visitor's real
  // path+query, so a deep link survives the round trip.
  const [callbackPath, setCallbackPath] = useState("/");
  useEffect(() => {
    setCallbackPath(window.location.pathname + window.location.search);
  }, []);

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>
      <div className="relative flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/worldeye-eye.png"
              alt="WorldEye"
              width={600}
              height={432}
              className="h-12 w-auto mx-auto mb-5"
              style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
            />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Create a free account to open the globe
            </h1>
            <p className="text-white/50 text-sm mt-2">
              The live globe is one free account away — no card, no cost.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            {checking && (
              <p className="flex items-center justify-center gap-2 text-xs font-mono tracking-widest text-white/45 mb-5" role="status">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                CHECKING YOUR SESSION…
              </p>
            )}
            <ul className="grid gap-3 text-sm text-white/75 mb-6">
              <li className="flex items-center gap-3">
                <Globe className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                The full live 3D globe, free
              </li>
              <li className="flex items-center gap-3">
                <Video className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                74,229 live cameras worldwide
              </li>
              <li className="flex items-center gap-3">
                <Plane className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                Live flights, tracked in real time
              </li>
              <li className="flex items-center gap-3">
                <Orbit className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                Live satellites overhead
              </li>
              <li className="flex items-center gap-3">
                <Activity className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                Weather, earthquakes and wildfire layers
              </li>
            </ul>
            <div className="grid gap-3">
              <Link
                href={gateAuthHref("signup", callbackPath)}
                className="w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                Create free account
              </Link>
              <Link
                href={gateAuthHref("signin", callbackPath)}
                className="flex items-center justify-center gap-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] hover:border-white/20 transition active:scale-[0.99]"
              >
                Sign in
              </Link>
            </div>
            <p className="text-white/40 text-xs leading-relaxed mt-5">
              {GATE_ACCOUNT_BENEFIT} You&rsquo;ll land right back on the view you opened.
            </p>
          </div>
          <p className="text-center text-white/35 text-xs mt-6 leading-relaxed">
            Only the live globe asks for an account right now — camera directories,
            pricing and the blog stay open to everyone.
          </p>
        </div>
      </div>
    </main>
  );
}
