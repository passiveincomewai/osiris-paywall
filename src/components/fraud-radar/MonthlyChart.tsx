/**
 * Fraud Radar — monthly payments chart (dependency-free SVG).
 *
 * Renders the two labelled monetary treatments of the same series:
 * solid cyan bars = excl. flagged outlier cells (the headline), pale
 * outline bars behind = all reported cells. The two are identical for
 * almost every month (all 62 flagged cells sit in the unattributed
 * bucket), so the outline usually hides behind the solid bar — when
 * they differ, the difference is visible rather than averaged away.
 * A null month renders as a gap: absence is not zero.
 */
import { formatUsd, ymLabel } from "@/lib/fraud-radar/healthcare-data";

export interface MonthlyChartProps {
  months: number[]; // yyyymm, ascending
  paidExclOutliersUsd: (number | null)[];
  paidAllCellsUsd: (number | null)[];
  height?: number;
}

export default function MonthlyChart({
  months,
  paidExclOutliersUsd,
  paidAllCellsUsd,
  height = 180,
}: MonthlyChartProps) {
  const width = 960;
  const padTop = 18;
  const padBottom = 22;
  const padX = 4;
  const plotH = height - padTop - padBottom;
  const max = Math.max(
    1,
    ...paidAllCellsUsd.map((v) => v ?? 0),
    ...paidExclOutliersUsd.map((v) => v ?? 0),
  );
  const n = months.length;
  const step = (width - padX * 2) / Math.max(1, n);
  const barW = Math.max(1, Math.min(14, step * 0.72));
  const first = months[0];
  const last = months[months.length - 1];
  const peakIdx = paidExclOutliersUsd.indexOf(
    Math.max(...paidExclOutliersUsd.map((v) => v ?? -Infinity)),
  );

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Monthly reported payments from ${first ? ymLabel(first) : ""} to ${last ? ymLabel(last) : ""}. Peak month ${peakIdx >= 0 && months[peakIdx] ? ymLabel(months[peakIdx]) : ""}: ${formatUsd(paidExclOutliersUsd[peakIdx] ?? null)} excluding flagged outliers.`}
      >
        <line
          x1={padX} x2={width - padX} y1={padTop + plotH} y2={padTop + plotH}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1"
        />
        {months.map((ym, i) => {
          const excl = paidExclOutliersUsd[i];
          const all = paidAllCellsUsd[i];
          const x = padX + i * step + (step - barW) / 2;
          const hAll = all === null ? 0 : (all / max) * plotH;
          const hExcl = excl === null ? 0 : (excl / max) * plotH;
          return (
            <g key={ym}>
              {all !== null && (
                <rect
                  x={x} y={padTop + plotH - hAll} width={barW} height={hAll}
                  fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1"
                >
                  <title>{`${ymLabel(ym)} — all reported cells: ${formatUsd(all)}`}</title>
                </rect>
              )}
              {excl !== null && (
                <rect
                  x={x} y={padTop + plotH - hExcl} width={barW} height={hExcl}
                  fill="rgba(34,211,238,0.75)"
                >
                  <title>{`${ymLabel(ym)} — excl. flagged outliers: ${formatUsd(excl)}`}</title>
                </rect>
              )}
            </g>
          );
        })}
        {first !== undefined && (
          <text x={padX} y={height - 6} fill="rgba(255,255,255,0.45)" fontSize="11">
            {ymLabel(first)}
          </text>
        )}
        {last !== undefined && (
          <text x={width - padX} y={height - 6} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="11">
            {ymLabel(last)}
          </text>
        )}
        <text x={padX} y={12} fill="rgba(255,255,255,0.45)" fontSize="11">
          {`max ${formatUsd(max)}`}
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
        <span><span className="inline-block h-2 w-3 bg-cyan-400/75 align-middle" /> Excluding flagged outlier cells (headline)</span>
        <span><span className="inline-block h-2 w-3 border border-white/45 align-middle" /> All reported cells</span>
        <span>Gaps are months the source did not report — not zero.</span>
      </figcaption>
    </figure>
  );
}
