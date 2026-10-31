import { Lock, Play } from "lucide-react";

/**
 * Truthful preview block for a Pro-gated RECON tool's public landing page.
 *
 * This is deliberately NOT a working form: the input is inert display, the
 * only action is the link into the app, and the sample output underneath is
 * stamped as an example. It mirrors the OiPreview honesty pattern — show the
 * real shape of the tool, never a fake run. Sample values passed in must be
 * plausible illustrations of the output format, labelled as such.
 */
export default function ReconExample({
  targetLabel,
  placeholder,
  exampleTitle,
  rows,
  footnote,
}: {
  targetLabel: string;
  placeholder: string;
  exampleTitle: string;
  rows: { label: string; value: string }[];
  footnote: string;
}) {
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/60">{targetLabel}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-[#D4AF37]">
          <Lock className="h-3 w-3" /> PREVIEW — WORLDEYE PRO
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div
          aria-hidden="true"
          className="flex-1 select-none rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white/35"
        >
          {placeholder}
        </div>
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a]"
        >
          <Play className="h-4 w-4" /> Open in WorldEye
        </a>
      </div>

      <div className="mt-6 border-t border-dashed border-white/15 pt-4">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#FFB020]">
          EXAMPLE RESULT — FORMAT ONLY, NOT A LIVE CHECK
        </p>
        <p className="mt-1 text-sm font-medium text-white/80">{exampleTitle}</p>
        <dl className="mt-3 space-y-1.5 font-mono text-[13px]">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">{r.label}</dt>
              <dd className="text-white/85">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-white/45">{footnote}</p>
      </div>
    </div>
  );
}
