"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { installShareEntityBridge, shareEntity } from "@/lib/share/client";
import type { ShareEntityKind } from "@/lib/share/links";

/**
 * The one share button for entity detail views. Builds the entity's
 * deep link carrying the visitor's personal share code (affiliate
 * code when signed in, this device's anonymous code otherwise) and
 * runs the platform share sheet / clipboard. Renders nothing when
 * the entity has no shareable id — a link that can't resolve is
 * never offered.
 */
export default function ShareButton({
  kind,
  id,
  label,
  className,
  title,
  iconOnly = false,
}: {
  kind: ShareEntityKind;
  id: string | null | undefined;
  /** Verified entity label for the share sheet (name/callsign/place). */
  label?: string | null;
  className?: string;
  title?: string;
  /** Render just the icon (dense headers); feedback flips the icon. */
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  // Any mounted ShareButton also arms the bridge the globe's HTML
  // popups call (window.__weShareEntity).
  useEffect(() => {
    installShareEntityBridge();
  }, []);

  if (!id) return null;

  async function onShare() {
    if (state === "busy" || !id) return;
    setState("busy");
    try {
      const { outcome } = await shareEntity({ kind, id }, { label });
      setState(outcome === "copied" || outcome === "shared" ? "done" : "idle");
      if (outcome === "copied" || outcome === "shared") {
        setTimeout(() => setState("idle"), 1600);
      }
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={state === "busy"}
      title={title ?? "Share"}
      aria-label={title ?? "Share"}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono tracking-wider text-white/80 hover:bg-white/10 hover:border-white/25 transition-all disabled:opacity-50"
      }
    >
      {state === "done" ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          {!iconOnly && "COPIED"}
        </>
      ) : (
        <>
          <Share2 className="w-3 h-3" />
          {!iconOnly && "SHARE"}
        </>
      )}
    </button>
  );
}
