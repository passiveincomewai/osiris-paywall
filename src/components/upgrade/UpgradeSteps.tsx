"use client";

/**
 * The upgrade popup's steps 1–3 (host + step 4 live in sibling files):
 *   step 1 — choose a plan (three radio rows, Yearly/Monthly toggle);
 *   step 2 — one row expanded in place with its full feature list;
 *   step 3 — the compare table.
 * Copy is Jameson's spec verbatim (2026-11-09); layout, spacing and
 * colors follow his mockups (0-corner-promo / 1-choose-pro-yearly /
 * 2-features-pro-expanded). Prices are the locked display facts from
 * lib/upgrade-popup — checkout never reads them.
 *
 * The header mosaic and corner strip use the repo's REAL product
 * captures (/landing/*.jpg — actual WorldEye screens, the same source
 * the old TimedTrialPopup banner used). The catalogue's live frames
 * are third-party feed URLs with no first-party snapshot strip to draw
 * from, so per the spec's own fallback the mosaic is built from these
 * captures, re-ordered on every open. No camera is ever named.
 */

import { Fragment } from "react";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  Bookmark,
  Bot,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  History,
  LayoutGrid,
  Mail,
  MonitorPlay,
  Newspaper,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  CAMERA_COUNT_LABEL,
  UPGRADE_PLANS,
  UPGRADE_TIERS,
  type UpgradeInterval,
  type UpgradeSelection,
  type UpgradeTier,
} from "@/lib/upgrade-popup";

/** Real WorldEye captures for the mosaic / corner strip. */
export const MOSAIC_CAPTURES = [
  "/landing/camera-viewer.jpg",
  "/landing/features-globe.jpg",
  "/landing/track-flights.jpg",
  "/landing/hazard-weather.jpg",
  "/landing/osint-maritime.jpg",
  "/landing/northern-lights.jpg",
  "/landing/oi-assist.jpg",
];

export function rotatedCaptures(seed: number, count: number): string[] {
  const n = MOSAIC_CAPTURES.length;
  const start = ((seed % n) + n) % n;
  return Array.from({ length: count }, (_, i) => MOSAIC_CAPTURES[(start + i) % n]);
}

// ── Feature lists (step 2) ──────────────────────────────────────────

export interface UpgradeFeature {
  icon: LucideIcon;
  title: string;
  sub: string;
}

export const PLAN_FEATURES: Record<UpgradeTier, { heading: string; features: UpgradeFeature[] }> = {
  lite: {
    heading: "What you get",
    features: [
      { icon: Video, title: "Every camera, unlimited", sub: `All ${CAMERA_COUNT_LABEL} live feeds` },
      { icon: Bot, title: "OI AI analyst", sub: "Built in, nothing to set up" },
      { icon: Car, title: "Traffic & premium layers", sub: "Modeled traffic on the globe" },
      { icon: Search, title: "Advanced search filters", sub: "Country, type, live feeds" },
      { icon: Clapperboard, title: "Recording Studio", sub: "5 cameras at once" },
      { icon: MonitorPlay, title: "Ambient Mode", sub: "Slow-TV player included" },
    ],
  },
  pro: {
    heading: "Everything in Lite, plus",
    features: [
      { icon: Terminal, title: "OSINT toolkit", sub: "DNS, WHOIS, SSL, port scans" },
      { icon: Bell, title: "Camera alerts", sub: "2 cameras, emailed with a photo" },
      { icon: Clapperboard, title: "Recording Studio", sub: "20 cameras at once" },
      { icon: Route, title: "Flight paths", sub: "For any aircraft you follow" },
    ],
  },
  ultra: {
    heading: "Everything in Pro, plus",
    features: [
      { icon: ShieldAlert, title: "Cyber threat feed", sub: "Malware, botnets, outages" },
      { icon: Anchor, title: "Maritime & conflict intel", sub: "Ships, ports, conflict zones" },
      { icon: Newspaper, title: "Live news + GDELT events", sub: "On the globe, as it breaks" },
      { icon: History, title: "Camera timelapse", sub: "Capture and export the film" },
      { icon: BellRing, title: "10 camera alerts", sub: "Up from 2 on Pro" },
      { icon: Zap, title: "Event alerts", sub: "Quakes, launches, ISS passes" },
      { icon: Mail, title: "Personal brief", sub: "Your morning intel email" },
      { icon: Bookmark, title: "25 saved views", sub: "Restore any globe setup" },
      { icon: Clapperboard, title: "Recording Studio", sub: "40 cameras at once" },
    ],
  },
};

/** The three preview icons on each plan row (step 1). */
export const PLAN_ROW_ICONS: Record<UpgradeTier, LucideIcon[]> = {
  lite: [Camera, Sparkles, Clapperboard],
  pro: [Terminal, Bell, Route],
  ultra: [ShieldAlert, Anchor, Newspaper],
};

