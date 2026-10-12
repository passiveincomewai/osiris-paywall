import Link from "next/link";
import { recordingAccess } from "@/lib/recording/access";
import { db } from "@/lib/db";
import UpgradeScreen from "@/components/recording/UpgradeScreen";
import StorageMeter from "@/components/recording/StorageMeter";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5">
      <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-3xl font-black font-mono" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export default async function RecordingOverview() {
  const a = await recordingAccess();
  if (!a.ok) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white">Sign in to use the recording studio</h1>
        <Link href="/api/auth/signin?callbackUrl=/recording"
          className="inline-block mt-6 px-8 py-3 rounded-2xl font-mono font-bold text-[#04121f]"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
          Sign in
        </Link>
      </div>
    );
  }
  if (!a.pro) return <UpgradeScreen priceLine="WorldEye Pro · Monthly $9.99 · Annual $59.99 — cancel anytime" />;

  const [camCount, clipAgg, recent] = await Promise.all([
    db.savedCamera.count({ where: { userId: a.userId } }),
    db.clipMeta.aggregate({
      where: { userId: a.userId },
      _sum: { durationSec: true, sizeBytes: true },
      _count: true,
    }),
    db.clipMeta.findMany({ where: { userId: a.userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const clipCount = clipAgg._count;
  const clipSecs = clipAgg._sum.durationSec ?? 0;
  const clipBytes = clipAgg._sum.sizeBytes ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Command center</div>
        <h1 className="text-3xl font-bold text-white">Recording overview</h1>
        <p className="text-sm text-slate-400 mt-1">Clips are captured live in your browser and stored on this device.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Saved cameras" value={String(camCount)} sub="in your monitoring wall" accent="#38bdf8" />
        <Stat label="Clips recorded" value={String(clipCount)} sub="this account" accent="#22d3ee" />
        <Stat label="Footage" value={clipSecs >= 3600 ? `${(clipSecs / 3600).toFixed(1)}h` : `${Math.round(clipSecs / 60)}m`} sub="total recorded" accent="#818cf8" />
        <Stat label="Clip storage" value={fmtBytes(clipBytes)} sub="metadata-tracked" accent="#c084fc" />
      </div>

      <StorageMeter />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-3">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            <Link href="/recording/cameras" className="px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-[#04121f]"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
              ＋ Save a camera
            </Link>
            <Link href="/recording/live" className="px-4 py-2.5 rounded-xl text-sm font-mono border border-white/20 text-slate-200 hover:bg-white/5">
              ● Open live wall
            </Link>
            <Link href="/recording/clips" className="px-4 py-2.5 rounded-xl text-sm font-mono border border-white/20 text-slate-200 hover:bg-white/5">
              ▸ Browse clips
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            Tip: open any camera on the main globe, tap <span className="text-slate-300 font-mono">Save camera</span> in
            the viewer, and it lands here ready to record.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-3">Recent clips</div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No clips yet — hit <span className="text-red-300 font-mono">● REC</span> on any live camera.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-white truncate">{c.cameraName}</span>
                  <span className="font-mono text-xs text-slate-400 whitespace-nowrap ml-3">
                    {Math.floor(c.durationSec / 60)}:{String(c.durationSec % 60).padStart(2, "0")} · {fmtBytes(c.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
