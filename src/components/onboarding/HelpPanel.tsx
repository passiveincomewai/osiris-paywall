"use client";

/**
 * §5 — Persistent help: an unobtrusive "?" button in the globe interface
 * and the panel it opens. Available to ALL A/B groups and returning
 * visitors; any guide or the full tour can be (re)started from here
 * without a refresh. "WorldEye Documentation" from the original spec is
 * the "Help & FAQ" link — /docs was removed on the owner's order.
 *
 * Reskin (2026-10-26): the panel wears the owner's "HELP & TUTORIALS"
 * board design — neon frame, book/play medallion header, full-width
 * icon-chip rows with one-line descriptions and chevron chips. Pure
 * presentation: rows still render from HELP_ENTRIES in entry order and
 * every row fires the exact handler it always did (onStartTour /
 * onMicro / plain href navigation); the wrapper's position, size,
 * scroll and z-index contract is unchanged.
 */

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  BookOpen,
  Cctv,
  ChevronRight,
  Clock,
  Cpu,
  Crown,
  ExternalLink,
  Globe,
  HelpCircle,
  Keyboard,
  Layers,
  Plane,
  Play,
  X,
} from "lucide-react";
import { HELP_ENTRIES, type HelpEntry } from "@/lib/onboarding/steps";

/* ── Idle tutorial nudge (owner's order, 2026-10-29) ─────────────────
 * After ~3 minutes with NO interaction the help button grows a
 * "Click here for a tutorial" pill. Hard rules:
 *   - at most once per session (sessionStorage), and never again for a
 *     visitor who has EVER opened the tutorials (localStorage flag set
 *     by the button's own click and by OnboardingRoot's startTour);
 *   - it never stacks over a modal dialog (CheckoutSheet & friends are
 *     aria-modal): a fire that finds one open defers and re-checks;
 *   - the pill is a sibling of the fixed button, absolutely anchored to
 *     the button's known slot, so it shifts no layout anywhere.
 * Like every proactive onboarding surface it is enabled for group B
 * only (group A is the no-proactive-UI control — see events.ts);
 * OnboardingRoot passes nudgeEnabled accordingly. */
export const HELP_OPENED_KEY = "we_onb_help_opened";
const NUDGE_SHOWN_KEY = "we_onb_nudge_shown";
export const HELP_NUDGE_IDLE_MS = 180_000;
const NUDGE_MODAL_DEFER_MS = 30_000;

export function markHelpOpened(): void {
  try {
    localStorage.setItem(HELP_OPENED_KEY, "1");
  } catch {
    /* private mode — the nudge simply may re-offer next session */
  }
}

function helpEverOpened(): boolean {
  try {
    return localStorage.getItem(HELP_OPENED_KEY) === "1";
  } catch {
    return false;
  }
}

function nudgeShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(NUDGE_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markNudgeShown(): void {
  try {
    sessionStorage.setItem(NUDGE_SHOWN_KEY, "1");
  } catch {
    /* private mode — the in-memory ref still caps it for this mount */
  }
}

export function HelpButton({
  isMobile,
  onClick,
  nudgeEnabled = false,
}: {
  isMobile: boolean;
  onClick: () => void;
  nudgeEnabled?: boolean;
}) {
  const [nudge, setNudge] = useState(false);
  const nudgeShownRef = useRef(false);

  useEffect(() => {
    if (!nudgeEnabled) return;
    if (helpEverOpened() || nudgeShownThisSession()) return;
    let timer: number | null = null;
    let lastReset = 0;
    const arm = (delay: number) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(fire, delay);
    };
    const fire = () => {
      // The visitor found the tutorials by another path meanwhile, or a
      // modal (checkout) is up: never stack — defer while a modal lasts;
      // its own clicks/keypresses count as activity and re-arm anyway.
      if (helpEverOpened() || nudgeShownRef.current) return;
      if (document.querySelector('[aria-modal="true"]')) {
        arm(NUDGE_MODAL_DEFER_MS);
        return;
      }
      nudgeShownRef.current = true;
      markNudgeShown();
      setNudge(true);
    };
    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return; // throttled reset (mousemove fires constantly)
      lastReset = now;
      if (!nudgeShownRef.current) arm(HELP_NUDGE_IDLE_MS);
    };
    const passive: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", onActivity, passive);
    window.addEventListener("mousemove", onActivity, passive);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, passive);
    window.addEventListener("wheel", onActivity, passive);
    window.addEventListener("scroll", onActivity, passive);
    arm(HELP_NUDGE_IDLE_MS);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("scroll", onActivity);
    };
  }, [nudgeEnabled]);

  const handleOpen = useCallback(() => {
    markHelpOpened();
    setNudge(false);
    onClick();
  }, [onClick]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Help and tutorials"
        title="Help & tutorials"
        className="flex items-center justify-center rounded-full hover:shadow-[0_0_14px_rgba(0,229,255,0.35)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        style={
          isMobile
            ? {
                position: "fixed",
                right: 12,
                bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
                width: 38,
                height: 38,
                zIndex: 940,
              }
            : {
                position: "fixed",
                right: 16,
                bottom: 52,
                width: 38,
                height: 38,
                zIndex: 940,
              }
        }
      >
        {/* The owner's medallion artwork (book + play over the globe),
            keyed to a transparent PNG — replaces the "?" glyph. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/help-medallion.png"
          alt=""
          width={512}
          height={512}
          draggable={false}
          className="h-full w-full rounded-full select-none pointer-events-none"
        />
      </button>
      {nudge && (
        <div
          className="onb-nudge fixed flex items-center gap-0.5 rounded-full border border-amber-300/60 bg-[#0a1424]/95 py-1 pl-3 pr-1 backdrop-blur-sm"
          style={
            isMobile
              ? {
                  right: 58,
                  bottom: "calc(70px + env(safe-area-inset-bottom, 0px))",
                  zIndex: 940,
                }
              : { right: 62, bottom: 58, zIndex: 940 }
          }
          role="group"
          aria-label="Tutorial suggestion"
        >
          <button
            type="button"
            onClick={handleOpen}
            className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-amber-200 transition-colors hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
          >
            Click here for a tutorial
          </button>
          <button
            type="button"
            onClick={() => setNudge(false)}
            aria-label="Dismiss tutorial suggestion"
            className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-amber-200/60 transition-colors hover:bg-white/10 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </>
  );
}

/* ── Row presentation (design layer only) ─────────────────────────────
 * Keyed by the entry's own identity (tour / microId / href) so the rows
 * stay data-driven from HELP_ENTRIES: a new entry without a presentation
 * entry here still renders, with its own label and a generic icon. */
interface RowPresentation {
  icon: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  desc: string;
  gold?: boolean;
}

const ROW_PRESENTATION: Record<string, RowPresentation> = {
  tour: {
    icon: Play,
    title: "Take the Full Tour",
    desc: "A complete walkthrough of all features",
  },
  navigate: {
    icon: Globe,
    title: "How to Navigate the Globe",
    desc: "Zoom, rotate, search and explore",
  },
  "cameras-guide": {
    icon: Cctv,
    title: "Live Camera Guide",
    desc: "Find, view and save live camera feeds",
  },
  "tracking-guide": {
    icon: Plane,
    title: "Flight & Satellite Tracking",
    desc: "Track aircraft, satellites and space objects",
  },
  "layers-guide": {
    icon: Layers,
    title: "Intelligence Layers",
    desc: "Explore all layers and what they show",
  },
  "oi-guide": {
    icon: Cpu,
    title: "AI Guide",
    desc: "Use WorldEye AI for real-time insights",
  },
  shortcuts: {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    desc: "Speed up your workflow",
  },
  "/faq": {
    icon: HelpCircle,
    title: "Help & FAQ",
    desc: "Get answers to common questions",
  },
  "/pricing": {
    icon: Crown,
    title: "Compare Free vs. Pro",
    desc: "See all features and benefits",
    gold: true,
  },
};

function presentationFor(e: HelpEntry): RowPresentation {
  const key = e.kind === "tour" ? "tour" : e.kind === "micro" ? e.microId : e.href;
  return ROW_PRESENTATION[key] ?? { icon: HelpCircle, title: e.label, desc: "" };
}

/** Decorative scenic wash on a row's right edge (CSS only, no imagery). */
function ScenicWash({ gold }: { gold?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 w-24"
      style={{
        background: gold
          ? "radial-gradient(ellipse 90% 120% at 100% 50%, rgba(245,197,66,0.16), rgba(245,197,66,0.04) 55%, transparent 75%)"
          : "radial-gradient(ellipse 90% 120% at 100% 50%, rgba(56,189,248,0.17), rgba(37,99,235,0.05) 55%, transparent 75%)",
      }}
    />
  );
}

function RowBody({ e }: { e: HelpEntry }) {
  const p = presentationFor(e);
  const Icon = p.icon;
  const isLink = e.kind === "link";
  return (
    <>
      <ScenicWash gold={p.gold} />
      <span
        className={`relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border ${
          p.gold
            ? "border-amber-300/50 shadow-[0_0_12px_rgba(245,197,66,0.25),inset_0_0_10px_rgba(245,197,66,0.12)]"
            : "border-sky-300/45 shadow-[0_0_12px_rgba(56,189,248,0.22),inset_0_0_10px_rgba(56,189,248,0.10)]"
        }`}
        style={{
          background: p.gold
            ? "radial-gradient(circle at 50% 35%, rgba(245,197,66,0.20), rgba(10,20,38,0.65) 75%)"
            : "radial-gradient(circle at 50% 35%, rgba(56,189,248,0.22), rgba(4,18,36,0.65) 75%)",
        }}
      >
        <Icon size={19} className={p.gold ? "text-amber-300" : "text-sky-300"} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight text-white">
          {p.title}
        </span>
        {p.desc && (
          <span className="mt-0.5 block truncate text-[10.5px] leading-snug text-sky-100/50">
            {p.desc}
          </span>
        )}
      </span>
      {e.kind === "tour" && (
        <span className="relative flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.08em] text-cyan-200">
          <Clock size={9} />
          ~1 MIN
        </span>
      )}
      <span className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-sky-300/30 bg-sky-400/[0.06] transition-colors group-hover:border-sky-300/60">
        {isLink ? (
          <ExternalLink size={13} className="text-sky-200/80" />
        ) : (
          <ChevronRight size={14} className="text-sky-200/80" />
        )}
      </span>
    </>
  );
}

export default function HelpPanel({
  isMobile,
  onClose,
  onStartTour,
  onMicro,
}: {
  isMobile: boolean;
  onClose: () => void;
  onStartTour: () => void;
  onMicro: (microId: string) => void;
}) {
  return (
    <div
      className="onb-anim-in"
      style={
        isMobile
          ? {
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              zIndex: 965,
              maxHeight: "62vh",
              overflowY: "auto",
            }
          : { position: "fixed", right: 16, bottom: 100, width: 300, zIndex: 965, maxHeight: "70vh", overflowY: "auto" }
      }
      role="dialog"
      aria-label="Help and tutorials"
    >
      <div
        className="overflow-hidden rounded-2xl border border-sky-400/45"
        style={{
          background: "linear-gradient(180deg, #071a30 0%, #04101f 55%, #020a17 100%)",
          boxShadow:
            "0 14px 44px rgba(0,0,0,0.7), 0 0 22px rgba(0,150,255,0.28), 0 0 4px rgba(56,189,248,0.35), inset 0 0 28px rgba(0,120,255,0.07)",
        }}
      >
        {/* Header — medallion, title, close (earth glow is pure CSS). */}
        <div className="relative overflow-hidden px-3.5 pb-3 pt-3.5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.38) 0%, rgba(14,116,233,0.14) 45%, transparent 70%)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(34,211,238,0.20) 0%, transparent 65%)",
            }}
          />
          <div className="relative flex items-start gap-3">
            <span
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/50"
              style={{
                background:
                  "radial-gradient(circle at 50% 32%, rgba(34,211,238,0.30), rgba(3,20,40,0.8) 78%)",
                boxShadow:
                  "0 0 18px rgba(34,211,238,0.35), inset 0 0 12px rgba(34,211,238,0.18)",
              }}
              aria-hidden="true"
            >
              <BookOpen size={23} className="text-cyan-300" />
              <Play
                size={10}
                className="absolute fill-cyan-100 text-cyan-100"
                style={{ marginTop: 3 }}
              />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[15px] font-extrabold leading-tight tracking-[0.04em] text-white">
                HELP &amp;{" "}
                <span
                  className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent"
                >
                  TUTORIALS
                </span>
              </div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-sky-100/55">
                Learn how to get the most out of WorldEye
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close help"
              className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-sky-300/40 bg-sky-400/[0.07] text-sky-100/80 transition-all hover:border-sky-300/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Rows — data-driven from HELP_ENTRIES, in entry order. */}
        <div className="flex flex-col gap-1.5 px-2.5 pb-3">
          {HELP_ENTRIES.map((e) => {
            const cls =
              "group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-sky-400/25 px-2.5 py-2.5 text-left transition-all hover:border-sky-300/60 hover:shadow-[0_0_14px_rgba(56,189,248,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";
            const rowStyle = {
              background:
                "linear-gradient(90deg, rgba(8,47,73,0.55) 0%, rgba(3,16,32,0.45) 60%, rgba(2,10,22,0.3) 100%)",
            } as const;
            if (e.kind === "tour") {
              return (
                <button key={e.label} type="button" className={cls} style={rowStyle} onClick={onStartTour}>
                  <RowBody e={e} />
                </button>
              );
            }
            if (e.kind === "micro") {
              return (
                <button key={e.label} type="button" className={cls} style={rowStyle} onClick={() => onMicro(e.microId)}>
                  <RowBody e={e} />
                </button>
              );
            }
            return (
              <a key={e.label} className={cls} style={rowStyle} href={e.href}>
                <RowBody e={e} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