// ── Step 1 header mosaic ────────────────────────────────────────────

export function UpgradeMosaic({ seed }: { seed: number }) {
  const tiles = rotatedCaptures(seed, 5);
  return (
    <div className="relative h-[196px] shrink-0 overflow-hidden">
      <div className="absolute inset-0 flex">
        {tiles.map((src, i) => (
          <div key={`${src}-${i}`} className="relative h-full flex-1 overflow-hidden">
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full scale-105 object-cover blur-[1.5px] brightness-[0.55]"
            />
            {(i === 0 || i === 3) && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Scanlines + fade into the modal body. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#101216]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-[#34D399] px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] text-black shadow-[0_4px_24px_rgba(52,211,153,0.45)]">
          10 DAYS FREE · ANY PLAN
        </span>
        <h2 className="mt-3.5 text-[26px] font-extrabold leading-tight tracking-tight text-white sm:text-[30px]">
          The whole planet, unlocked
        </h2>
        <p className="mt-1.5 text-[13px] text-white/75">
          {CAMERA_COUNT_LABEL} cameras · AI analyst · OSINT · intel feeds
        </p>
      </div>
    </div>
  );
}

// ── Step 1: choose a plan ───────────────────────────────────────────

export interface StepChooseProps {
  selection: UpgradeSelection;
  expanded: UpgradeTier | null;
  onSelect: (plan: UpgradeTier) => void;
  onInterval: (interval: UpgradeInterval) => void;
  onToggleFeatures: (plan: UpgradeTier) => void;
  onStart: () => void;
  onCompare: () => void;
}

export function StepChoose({
  selection,
  expanded,
  onSelect,
  onInterval,
  onToggleFeatures,
  onStart,
  onCompare,
}: StepChooseProps) {
  const facts = UPGRADE_PLANS[selection.plan];
  const yearly = selection.interval === "annual";
  return (
    <div className="px-5 pb-6 sm:px-7">
      <h3 className="text-[24px] font-extrabold leading-snug tracking-tight text-white sm:text-[28px]">
        See everything.{" "}
        <span className="bg-gradient-to-r from-white to-[#F6D77A] bg-clip-text text-transparent">
          Pick your plan.
        </span>
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
        Every paid plan unlocks all {CAMERA_COUNT_LABEL} cameras and the AI analyst. Start free,
        cancel anytime.
      </p>

      {/* Billing toggle + save pill; free-trial note on desktop. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div
          className="flex rounded-xl border border-white/12 bg-white/[0.04] p-1"
          role="group"
          aria-label="Billing period"
        >
          {(["annual", "monthly"] as UpgradeInterval[]).map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => onInterval(iv)}
              aria-pressed={selection.interval === iv}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                selection.interval === iv
                  ? "bg-white/[0.14] text-white shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {iv === "annual" ? "Yearly" : "Monthly"}
            </button>
          ))}
        </div>
        {yearly && (
          <span className="rounded-full bg-[#34D399] px-3 py-1 text-xs font-bold text-black">
            Save up to 58%
          </span>
        )}
        <span className="ml-auto hidden items-center gap-2 text-[13px] text-[#7EE2B8] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          10 days free on every plan
        </span>
      </div>

      {/* Plan rows (radio group, arrow keys move the selection). */}
      <div
        className="mt-4 flex flex-col gap-3"
        role="radiogroup"
        aria-label="Choose a plan"
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const idx = UPGRADE_TIERS.indexOf(selection.plan);
          const next =
            e.key === "ArrowDown"
              ? UPGRADE_TIERS[(idx + 1) % UPGRADE_TIERS.length]
              : UPGRADE_TIERS[(idx + UPGRADE_TIERS.length - 1) % UPGRADE_TIERS.length];
          onSelect(next);
          requestAnimationFrame(() => {
            document
              .querySelector<HTMLElement>(`[data-plan-row="${next}"]`)
              ?.focus();
          });
        }}
      >
        {UPGRADE_TIERS.map((tier) => (
          <PlanRow
            key={tier}
            tier={tier}
            selection={selection}
            expanded={expanded === tier}
            onSelect={() => onSelect(tier)}
            onToggleFeatures={() => onToggleFeatures(tier)}
          />
        ))}
      </div>

      {/* Actions. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStart}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold text-black transition hover:brightness-110 active:scale-[0.99]"
          style={{
            background: `linear-gradient(180deg, ${facts.color}, ${facts.color}CC)`,
            boxShadow: `0 10px 36px ${facts.color}55`,
          }}
        >
          Start {facts.name} free for 10 days
          <ArrowRight className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onCompare}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 text-[15px] font-semibold text-white transition hover:bg-white/[0.08]"
        >
          <LayoutGrid className="h-4.5 w-4.5" />
          View all plans
        </button>
      </div>

      {/* Fine print. */}
      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12.5px] text-white/55">
        {["$0 today", "Reminder before billing", "Cancel in 1 click", "7-day refund"].map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#34D399]" />
            {t}
          </span>
        ))}
      </p>
      {!yearly && (
        <p className="mt-3 text-center text-[13px] font-medium text-[#F6D77A]">
          Switch to yearly and save {facts.savePct}% on {facts.name}: {facts.yearlyEquivalent}
          /mo instead of {facts.monthlyPrice}/mo.{" "}
          <button
            type="button"
            onClick={() => onInterval("annual")}
            className="font-bold underline underline-offset-2 hover:brightness-125"
          >
            Switch to yearly
          </button>
        </p>
      )}
    </div>
  );
}

