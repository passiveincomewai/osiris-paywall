"use client";

/**
 * Wave 2 F14 — data-export tease for the flight, satellite and
 * earthquake trackers.
 *
 * The buttons are VISIBLE BUT DISABLED for everyone, on purpose: no
 * CSV/KML export of tracker data exists anywhere in the codebase today
 * (the exports that do exist belong to other tools — drawn-area
 * contents, fingerprint search, timelapse — not the trackers). Per the
 * brief this is a tease, never a fake-working button: the real export
 * is a follow-on owner decision. Copy stays honest per tier:
 *  - non-Pro: the buttons are labelled a Pro unlock;
 *  - Pro/VIP: the note says plainly that export isn't available yet —
 *    a paying member is never told to buy what they already have.
 */
import { useEffect, useState } from "react";
import { Download, Lock } from "lucide-react";
import { readSessionIdentity, type SessionIdentityState } from "@/lib/premium-entitlement";

export default function ExportTease({ surface }: { surface: string }) {
  const [identity, setIdentity] = useState<SessionIdentityState>("unknown");

  useEffect(() => {
    let live = true;
    readSessionIdentity()
      .then((id) => {
        if (live) setIdentity(id.state);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const premium = identity === "premium";
  return (
    <div className="flex flex-wrap items-center gap-2 px-2.5 py-2" aria-label={`Export ${surface} data`}>
      <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
        <Download className="h-3 w-3" /> Export {surface} data
      </span>
      {(["CSV", "KML"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          disabled
          aria-disabled="true"
          title={
            premium
              ? "Data export isn't available yet"
              : `Export ${fmt} — a Pro feature (not yet available)`
          }
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-white/35"
        >
          <Lock className="h-3 w-3" /> {fmt}
        </button>
      ))}
      <span className="text-[10px] text-white/35">
        {premium ? "Data export isn't available yet — for any plan." : "A Pro feature — export unlocks with Pro."}
      </span>
    </div>
  );
}
