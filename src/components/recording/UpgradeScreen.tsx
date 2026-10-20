"use client";
import TrialPicker from "@/components/TrialPicker";

/** Locked-feature preview for non-Pro users (spec §14 copy). */
export default function UpgradeScreen({ priceLine }: { priceLine: string }) {
  const cards = [
    ["▣", "Up to 20 recording cameras", "Build your personal monitoring wall."],
    ["●", "Live multi-camera monitoring", "Watch saved cameras side by side."],
    ["◷", "Timeline playback", "Replay your saved clips anytime."],
    ["⤓", "Downloadable recordings", "Clips save straight to your device."],
    ["◈", "Recording schedules", "Capture the moments that matter."],
    ["🔒", "Secure footage management", "Your clips stay on your device."],
  ];
  return (
    <div className="text-center py-10">
      <div className="inline-block px-3 py-1 rounded-full border border-cyan-400/40 text-cyan-300 text-[11px] font-mono tracking-[0.25em] mb-5">
        PREMIUM FEATURE
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
        TURN LIVE CAMERAS INTO<br />
        <span className="text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(135deg,#38bdf8,#0096FF 45%,#c084fc)" }}>
          YOUR PERSONAL RECORDING NETWORK
        </span>
      </h1>
      <p className="mt-5 max-w-2xl mx-auto text-slate-300 leading-relaxed">
        Record, organize, and replay footage from up to 20 compatible cameras with WorldEye Premium.
      </p>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
        {cards.map(([icon, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-2xl">{icon}</div>
            <div className="mt-2 text-white font-bold text-sm">{t}</div>
            <div className="mt-1 text-xs text-slate-400">{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 max-w-md mx-auto text-left">
        <TrialPicker />
        <div className="mt-3 text-sm text-slate-400 font-mono text-center">{priceLine}</div>
      </div>
      <p className="mt-6 text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
        Recording captures the live stream playing in your browser and saves clips to this device.
        Compatible stream sources only — YouTube embeds and snapshot feeds can't be recorded.
      </p>
    </div>
  );
}
