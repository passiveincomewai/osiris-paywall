/**
 * StatBand — data figures as a band, not prose (Phase 2, STAGED).
 * Every figure passed here must be a verified product fact at render time
 * (e.g. the camera count is exactly 74,229 — never round it, never let a
 * stale figure in). If a figure cannot be verified, omit the stat.
 */
import MicroLabel from "./MicroLabel";

export type WeStat = {
  value: string;
  label: string;
  sub?: string;
};

export default function StatBand({ stats }: { stats: WeStat[] }) {
  return (
    <dl
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0,1fr))`,
        borderTop: "1px solid var(--we-line-2)",
        borderBottom: "1px solid var(--we-line-2)",
      }}
      data-we-statband
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            padding: "var(--we-space-5) var(--we-space-4)",
            borderLeft: "1px solid var(--we-line-1)",
          }}
        >
          <dd
            className="font-[family-name:var(--we-font-display)]"
            style={{
              color: "var(--we-text-1)",
              fontSize: "clamp(1.9rem, 3.4vw, 2.75rem)",
              lineHeight: 1.05,
              fontWeight: 560,
              margin: 0,
            }}
          >
            {s.value}
          </dd>
          <dt style={{ marginTop: "var(--we-space-2)" }}>
            <MicroLabel>{s.label}</MicroLabel>
          </dt>
          {s.sub ? (
            <p
              className="font-[family-name:var(--we-font-mono)]"
              style={{
                color: "var(--we-text-1)",
                opacity: 0.75,
                fontSize: "var(--we-size-data)",
                letterSpacing: "var(--we-tracking-data)",
                marginTop: "var(--we-space-1)",
              }}
            >
              {s.sub}
            </p>
          ) : null}
        </div>
      ))}
      <style>{`
        @media (max-width: 767px) {
          [data-we-statband] { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }
      `}</style>
    </dl>
  );
}