function PlanRow({
  tier,
  selection,
  expanded,
  onSelect,
  onToggleFeatures,
}: {
  tier: UpgradeTier;
  selection: UpgradeSelection;
  expanded: boolean;
  onSelect: () => void;
  onToggleFeatures: () => void;
}) {
  const facts = UPGRADE_PLANS[tier];
  const selected = selection.plan === tier;
  const yearly = selection.interval === "annual";
  const icons = PLAN_ROW_ICONS[tier];
  const featureSet = PLAN_FEATURES[tier];
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-plan-row={tier}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer rounded-2xl border p-4 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/60 sm:px-5"
      style={{
        borderColor: selected ? facts.color : "rgba(255,255,255,0.10)",
        background: selected
          ? `linear-gradient(180deg, ${facts.color}17, ${facts.color}08 55%, rgba(255,255,255,0.02))`
          : "rgba(255,255,255,0.02)",
        boxShadow: selected ? `0 0 0 1px ${facts.color}66, 0 8px 32px ${facts.color}22` : undefined,
      }}
    >
      <div className="flex items-center gap-3.5">
        {/* Radio */}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
          style={{ borderColor: selected ? facts.color : "rgba(255,255,255,0.25)" }}
          aria-hidden
        >
          {selected && (
            <span className="h-3 w-3 rounded-full" style={{ background: facts.color }} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-bold text-white">{facts.name}</span>
            {facts.popular && (
              <span className="rounded-md bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-black">
                MOST POPULAR
              </span>
            )}
          </div>
          <p className="text-[13px] text-white/50">{facts.tagline}</p>
          {/* Preview icons + features link. On mobile only the selected
              row shows its icons (spec); the link always shows. */}
          <div
            className={`mt-2 items-center gap-2 ${selected ? "flex" : "hidden"} sm:flex`}
          >
            {icons.map((Icon, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `${facts.color}55`,
                  background: `${facts.color}14`,
                  color: facts.color,
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFeatures();
              }}
              aria-expanded={expanded}
              className="ml-1 flex items-center gap-1 text-[13px] font-semibold transition hover:brightness-125"
              style={{ color: facts.color }}
            >
              <span className="hidden sm:inline">{expanded ? "Hide features" : "See all features"}</span>
              <span className="sm:hidden">{expanded ? "Hide" : "Features"}</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {/* Price block */}
        <div className="shrink-0 text-right">
          {yearly ? (
            <>
              <p className="text-[12px] text-white/40 line-through">{facts.monthlyPrice}/mo</p>
              <p className="text-[26px] font-extrabold leading-none text-white">
                {facts.yearlyEquivalent}
                <span className="text-[13px] font-semibold text-white/50">/mo</span>
              </p>
              <p className="mt-1 text-[12px] text-white/45">{facts.yearlyTotal} billed yearly</p>
            </>
          ) : (
            <>
              <p className="text-[26px] font-extrabold leading-none text-white">
                {facts.monthlyPrice}
                <span className="text-[13px] font-semibold text-white/50">/mo</span>
              </p>
              <p className="mt-1 text-[12px] text-white/45">Billed monthly</p>
            </>
          )}
        </div>
      </div>

      {/* Step 2: expanded features. */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="my-4 border-t border-dashed border-white/15" />
          <p
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: facts.color }}
          >
            {featureSet.heading}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {featureSet.features.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    borderColor: `${facts.color}55`,
                    background: `${facts.color}14`,
                    color: facts.color,
                  }}
                >
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold leading-tight text-white">
                    {f.title}
                  </span>
                  <span className="block text-[12px] leading-tight text-white/45">{f.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: compare ─────────────────────────────────────────────────

type CompareCell = true | false | string;

interface CompareRow {
  icon: LucideIcon;
  label: string;
  cells: [CompareCell, CompareCell, CompareCell];
}

const COMPARE_GROUPS: { heading: string; rows: CompareRow[] }[] = [
  {
    heading: "Every paid plan",
    rows: [
      { icon: Video, label: "Unlimited cameras", cells: [true, true, true] },
      { icon: Bot, label: "OI AI analyst", cells: [true, true, true] },
      { icon: Car, label: "Traffic & premium layers", cells: [true, true, true] },
      { icon: Search, label: "Advanced search filters", cells: [true, true, true] },
      { icon: Clapperboard, label: "Recording Studio", cells: ["5", "20", "40"] },
      { icon: MonitorPlay, label: "Ambient Mode", cells: [true, true, true] },
    ],
  },
  {
    heading: "Pro and up",
    rows: [
      { icon: Terminal, label: "OSINT toolkit", cells: [false, true, true] },
      { icon: Bell, label: "Camera alerts", cells: [false, "2", "10"] },
      { icon: Route, label: "Flight paths", cells: [false, true, true] },
    ],
  },
  {
    heading: "Ultra only",
    rows: [
      { icon: ShieldAlert, label: "Cyber threat feed", cells: [false, false, true] },
      { icon: Anchor, label: "Maritime & conflict intel", cells: [false, false, true] },
      { icon: Newspaper, label: "Live news + GDELT", cells: [false, false, true] },
      { icon: History, label: "Camera timelapse", cells: [false, false, true] },
      { icon: Zap, label: "Event alerts", cells: [false, false, true] },
      { icon: Mail, label: "Personal brief", cells: [false, false, true] },
      { icon: Bookmark, label: "Saved views", cells: [false, false, "25"] },
    ],
  },
];

export function StepCompare({
  selection,
  onBack,
  onChoose,
}: {
  selection: UpgradeSelection;
  onBack: () => void;
  onChoose: (plan: UpgradeTier) => void;
}) {
  const yearly = selection.interval === "annual";
  return (
    <div className="px-5 pb-6 pt-5 sm:px-7">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <a
          href="/pricing"
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm font-semibold text-white/70 transition hover:text-white sm:block"
        >
          Open full pricing page ↗
        </a>
      </div>

      <h3 className="mt-4 text-[24px] font-extrabold tracking-tight text-white">Compare plans</h3>
      <p className="mt-1 text-[13.5px] text-white/55">
        Every plan includes 10 days free and 1-click cancellation.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-3.5 py-3 sm:px-4" aria-label="Feature" />
              {UPGRADE_TIERS.map((tier) => {
                const f = UPGRADE_PLANS[tier];
                const selected = selection.plan === tier;
                return (
                  <th
                    key={tier}
                    className="px-2 py-3 text-center sm:px-3"
                    style={selected ? { background: `${f.color}14` } : undefined}
                  >
                    <span className="block text-[15px] font-bold" style={{ color: f.color }}>
                      {f.name}
                    </span>
                    <span className="block text-[12px] font-medium text-white/50">
                      {yearly ? `${f.yearlyEquivalent}/mo` : `${f.monthlyPrice}/mo`}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARE_GROUPS.map((group) => (
              <Fragment key={group.heading}>
                <tr>
                  <td
                    colSpan={4}
                    className="bg-white/[0.02] px-3.5 pb-1.5 pt-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/40 sm:px-4"
                  >
                    {group.heading}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-3.5 py-2.5 sm:px-4">
                      <span className="flex items-center gap-2.5 text-[13px] font-medium text-white/85">
                        <row.icon className="h-4 w-4 shrink-0 text-white/40" />
                        <span className="hidden sm:inline">{row.label}</span>
                        <span className="sm:hidden">{row.label}</span>
                      </span>
                    </td>
                    {row.cells.map((cell, i) => {
                      const tier = UPGRADE_TIERS[i];
                      const f = UPGRADE_PLANS[tier];
                      const selected = selection.plan === tier;
                      return (
                        <td
                          key={tier}
                          className="px-2 py-2.5 text-center sm:px-3"
                          style={selected ? { background: `${f.color}0D` } : undefined}
                        >
                          {cell === true ? (
                            <Check className="mx-auto h-4.5 w-4.5" style={{ color: f.color }} />
                          ) : cell === false ? (
                            <span className="text-white/25">—</span>
                          ) : (
                            <span className="text-[13.5px] font-bold text-white">{cell}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/[0.02]">
              <td className="px-3.5 py-3.5 sm:px-4" />
              {UPGRADE_TIERS.map((tier) => {
                const f = UPGRADE_PLANS[tier];
                return (
                  <td key={tier} className="px-2 py-3.5 text-center sm:px-3">
                    <button
                      type="button"
                      onClick={() => onChoose(tier)}
                      className="w-full rounded-xl px-2 py-2.5 text-[13px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
                      style={{ background: `linear-gradient(180deg, ${f.color}, ${f.color}CC)` }}
                    >
                      <span className="hidden sm:inline">Choose {f.name}</span>
                      <span className="sm:hidden">Pick</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
