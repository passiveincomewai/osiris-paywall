"use client";

/**
 * Wave 2 F10 — the one friendly free-account prompt every gated utility
 * action uses (favorites, Daily Spotlight viewing, the exclusive map
 * themes). Copy and hrefs come from lib/account-gate so the surfaces
 * can never drift into separate nag systems. This is an inline prompt,
 * not a modal and not a wall: browsing is never blocked, the prompt
 * sits where the action was attempted.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import {
  gateAuthHref,
  gateBody,
  gateTitle,
  type GateFeature,
} from "@/lib/account-gate";

export default function AccountGatePrompt({
  feature,
  compact = false,
  callbackPath,
}: {
  feature: GateFeature;
  compact?: boolean;
  callbackPath?: string;
}) {
  const pathname = usePathname();
  const cb = callbackPath ?? pathname ?? "/";
  return (
    <div
      role="note"
      className={`rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/[0.06] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className={`font-semibold text-white/90 ${compact ? "text-xs" : "text-sm"}`}>
        {gateTitle(feature)}
      </p>
      <p className={`mt-1 leading-relaxed text-white/55 ${compact ? "text-[11px]" : "text-xs"}`}>
        {gateBody(feature)}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Link
          href={gateAuthHref("signup", cb)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create free account
        </Link>
        <Link
          href={gateAuthHref("signin", cb)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/5"
        >
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Link>
      </div>
    </div>
  );
}
