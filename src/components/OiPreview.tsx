'use client';

/**
 * OI preview — what a viewer without a Pro tier sees when they click
 * the OI tool button (owner's order, 2026-10-29: "make it so users can
 * click the oi tool button and see what it does, with the same button
 * and embed checkout to upgrade"). Before this, the click dead-ended
 * on a trial-picker dialog without ever showing the tool.
 *
 * The preview mirrors the real panel's docked chrome (OiPanel): the
 * OI header, the REAL ModeSwitch (Assist / Forecast), a disabled
 * composer, and one sample exchange per mode, clearly labelled
 * EXAMPLE. It is deliberately NOT the real panel in a locked mode:
 * OI's clients (the run engine, the assist conversation) live in the
 * Dashboard and start working — and calling the Pro-gated /api/oi
 * routes — the moment they mount, so a "locked" real panel would fire
 * requests that 402. This component makes no network calls at all;
 * the sample content is static illustration, never live output.
 *
 * The upgrade treatment is the same one the recon menu carries: the
 * shared ProUpgradeEmbed (Layers board / Search & Route), whose CTA
 * opens the shared CheckoutSheet in place. Entitled viewers never see
 * this component — Dashboard opens the real OiPanel for them exactly
 * as before, and if entitlement lands while the desktop preview is
 * open (e.g. the checkout inside the embed completes), Dashboard
 * swaps the preview for the real panel.
 */
import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { IconButton, OiMark } from './oi/atoms';
import { ModeSwitch, modeTint, type OiMode } from './oi/ModeSwitch';
import ProUpgradeEmbed from './ProUpgradeEmbed';

const ASSIST_POINTS = [
  'Works the map for you: flies to a place, switches layers, finds what is live, marks it and puts it on screen',
  'Starts forecasts straight from the conversation',
  'Runs on WorldEye AI — the site\u2019s own key, nothing of yours to set up',
];

const FORECAST_POINTS = [
  'Set up a question and watch the actors play it out in parallel worlds',
  'Read the prediction, then question the actors about why they acted',
  'Full workspace: the research graph, every world on a timeline, every object in tables',
];

export default function OiPreview({
  embedded = false,
  onClose,
}: {
  /** Inside the phone drawer: no frame of its own (the drawer titles it). */
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [mode, setMode] = useState<OiMode>('assist');
  const assisting = mode === 'assist';
  const points = assisting ? ASSIST_POINTS : FORECAST_POINTS;

  const header = !embedded && (
    <header className="flex items-center gap-2.5 h-[52px] pl-4 pr-2.5 border-b border-[var(--border-secondary)] bg-black/30">
      <OiMark size={18} assist={assisting} />
      <span className="hud-text text-[12px] text-[var(--text-heading)]">OI</span>
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-[#FFC400]/60 bg-[#FFC400]/10 text-[#FFC400] text-[8px] font-mono font-bold tracking-[0.14em]">
        PRO
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        {onClose && (
          <IconButton title="Close" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </IconButton>
        )}
      </div>
    </header>
  );

  const body = (
    <div className={`flex flex-col gap-3 ${embedded ? '' : 'px-4 py-3 overflow-y-auto styled-scrollbar'}`}>
      <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
        {assisting
          ? 'Talk to OI and it works the map for you — the AI assistant built into the globe.'
          : 'The prediction engine: ask a question about the future and watch it play out.'}
      </p>

      {/* One sample exchange per mode — static illustration of the
          interaction, labelled as an example; never live output. */}
      <div className="rounded-lg border border-[var(--border-secondary)] bg-black/25 p-3 flex flex-col gap-2">
        <span className="self-start text-[8.5px] font-mono font-bold tracking-[0.16em] text-[var(--text-muted)] border border-[var(--border-secondary)] rounded-full px-1.5 py-0.5">
          EXAMPLE
        </span>
        {assisting ? (
          <>
            <div className="self-end max-w-[85%] rounded-lg rounded-br-sm bg-[var(--cyan-primary)]/15 border border-[var(--cyan-primary)]/25 px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--text-primary)]">
              Fly to Rotterdam and show me the live cameras near the port.
            </div>
            <div className="self-start max-w-[85%] rounded-lg rounded-bl-sm bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--text-secondary)]">
              On it — globe moved to Rotterdam, the port cameras are on screen and the anchored ships in view are marked.
            </div>
          </>
        ) : (
          <>
            <div className="self-end max-w-[85%] rounded-lg rounded-br-sm bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--text-primary)]">
              Will this hurricane make landfall in Florida?
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
              OI casts the actors — forecasters, officials, insurers, residents — plays the
              situation out across parallel worlds, and returns a prediction with the
              reasoning behind it. Open any actor and ask why it acted the way it did.
            </p>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-[11.5px] leading-snug text-[var(--text-secondary)]">
            <span className="mt-[7px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: modeTint(mode)(0.9) }} aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {/* The real composer's shape, disabled: the tool is visible, the
          gate is honest, and the upgrade sits directly under it. */}
      <div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-secondary)] bg-black/30 px-3 py-2.5 opacity-80">
          <Lock className="w-3.5 h-3.5 text-[#FFC400] flex-shrink-0" />
          <input
            disabled
            placeholder={assisting ? 'Ask OI to work the map…' : 'Ask a forecast question…'}
            className="flex-1 min-w-0 bg-transparent text-[12px] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            aria-label="OI input (locked — WorldEye Pro feature)"
          />
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-muted)]">
          OI is a WorldEye Pro feature. Start a free trial to use it — the panel opens right here.
        </p>
      </div>

      <ProUpgradeEmbed premiumLabels={['OI AI Assistant']} />
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col">
        <div className="pb-3">
          <ModeSwitch id="preview-m" mode={mode} onMode={setMode} />
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="glass-panel oi-glass relative overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      {/* The mode thread along the top edge, same as the real panel. */}
      <span
        className="absolute inset-x-0 top-0 h-px z-10 transition-[background] duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${modeTint(mode)(0.75)} 30%, ${modeTint(mode)(0.75)} 70%, transparent)` }}
        aria-hidden
      />
      {header}
      <div className="px-3 py-2.5 border-b border-[var(--border-secondary)]">
        <ModeSwitch id="preview-d" mode={mode} onMode={setMode} />
      </div>
      {body}
    </div>
  );
}
