"use client";
import { useState } from "react";
import { Check, ChevronRight, RefreshCw } from "lucide-react";
import { CopyButton } from "@/components/affiliate/ui";
import type { CaptionTemplate, EmailTemplate, ScriptTemplate } from "@/lib/affiliate/templates";
import {
  ANGLE_LABELS,
  TONE_LABELS,
  applyInstruction,
  assembleCaption,
  assembleEmail,
  assembleScriptBeats,
  type Angle,
  type ReviseOptions,
  type Tone,
} from "@/lib/affiliate/template-revise";

/* ------------------------------------------------------------------ */
/* TemplateCard — one copy template (caption / email / script) with    */
/* its revision tools. Revisions are DETERMINISTIC and rules-based     */
/* (template-revise.ts) — not AI, and the section header says so:      */
/* tone swaps the hook/subject, angle swaps the feature block,         */
/* "shorter" drops the optional block, Refresh cycles variants, and    */
/* typed instructions are mapped onto those same controls by a small   */
/* keyword rule set that reports exactly what it changed.              */
/*                                                                     */
/* Used/posted state lives server-side (AffiliateTemplateUsage via     */
/* /api/affiliate/resources/usage) and is passed in by the parent.      */
/* ------------------------------------------------------------------ */

export interface UsageState {
  usedAt: string | null;
  postedAt: string | null;
}

type AnyTemplate = CaptionTemplate | EmailTemplate | ScriptTemplate;

interface Props {
  template: AnyTemplate;
  usage?: UsageState;
  onToggleUsage: (kind: AnyTemplate["kind"], id: string, patch: { used?: boolean; posted?: boolean }) => void;
  withLink: (s: string) => string;
}

const TONES = Object.keys(TONE_LABELS) as Tone[];
const ANGLES = Object.keys(ANGLE_LABELS) as Angle[];

function chip(active: boolean): string {
  return `px-3 py-1.5 rounded-lg text-sm font-mono border transition-all ${
    active
      ? "border-cyan-400/60 text-cyan-300 bg-cyan-400/10"
      : "border-white/15 text-slate-400 hover:bg-white/5"
  }`;
}

export default function TemplateCard({ template: t, usage, onToggleUsage, withLink }: Props) {
  const [opts, setOpts] = useState<ReviseOptions>({});
  const [instruction, setInstruction] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isCaption = t.kind === "caption";
  const title =
    t.kind === "caption" ? t.platform : t.kind === "script" ? t.title : null;
  const color = t.kind === "email" ? "#fbbf24" : t.color;

  let header: React.ReactNode;
  let body: React.ReactNode;
  let copyText: string;

  if (t.kind === "caption") {
    const text = assembleCaption(t, opts);
    copyText = withLink(text);
    header = <span className="text-sm font-bold" style={{ color }}>{title}</span>;
    body = (
      <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{withLink(text)}</pre>
    );
  } else if (t.kind === "email") {
    const { subject, body: emailBody } = assembleEmail(t, opts);
    copyText = withLink(`Subject: ${subject}\n\n${emailBody}`);
    header = (
      <span className="text-sm font-bold text-white truncate">Subject: {subject}</span>
    );
    body = (
      <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
        {withLink(emailBody)}
      </pre>
    );
  } else {
    const beats = assembleScriptBeats(t, opts);
    copyText = beats.map((b) => `${b.label}: ${b.text}`).join("\n");
    header = <span className="text-sm font-bold text-white">{title}</span>;
    body = (
      <ul className="space-y-2">
        {beats.map((b, i) => (
          <li key={i} className="text-sm text-slate-300 leading-relaxed">
            <ChevronRight className="inline-block w-3.5 h-3.5 text-cyan-400 mr-1.5 align-[-2px]" strokeWidth={2.5} />
            <span className="font-mono text-xs text-slate-500 mr-1.5">{b.label}:</span>
            {b.text}
          </li>
        ))}
      </ul>
    );
  }

  const applyTyped = () => {
    if (!instruction.trim()) return;
    const r = applyInstruction(instruction, opts);
    setOpts(r.options);
    setFeedback(r.applied.length ? `Applied: ${r.applied.join(" · ")}` : (r.note ?? null));
    setInstruction("");
  };

  const used = Boolean(usage?.usedAt);
  const posted = Boolean(usage?.postedAt);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-3">
        {header}
        <CopyButton text={copyText} label={t.kind === "email" ? "Copy email" : t.kind === "script" ? "Copy script" : "Copy caption"} />
      </div>

      <div className="flex-1">{body}</div>

      {/* Revision controls */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mr-1">Tone</span>
            {TONES.map((tone) => (
              <button
                key={tone}
                onClick={() => setOpts((o) => ({ ...o, tone: o.tone === tone ? undefined : tone }))}
                className={chip(opts.tone === tone)}
              >
                {TONE_LABELS[tone]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mr-1">Angle</span>
            {ANGLES.map((angle) => (
              <button
                key={angle}
                onClick={() => setOpts((o) => ({ ...o, angle: o.angle === angle ? undefined : angle }))}
                className={chip(opts.angle === angle)}
              >
                {ANGLE_LABELS[angle]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setOpts((o) => ({ ...o, short: !o.short }))} className={chip(Boolean(opts.short))}>
            Shorter
          </button>
          {isCaption && (
            <button onClick={() => setOpts((o) => ({ ...o, hashtags: !o.hashtags }))} className={chip(Boolean(opts.hashtags))}>
              Hashtags
            </button>
          )}
          <button onClick={() => setOpts((o) => ({ ...o, stripEmoji: !o.stripEmoji }))} className={chip(Boolean(opts.stripEmoji))}>
            No emojis
          </button>
          <button
            onClick={() => setOpts((o) => ({ ...o, variant: (o.variant ?? 0) + 1 }))}
            className="px-3 py-1.5 rounded-lg text-sm font-mono border border-white/15 text-slate-300 hover:bg-white/5 transition-all inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh variation
          </button>
          {(opts.tone || opts.angle || opts.short || opts.hashtags || opts.stripEmoji || opts.variant) && (
            <button
              onClick={() => { setOpts({}); setFeedback(null); }}
              className="px-3 py-1.5 rounded-lg text-sm font-mono text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyTyped(); }}
            placeholder='Describe a change — "make it funnier", "focus on flights"…'
            className="flex-1 min-w-0 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50"
          />
          <button
            onClick={applyTyped}
            className="px-4 py-2 rounded-lg font-mono text-sm font-bold border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors shrink-0"
          >
            Apply
          </button>
        </div>
        {feedback && <p className="text-xs text-slate-500">{feedback}</p>}

        {/* Used / posted bookkeeping */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => onToggleUsage(t.kind, t.id, { used: !used })}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-all inline-flex items-center gap-1.5 ${
              used
                ? "border-emerald-400/60 text-emerald-300 bg-emerald-400/10"
                : "border-white/15 text-slate-400 hover:bg-white/5"
            }`}
          >
            {used && <Check className="w-3.5 h-3.5" strokeWidth={3} />} {used ? "Used" : "Mark as used"}
          </button>
          <button
            onClick={() => onToggleUsage(t.kind, t.id, { posted: !posted })}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-all inline-flex items-center gap-1.5 ${
              posted
                ? "border-emerald-400/60 text-emerald-300 bg-emerald-400/10"
                : "border-white/15 text-slate-400 hover:bg-white/5"
            }`}
          >
            {posted && <Check className="w-3.5 h-3.5" strokeWidth={3} />} {posted ? "Posted" : "Mark as posted"}
          </button>
        </div>
      </div>
    </div>
  );
}
