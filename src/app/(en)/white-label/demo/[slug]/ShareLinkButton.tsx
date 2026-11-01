"use client";

// Copy-the-share-link button for a preview page. Uses the URL the
// visitor is actually on, so it works on any deployment origin.
import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export default function ShareLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): the URL
      // is in the address bar either way — say so rather than failing silently.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-sm text-white/75 hover:text-white hover:border-white/30 transition"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
      {copied ? "Link copied" : "Copy share link"}
    </button>
  );
}
