// The owner's Start-Free-Trial artwork as a real button.
// The graphic carries the label; the button supplies the behavior — a
// slow pulsing neon glow, a periodic shine sweep and a hover nudge,
// all in globals.css (.trial-btn). Two artworks exist because the
// plans carry two trial lengths (lib/billing/trials is the source of
// truth): public/start-trial-button-3day.png ("Start 3-Day Free
// Trial", the Weekly plan) and public/start-trial-button.png
// ("Start 10-Day Free Trial", every other trial plan). The 3-day
// artwork is a pixel-faithful edit of the owner's 10-day original —
// same frame, bolt, arrow and lettering, only the digit differs.
// Callers pass `days` from the plan's real trial length; the default
// stays 10 so an unclassified caller can never promise 3.
export default function TrialButton({
  label,
  onClick,
  className,
  days = 10,
  disabled = false,
}: {
  /** Accessible name — the plan's CTA copy, e.g. "Start 10-Day Free Trial". */
  label: string;
  onClick: () => void;
  className?: string;
  /** The plan's trial length — picks the matching artwork. */
  days?: 3 | 10;
  disabled?: boolean;
}) {
  const three = days === 3;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`trial-btn ${disabled ? "opacity-60 pointer-events-none" : ""} ${className ?? ""}`}
    >
      <span className="trial-btn-shine">
        <img
          src={three ? "/start-trial-button-3day.png" : "/start-trial-button.png"}
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
