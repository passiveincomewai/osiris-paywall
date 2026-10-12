"use client";
// Caption Generator: POSTs to the Studio captions API, which writes from
// verified WorldEye features with the caller's real referral link + disclosure.
import { useState } from "react";
import Link from "next/link";
import { CopyButton, SectionTitle } from "@/components/affiliate/ui";

const PLATFORMS = ["Instagram", "TikTok", "X", "Facebook", "YouTube", "LinkedIn", "Pinterest"];
const STYLES = ["Viral", "Professional", "Funny", "Educational", "Storytelling", "Curiosity", "Direct response"];
const FEATURES = ["Live globe", "Cameras", "Recording", "Flights", "Weather & quakes", "OSINT toolkit", "Premium"];

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const selectCls =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60";
const labelCls = "block text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors disabled:opacity-50";

export default function CaptionsClient() {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [feature, setFeature] = useState(FEATURES[0]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const generate = async () => {
    setGenerating(true);
    setError("");
    setNotice("");
    setSavedIndexes(new Set());
    try {
      const r = await fetch("/api/affiliate/studio/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, style, feature }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof j.error === "string" ? j.error : "Couldn't generate captions. Try again.");
        setCaptions([]);
      } else {
        setCaptions(Array.isArray(j.captions) ? (j.captions as string[]) : []);
        if (!Array.isArray(j.captions) || j.captions.length === 0) {
          setError("No captions came back — try a different combination.");
        }
      }
    } catch {
      setError("Couldn't generate captions. Try again.");
    }
    setGenerating(false);
  };

  const save = async (index: number) => {
    setSavingIndex(index);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/affiliate/studio/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, style, feature, save: true, saveIndex: index }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof j.error === "string" ? j.error : "Couldn't save that caption.");
      } else {
        // If the API returned a fresh set with the save, keep the shown set stable.
        if (Array.isArray(j.captions) && (j.captions as string[]).length === captions.length) {
          setCaptions(j.captions as string[]);
        }
        setSavedIndexes((prev) => new Set(prev).add(index));
        setNotice("Caption saved to My Creations.");
      }
    } catch {
      setError("Couldn't save that caption.");
    }
    setSavingIndex(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Caption Generator</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Three ready-to-post captions per run — copy one as-is, or save it to My Creations for later.
        </p>
      </div>

      <div className={card}>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cap-platform" className={labelCls}>Platform</label>
            <select id="cap-platform" className={selectCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-style" className={labelCls}>Style</label>
            <select id="cap-style" className={selectCls} value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-feature" className={labelCls}>Feature</label>
            <select id="cap-feature" className={selectCls} value={feature} onChange={(e) => setFeature(e.target.value)}>
              {FEATURES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button onClick={() => void generate()} disabled={generating} className={btnPrimary} style={btnStyle}>
            {generating ? "Generating…" : "Generate 3 captions"}
          </button>
          <Link href="/affiliates/studio/creations" className="text-sm font-mono text-cyan-300 hover:text-cyan-200">
            View saved captions →
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          Written from verified WorldEye features with your real referral link and affiliate disclosure.
          Instagram captions follow the house rule: CTA first, exactly 5 hashtags.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200" role="status">
          {notice}{" "}
          <Link href="/affiliates/studio/creations" className="underline font-bold">Open My Creations</Link>
        </div>
      )}

      {captions.length > 0 && (
        <section>
          <SectionTitle kicker={`${platform} · ${style} · ${feature}`} title="Your captions" />
          <div className="grid lg:grid-cols-3 gap-4">
            {captions.map((caption, i) => (
              <div key={i} className={card + " flex flex-col"}>
                <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-3">
                  Caption {i + 1}
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed flex-1">
                  {caption}
                </pre>
                <div className="flex flex-wrap gap-2 mt-4">
                  <CopyButton text={caption} label="Copy" />
                  <button
                    onClick={() => void save(i)}
                    disabled={savingIndex === i || savedIndexes.has(i)}
                    className={btnGhost}
                  >
                    {savedIndexes.has(i) ? "✓ Saved" : savingIndex === i ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
