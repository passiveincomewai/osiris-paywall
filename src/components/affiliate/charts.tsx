"use client";
// Minimal SVG charts — no charting dependency.
export function AreaChart({ data, height = 180, color = "#0096FF" }: {
  data: { date: string; cents: number }[]; height?: number; color?: string;
}) {
  const W = 720, H = height, P = 8;
  const max = Math.max(1, ...data.map((d) => d.cents));
  const step = data.length > 1 ? (W - P * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [P + i * step, H - P - (d.cents / max) * (H - P * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(W - P).toFixed(1)},${H - P} L${P},${H - P} Z`;
  const gid = `g${Math.abs(hash(line))}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} opacity={data[i].cents > 0 ? 1 : 0} />
      ))}
    </svg>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function Donut({ segments, size = 150 }: {
  segments: { label: string; value: number; color: string }[]; size?: number;
}) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="16" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const el = (
            <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
              strokeDashoffset={(-acc * C).toFixed(1)}
              transform="rotate(-90 70 70)" strokeLinecap="butt" />
          );
          acc += frac;
          return el;
        })}
        <text x="70" y="70" textAnchor="middle" dy="6" fill="#fff" fontSize="20" fontWeight="bold" fontFamily="monospace">
          {segments.length}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="font-mono font-bold text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
