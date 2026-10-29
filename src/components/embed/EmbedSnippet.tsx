"use client";

/**
 * The copy box for one embeddable camera: an iframe snippet (built by
 * the pure lib/embed/public builder, so every surface shows the
 * identical string), a size picker, copy-to-clipboard, and — on the
 * picker page — an on-demand live preview.
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  buildEmbedSnippet,
  DEFAULT_EMBED_SIZE,
  EMBED_SIZE_PRESETS,
} from "@/lib/embed/snippet";

export default function EmbedSnippet({
  cameraId,
  name,
  embedUrl,
  showPreview = true,
}: {
  cameraId: string;
  name: string;
  embedUrl: string;
  showPreview?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [sizeId, setSizeId] = useState(DEFAULT_EMBED_SIZE);
  const snippet = buildEmbedSnippet({ embedUrl, name, sizeId });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (permissions): the text is selectable below */
    }
  };

  return (
    <div className="mt-3">
      {/* Wrap on small screens: the select sizes to its longest option
          ("Responsive — fills its container") and, with the copy button,
          is wider than a phone-width card — in a nowrap row the button
          was pushed past the card edge and clipped. On mobile the code
          box drops to its own full-width row; from sm up the row is the
          original single line (code flexes between select and button,
          so the button's ml-auto absorbs nothing there). */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`embed-size-${cameraId}`}>
          Embed size
        </label>
        <select
          id={`embed-size-${cameraId}`}
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          className="shrink min-w-0 max-w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-[11px] text-white/80 outline-none focus:border-[#D4AF37]/50 cursor-pointer"
        >
          {EMBED_SIZE_PRESETS.map((p) => (
            <option key={p.id} value={p.id} className="bg-neutral-900">
              {p.label}
            </option>
          ))}
        </select>
        <code className="order-3 w-full min-w-0 truncate rounded-lg bg-black/50 border border-white/10 px-2.5 py-2 text-[10px] text-white/60 sm:order-none sm:w-auto sm:flex-1">
          {snippet}
        </code>
        <button
          type="button"
          onClick={copy}
          className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-2 text-[11px] font-bold text-black hover:brightness-110 transition cursor-pointer sm:ml-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy embed"}
        </button>
      </div>
      {showPreview && (
        <>
          <button
            type="button"
            onClick={() => setShowLivePreview((s) => !s)}
            className="mt-2 text-[11px] font-semibold text-[#D4AF37] hover:underline cursor-pointer"
          >
            {showLivePreview ? "Hide preview" : "Preview"}
          </button>
          {showLivePreview && (
            <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black">
              <iframe
                src={`/embed/camera/${encodeURIComponent(cameraId)}`}
                className="w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
                title={`${name} — embed preview`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
