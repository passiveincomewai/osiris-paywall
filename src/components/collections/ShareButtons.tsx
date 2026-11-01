"use client";

/**
 * Share actions for a public collection link: copy-to-clipboard
 * always; the native share sheet where the platform offers one
 * (navigator.share — mainly mobile). Used by the dashboard manager
 * and the public collection page.
 */
import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export default function ShareButtons({
  url,
  title,
  compact = false,
}: {
  /** Absolute URL to share. */
  url: string;
  title: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (permissions) — the URL is visible on the page */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user dismissed the sheet */
    }
  };

  const cls = compact
    ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 hover:text-white transition"
    : "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono border border-white/20 text-slate-100 hover:border-cyan-400/60 hover:text-white transition";

  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <button type="button" onClick={copy} className={cls}>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {canShare && (
        <button type="button" onClick={share} className={cls}>
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      )}
    </span>
  );
}
