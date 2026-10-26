// The owner's Start-10-Day-Free-Trial artwork as a real button.
// The graphic (public/start-trial-button.png, keyed transparent from his
// upload) carries the label; the button supplies the behavior — a slow
// pulsing neon glow, a periodic shine sweep and a hover nudge, all in
// globals.css (.trial-btn). Used wherever a plan CTA starts an embedded
// checkout: /pricing's plan card and the TrialCtaSection plan cards.
export default function TrialButton({
  label,
  onClick,
  className,
}: {
  /** Accessible name — the plan's CTA copy, e.g. "Start 10-Day Free Trial". */
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`trial-btn ${className ?? ""}`}
    >
      <span className="trial-btn-shine">
        <img
          src="/start-trial-button.png"
          alt=""
          width={1155}
          height={172}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </span>
    </button>
  );
}
