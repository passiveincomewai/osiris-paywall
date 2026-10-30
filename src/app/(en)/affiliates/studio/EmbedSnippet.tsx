"use client";
// Embed action: copy-ready HTML for the public embed image endpoint
// (src/lib/studio/embed.ts). The embed renders the template's DEFAULT
// text with the affiliate's referral link + QR baked in — personal
// edits are never part of an embed, and the panel says so.
import { useMemo, useState } from "react";
import { embedHtml, embedImageUrl } from "@/lib/studio/embed";

const btnGhost =
  "inline-flex items-center justify-center px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors disabled:opacity-50";

export default function EmbedSnippet({
  code,
  link,
  slug,
  title,
  width,
  height,
  collapsible = false,
}: {
  code: string;
  link: string;
  slug: string;
  title: string;
  width: number;
  height: number;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    let origin = "https://worldeye.app";
    try {
      origin = new URL(link).origin;
    } catch {
      /* keep the production origin */
    }
    return embedHtml({
      link,
      imageUrl: embedImageUrl(origin, code, slug),
      width,
      height,
      alt: `WorldEye — ${title}`,
    });
  }, [code, link, slug, title, width, height]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the snippet stays selectable */
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhost + " w-full"} aria-expanded={false}>
        &lt;/&gt; Embed
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase">
          Embed HTML · {width} × {height}
        </div>
        {collapsible && (
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-mono text-slate-400 hover:text-white"
            aria-expanded={true}
          >
            Hide
          </button>
        )}
      </div>
      <code className="block w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-cyan-200 break-all">
        {html}
      </code>
      <button onClick={copy} className={btnGhost + " w-full mt-2"}>
        {copied ? "Copied ✓" : "Copy embed code"}
      </button>
      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Paste it into any site or blog. It always shows this template&apos;s default text with your referral
        link and QR code baked in — edits you make in Quick Edit aren&apos;t included.
      </p>
    </div>
  );
}
