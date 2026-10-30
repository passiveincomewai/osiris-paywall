"use client";
import { ExternalLink } from "lucide-react";
import { CopyButton, SectionTitle } from "@/components/affiliate/ui";
import { VIDEO_STYLES } from "@/lib/affiliate/video-styles";

/* ------------------------------------------------------------------ */
/* VideoStylesLab — format breakdowns of real creator videos.          */
/*                                                                     */
/* Analysis only: hook / structure / pacing / text / CTA, derived      */
/* from each video's published chapter list + description. The         */
/* originals are linked, never embedded, downloaded, or rehosted —     */
/* and each card's prompt package recreates the FORMAT with original   */
/* WorldEye content, never the creator's footage, audio, or words.     */
/* No view counts are shown: they were not verifiable from the         */
/* public pages when this was built (checked 2026-10-30).              */
/* ------------------------------------------------------------------ */

export default function VideoStylesLab({ withLink }: { withLink: (s: string) => string }) {
  return (
    <section>
      <SectionTitle kicker="Study & recreate" title="Video styles lab"
        right={<span className="text-xs font-mono text-slate-500">format analysis only — never reuse footage or audio</span>} />
      <div className="grid md:grid-cols-3 gap-4">
        {VIDEO_STYLES.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 flex flex-col">
            <div className="text-[11px] font-mono tracking-[0.2em] text-cyan-400 uppercase mb-1">{s.name}</div>
            <div className="text-sm font-bold text-white leading-snug">{s.sourceTitle}</div>
            <div className="text-xs text-slate-500 mt-1">{s.creator}</div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">{s.formatNote}</div>
            <a href={s.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-mono font-bold text-cyan-300 hover:text-cyan-200 transition-colors">
              Watch the original <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="mt-4 space-y-3 text-sm leading-relaxed flex-1">
              <div>
                <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mb-1">Hook</div>
                <p className="text-slate-300">{s.hook}</p>
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mb-1">Structure</div>
                <ul className="space-y-1.5">
                  {s.structure.map((step, i) => (
                    <li key={i} className="text-slate-300 flex gap-2">
                      <span className="font-mono text-xs text-cyan-400 mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mb-1">Pacing</div>
                <p className="text-slate-300">{s.pacing}</p>
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mb-1">Text & description</div>
                <p className="text-slate-300">{s.onScreenText}</p>
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mb-1">CTA</div>
                <p className="text-slate-300">{s.cta}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-500 mb-2">
                Paste this brief into your AI assistant to recreate the format with your own WorldEye footage:
              </p>
              <CopyButton text={withLink(s.promptPackage)} label="Copy recreation prompt" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
