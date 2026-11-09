"use client";

/**
 * The conversion popup system's conductor (rules: lib/popups/manager;
 * faces: components/popups/popups). Mounted once in RootShell.
 *
 * It gathers context — session identity, visit days, camera signals
 * (lib/popups/signals), the recording store's last completion, scroll
 * and exit behaviour — evaluates eligibility once a second, and lets
 * lib/popups/manager.arbitrate pick the single winner. Claiming is
 * immediate and total: session claim + generic cross-system claim +
 * 7-day frequency stamp + popup_shown, all before the face renders.
 *
 * Coordination with the other prompt surfaces:
 *  - the camera ladder / checkout sheet / TrialPrompt welcome modal:
 *    any [role="dialog"] in the DOM defers every popup here;
 *  - the post-newsletter Google popup + the PWA install bar: the
 *    shared session claim (worldeye.popupClaimed) silences this
 *    manager for the session, and this manager's claim silences them;
 *  - UpgradeCornerPromo / ShareAwayPrompt (docked cards, not dialogs)
 *    may sit under a modal's backdrop — the same relationship the
 *    ladder prompt already has with them.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "../AnalyticsTracker";
import { readSessionIdentity, type SessionIdentity } from "@/lib/premium-entitlement";
import { buildCameraShareUrl, readLastCamera } from "@/lib/camera-share";
import { browserLadderStorage, readLadderRecord } from "@/lib/camera-ladder";
import { useLastCompletedCapture } from "@/lib/recording/sessions";
import {
  POPUP_AFFILIATE_DISMISSED_KEY,
  POPUP_AFFILIATE_SHOWN_KEY,
  POPUP_EVENT_DETAIL,
  POPUP_SUBSCRIBED_SESSION_KEY,
  POPUP_TRIAL_ENDING_SHOWN_KEY,
  POPUP_TRIAL_WAITING_SHOWN_KEY,
  applyCameraVisit,
  applyVisitDay,
  arbitrate,
  browserLocalStorage,
  browserSessionStorage,
  claimSession,
  dayKey,
  habitualCameras,
  markShown,
  readCameraVisits,
  readFreqRecord,
  readSessionClaim,
  readVisitsRecord,
  stripLocalePrefix,
  writeCameraVisits,
  writeVisitsRecord,
  type PopupId,
  type VisitOutcome,
} from "@/lib/popups/manager";
import {
  TOOL_COMPLETION_BENEFITS,
  onCameraState,
  onPopupClaimed,
  onToolComplete,
  signalPopupClaimed,
} from "@/lib/popups/signals";
import {
  AffiliateInvitePopup,
  EndOfArticlePopup,
  EngagedWatcherPopup,
  HappeningNowToast,
  ShareViewPopup,
  ToolCompletionPopup,
  TrialEndingPopup,
  TrialWaitingPopup,
  WelcomeBackPopup,
  YourCameraPopup,
  PricingSavePopup,
} from "./popups";

interface ActivePopup {
  id: PopupId;
  story?: { title: string; url: string };
  lastCamera?: { name: string | null; url: string } | null;
  engagedVariant?: "anonymous" | "verify";
  habitualName?: string | null;
  alreadySubscribed?: boolean;
  signedIn?: boolean;
  share?: { url: string; name: string | null };
  toolBenefit?: string;
  trialEnding?: {
    planName: string | null;
    daysLeft: number;
    cameraOpens: number;
    savedCameras: number;
  };
}

const ARTICLE_PATH = /^\/(blog|compare)\/.+/;

export default function PopupManager() {
  const pathname = usePathname() ?? "/";
  const [active, setActive] = useState<ActivePopup | null>(null);
  const completed = useLastCompletedCapture();

  const mountAt = useRef(Date.now());
  const pageStartAt = useRef(Date.now());
  const identityRef = useRef<SessionIdentity | null>(null);
  const identityReadAt = useRef(0);
  const visitsRef = useRef<VisitOutcome | null>(null);
  const opensRef = useRef(0);
  const currentCamRef = useRef<{ key: string; name: string | null; since: number } | null>(null);
  const habitualRef = useRef<{ key: string; name: string | null } | null>(null);
  const shareCaptureRef = useRef<{ url: string; name: string | null } | null>(null);
  const toolRef = useRef<string | null>(null);
  const storyRef = useRef<{ title: string; url: string } | null>(null);
  const storyFetchedRef = useRef(false);
  const twRef = useRef<{ eligible: boolean; userKey: string } | null>(null);
  const twFetchedRef = useRef(false);
  const teRef = useRef<{
    eligible: boolean;
    userKey: string;
    trialEndMs: number;
    daysLeft: number;
    planName: string | null;
    cameraOpens: number;
    savedCameras: number;
  } | null>(null);
  const teFetchedRef = useRef(false);
  const affRef = useRef<{ eligible: boolean; userKey: string } | null>(null);
  const affFetchedRef = useRef(false);
  const exitIntentRef = useRef(false);
  const pricingAgedRef = useRef(false);
  const pricingPatternRef = useRef(false);
  const scrollRef = useRef({ max: 0, wentDown: false });
  const activeRef = useRef<ActivePopup | null>(null);
  activeRef.current = active;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // ── context gathering ────────────────────────────────────────────

  useEffect(() => {
    // Visit-day record: once per page load (idempotent within a day).
    const local = browserLocalStorage();
    const outcome = applyVisitDay(readVisitsRecord(local), dayKey(Date.now()));
    writeVisitsRecord(local, outcome.record);
    visitsRef.current = outcome;
    // Habitual cameras from earlier days are eligible immediately.
    const top = habitualCameras(readCameraVisits(local), 3)[0];
    if (top) habitualRef.current = { key: top.key, name: top.name };
  }, []);

  useEffect(() => {
    pageStartAt.current = Date.now();
    scrollRef.current = { max: 0, wentDown: false };
    exitIntentRef.current = false;
    pricingAgedRef.current = false;
    pricingPatternRef.current = false;
    // Identity: re-read on navigation, throttled — session claims move
    // as the visitor signs in/out mid-session.
    const now = Date.now();
    if (now - identityReadAt.current > 20_000 || !identityRef.current) {
      identityReadAt.current = now;
      readSessionIdentity()
        .then((idn) => {
          identityRef.current = idn;
        })
        .catch(() => {});
    }
  }, [pathname]);

  useEffect(() => {
    const offCam = onCameraState((detail) => {
      const local = browserLocalStorage();
      if (detail) {
        const prev = currentCamRef.current;
        if (!prev || prev.key !== detail.key) {
          opensRef.current += 1;
          const out = applyCameraVisit(
            readCameraVisits(local),
            detail.key,
            detail.name,
            dayKey(Date.now()),
          );
          writeCameraVisits(local, out.record);
          const top = habitualCameras(out.record, 3)[0];
          habitualRef.current = top ? { key: top.key, name: top.name } : null;
        }
        currentCamRef.current = { key: detail.key, name: detail.name, since: Date.now() };
      } else {
        currentCamRef.current = null;
      }
    });
    const offTool = onToolComplete((tool) => {
      toolRef.current = tool;
    });
    const offClaim = onPopupClaimed(() => {
      /* the claim is re-read from storage on the next tick */
    });
    return () => {
      offCam();
      offTool();
      offClaim();
    };
  }, []);

  // Recording completion → share candidate (a fresh completion only).
  const lastCaptureId = useRef<string | null>(null);
  useEffect(() => {
    if (!completed) return;
    if (completed.sessionId === lastCaptureId.current) return;
    lastCaptureId.current = completed.sessionId;
    if (Date.now() - completed.endedAt > 120_000) return;
    const m = completed.sessionId.match(/^(?:tl|clip):(.+)$/);
    const url =
      (m ? buildCameraShareUrl({ id: m[1], name: completed.cameraName }) : null) ??
      "https://worldeye.app";
    shareCaptureRef.current = { url, name: completed.cameraName };
  }, [completed]);

  // Scroll + pricing behaviour listeners.
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ratio > scrollRef.current.max) scrollRef.current.max = ratio;
      if (window.scrollY > 500) scrollRef.current.wentDown = true;
      if (scrollRef.current.wentDown && window.scrollY < 150) {
        pricingPatternRef.current = true;
      }
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 8) exitIntentRef.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Pricing dwell timer (mobile has no exit intent — 45s on the page
  // is the equivalent intent signal).
  useEffect(() => {
    if (stripLocalePrefix(pathname) !== "/pricing") return;
    const t = setTimeout(() => {
      pricingAgedRef.current = true;
    }, 45_000);
    return () => clearTimeout(t);
  }, [pathname]);

  // happening_now feed: one fetch, a few seconds in.
  useEffect(() => {
    const t = setTimeout(() => {
      if (storyFetchedRef.current) return;
      storyFetchedRef.current = true;
      if (readSessionClaim(browserSessionStorage())) return;
      fetch("/api/popups/happening-now")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.story?.title && j?.story?.url) storyRef.current = j.story;
        })
        .catch(() => {});
    }, 8_000);
    return () => clearTimeout(t);
  }, []);

  // ── the arbitration loop ─────────────────────────────────────────

  useEffect(() => {
    const evaluate = () => {
      if (activeRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const session = browserSessionStorage();
      const local = browserLocalStorage();
      const identity = identityRef.current;
      const path = stripLocalePrefix(pathnameRef.current);
      const now = Date.now();

      // trial_waiting facts are server-verified; fetch once the
      // session proves a verified free account.
      if (
        identity?.state === "free" &&
        identity.user?.emailVerified === true &&
        !twFetchedRef.current
      ) {
        twFetchedRef.current = true;
        fetch("/api/popups/trial-waiting")
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            if (j?.eligible && typeof j.userKey === "string") {
              twRef.current = { eligible: true, userKey: j.userKey };
            } else {
              twRef.current = { eligible: false, userKey: "" };
            }
          })
          .catch(() => {
            twRef.current = { eligible: false, userKey: "" };
          });
      }

      // trial_ending + affiliate_invite facts are likewise
      // server-verified; fetch once the session proves a signed-in
      // account (the endpoints re-check everything themselves).
      if (
        (identity?.state === "free" || identity?.state === "premium") &&
        !teFetchedRef.current
      ) {
        teFetchedRef.current = true;
        fetch("/api/popups/trial-ending")
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            if (
              j?.eligible &&
              typeof j.userKey === "string" &&
              typeof j.trialEndMs === "number" &&
              typeof j.daysLeft === "number"
            ) {
              teRef.current = {
                eligible: true,
                userKey: j.userKey,
                trialEndMs: j.trialEndMs,
                daysLeft: j.daysLeft,
                planName: typeof j.planName === "string" ? j.planName : null,
                cameraOpens: typeof j.usage?.cameraOpens === "number" ? j.usage.cameraOpens : 0,
                savedCameras: typeof j.usage?.savedCameras === "number" ? j.usage.savedCameras : 0,
              };
            } else {
              teRef.current = {
                eligible: false, userKey: "", trialEndMs: 0, daysLeft: 0,
                planName: null, cameraOpens: 0, savedCameras: 0,
              };
            }
          })
          .catch(() => {
            teRef.current = {
              eligible: false, userKey: "", trialEndMs: 0, daysLeft: 0,
              planName: null, cameraOpens: 0, savedCameras: 0,
            };
          });
      }
      if (
        (identity?.state === "free" || identity?.state === "premium") &&
        !affFetchedRef.current
      ) {
        affFetchedRef.current = true;
        fetch("/api/popups/affiliate-invite")
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            if (j?.eligible && typeof j.userKey === "string") {
              affRef.current = { eligible: true, userKey: j.userKey };
            } else {
              affRef.current = { eligible: false, userKey: "" };
            }
          })
          .catch(() => {
            affRef.current = { eligible: false, userKey: "" };
          });
      }

      const candidates: PopupId[] = [];
      const data: ActivePopup = { id: "welcome_back" };

      // pricing_save
      const rawStatus = identity?.user?.subscriptionStatus ?? null;
      if (
        path === "/pricing" &&
        (exitIntentRef.current || pricingAgedRef.current || pricingPatternRef.current) &&
        identity &&
        identity.state !== "premium" &&
        identity.state !== "unknown" &&
        rawStatus !== "active" &&
        rawStatus !== "trialing"
      ) {
        candidates.push("pricing_save");
      }

      // trial_waiting
      const tw = twRef.current;
      if (tw?.eligible) {
        let shownFor: string | null = null;
        try {
          shownFor = local?.getItem(POPUP_TRIAL_WAITING_SHOWN_KEY) ?? null;
        } catch {
          shownFor = null;
        }
        if (shownFor !== tw.userKey) candidates.push("trial_waiting");
      }

      // trial_ending — once per trial (keyed user + trial end).
      const te = teRef.current;
      if (te?.eligible) {
        let shownFor: string | null = null;
        try {
          shownFor = local?.getItem(POPUP_TRIAL_ENDING_SHOWN_KEY) ?? null;
        } catch {
          shownFor = null;
        }
        if (shownFor !== `${te.userKey}:${te.trialEndMs}`) {
          candidates.push("trial_ending");
          data.trialEnding = {
            planName: te.planName,
            daysLeft: te.daysLeft,
            cameraOpens: te.cameraOpens,
            savedCameras: te.savedCameras,
          };
        }
      }

      // affiliate_invite — once per user; a past dismissal is
      // permanent for that user.
      const aff = affRef.current;
      if (aff?.eligible) {
        let shownFor: string | null = null;
        let dismissedFor: string | null = null;
        try {
          shownFor = local?.getItem(POPUP_AFFILIATE_SHOWN_KEY) ?? null;
          dismissedFor = local?.getItem(POPUP_AFFILIATE_DISMISSED_KEY) ?? null;
        } catch {
          shownFor = null;
          dismissedFor = null;
        }
        if (shownFor !== aff.userKey && dismissedFor !== aff.userKey) {
          candidates.push("affiliate_invite");
        }
      }

      // happening_now
      const story = storyRef.current;
      if (story && path !== story.url) {
        candidates.push("happening_now");
        data.story = story;
      }

      // welcome_back
      if (visitsRef.current?.isReturnDay && identity?.state === "anonymous" && now - mountAt.current >= 6_000) {
        candidates.push("welcome_back");
        const last = readLastCamera();
        data.lastCamera = last
          ? { name: last.name, url: buildCameraShareUrl({ id: last.id, name: last.name }) ?? "/" }
          : null;
      }

      // engaged_watcher (never while the camera viewer is open)
      if (opensRef.current >= 3 && !currentCamRef.current && identity) {
        if (identity.state === "anonymous") {
          candidates.push("engaged_watcher");
          data.engagedVariant = "anonymous";
        } else if (identity.state === "free" && identity.user?.emailVerified !== true) {
          candidates.push("engaged_watcher");
          data.engagedVariant = "verify";
        }
      }

      // your_camera
      if (habitualRef.current && identity?.state === "anonymous") {
        candidates.push("your_camera");
        data.habitualName = habitualRef.current.name;
      }

      // end_of_article
      if (
        ARTICLE_PATH.test(path) &&
        scrollRef.current.max >= 0.92 &&
        now - pageStartAt.current >= 15_000
      ) {
        candidates.push("end_of_article");
        let subscribed = false;
        try {
          subscribed = session?.getItem(POPUP_SUBSCRIBED_SESSION_KEY) === "1";
        } catch {
          subscribed = false;
        }
        if (!subscribed) {
          const rec = readLadderRecord(browserLadderStorage());
          subscribed = rec?.emailUnlockedAt != null;
        }
        data.alreadySubscribed = subscribed;
        data.signedIn = identity?.state === "free" || identity?.state === "premium";
      }

      // tool_completion — registry-driven; EMPTY today (the audited
      // tools persist nothing for accounts), so this never candidated.
      const tool = toolRef.current;
      if (tool && TOOL_COMPLETION_BENEFITS[tool]) {
        candidates.push("tool_completion");
        data.toolBenefit = TOOL_COMPLETION_BENEFITS[tool];
      }

      // share_view — fresh recording completion, or 3 minutes watching
      // one camera.
      if (shareCaptureRef.current) {
        candidates.push("share_view");
        data.share = shareCaptureRef.current;
      } else if (currentCamRef.current && now - currentCamRef.current.since >= 180_000) {
        candidates.push("share_view");
        data.share = {
          url:
            buildCameraShareUrl({
              id: currentCamRef.current.key,
              name: currentCamRef.current.name,
            }) ?? "https://worldeye.app",
          name: currentCamRef.current.name,
        };
      }

      if (candidates.length === 0) return;
      const modalOpen =
        typeof document !== "undefined" &&
        document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;
      const decision = arbitrate({
        candidates,
        sessionClaim: readSessionClaim(session),
        freq: readFreqRecord(local),
        now,
        modalOpen,
        pathname: pathnameRef.current,
      });
      if (!decision.show) return;

      const id = decision.show;
      claimSession(session, id, (pid) => signalPopupClaimed(pid));
      markShown(local, id, now);
      if (id === "trial_waiting" && tw?.userKey) {
        try {
          local?.setItem(POPUP_TRIAL_WAITING_SHOWN_KEY, tw.userKey);
        } catch {
          /* storage blocked — the freq exemption means it could
             re-fire; the server facts remain the eligibility gate */
        }
      }
      if (id === "trial_ending" && te?.userKey) {
        try {
          local?.setItem(POPUP_TRIAL_ENDING_SHOWN_KEY, `${te.userKey}:${te.trialEndMs}`);
        } catch {
          /* storage blocked — same caveat as trial_waiting */
        }
      }
      if (id === "affiliate_invite" && aff?.userKey) {
        try {
          local?.setItem(POPUP_AFFILIATE_SHOWN_KEY, aff.userKey);
        } catch {
          /* storage blocked — same caveat as trial_waiting */
        }
      }
      trackAnalyticsEvent("popup_shown", POPUP_EVENT_DETAIL[id]);
      data.id = id;
      setActive({ ...data });
    };

    const iv = setInterval(evaluate, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── actions ──────────────────────────────────────────────────────

  const dismiss = () => {
    if (activeRef.current) {
      // affiliate_invite dismissal is permanent for that user.
      if (activeRef.current.id === "affiliate_invite" && affRef.current?.userKey) {
        try {
          browserLocalStorage()?.setItem(
            POPUP_AFFILIATE_DISMISSED_KEY,
            affRef.current.userKey,
          );
        } catch {
          /* storage blocked — the invite could re-fire another day */
        }
      }
      trackAnalyticsEvent("popup_dismissed", POPUP_EVENT_DETAIL[activeRef.current.id]);
    }
    setActive(null);
  };
  const clicked = () => {
    if (activeRef.current) {
      trackAnalyticsEvent("popup_clicked", POPUP_EVENT_DETAIL[activeRef.current.id]);
    }
  };

  if (!active) return null;

  switch (active.id) {
    case "happening_now":
      return active.story ? (
        <HappeningNowToast story={active.story} onOpen={clicked} onClose={dismiss} />
      ) : null;
    case "welcome_back":
      return (
        <WelcomeBackPopup
          lastCamera={active.lastCamera ?? null}
          onAction={clicked}
          onClose={dismiss}
        />
      );
    case "pricing_save":
      return (
        <PricingSavePopup
          onUse={() => {
            clicked();
            setActive(null);
            document
              .querySelector("#pro-card")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onClose={dismiss}
        />
      );
    case "engaged_watcher":
      return (
        <EngagedWatcherPopup
          variant={active.engagedVariant ?? "anonymous"}
          onAction={clicked}
          onClose={dismiss}
        />
      );
    case "your_camera":
      return (
        <YourCameraPopup
          cameraName={active.habitualName ?? null}
          onAction={clicked}
          onClose={dismiss}
        />
      );
    case "end_of_article":
      return (
        <EndOfArticlePopup
          alreadySubscribed={active.alreadySubscribed ?? false}
          signedIn={active.signedIn ?? false}
          onSubscribed={() => {
            clicked();
            try {
              browserSessionStorage()?.setItem(POPUP_SUBSCRIBED_SESSION_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          onAction={clicked}
          onClose={dismiss}
        />
      );
    case "trial_waiting":
      return <TrialWaitingPopup onAction={clicked} onClose={dismiss} />;
    case "trial_ending":
      return active.trialEnding ? (
        <TrialEndingPopup
          planName={active.trialEnding.planName}
          daysLeft={active.trialEnding.daysLeft}
          cameraOpens={active.trialEnding.cameraOpens}
          savedCameras={active.trialEnding.savedCameras}
          onAction={clicked}
          onClose={dismiss}
        />
      ) : null;
    case "affiliate_invite":
      return <AffiliateInvitePopup onAction={clicked} onClose={dismiss} />;
    case "share_view":
      return active.share ? (
        <ShareViewPopup
          cameraName={active.share.name}
          onShare={async () => {
            clicked();
            const url = active.share!.url;
            try {
              if (typeof navigator !== "undefined" && "share" in navigator) {
                await navigator.share({ title: "WorldEye — live camera", url });
                return "shared";
              }
              throw new Error("no native share");
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") return "shared";
              try {
                await navigator.clipboard.writeText(url);
                return "copied";
              } catch {
                return "failed";
              }
            }
          }}
          onClose={dismiss}
        />
      ) : null;
    case "tool_completion":
      return active.toolBenefit ? (
        <ToolCompletionPopup
          benefit={active.toolBenefit}
          onAction={clicked}
          onClose={dismiss}
        />
      ) : null;
    default:
      return null;
  }
}
