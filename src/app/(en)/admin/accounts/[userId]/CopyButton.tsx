"use client";

// Tiny copy-to-clipboard button for the account detail page (email,
// account ID, Stripe IDs). Client-side nicety only — no API change;
// the values it copies are already rendered on the page by the server.
import { useState } from "react";

export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browser / non-secure context fallback.
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* value stays selectable on the page itself */
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={label ? `Copy ${label}` : "Copy"}
      className="ml-2 align-middle inline-flex items-center px-1.5 py-0.5 rounded border border-white/15 text-[11px] text-white/45 hover:text-white hover:border-white/30 transition"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
