/**
 * Onboarding & Activation aggregation (admin).
 *
 * Reads REAL rows only: PageView (page views + named events written by
 * /api/analytics/track) and Subscription (trial/paid state). No metric is
 * estimated or simulated; anything that cannot be joined honestly is
 * labeled site-wide in the report notes instead of being attributed.
 *
 * Event contract (emitted by the onboarding client, Build A):
 *   onboarding_impression / onboarding_start / onboarding_complete /
 *   onboarding_dismiss
 *   onboarding_step_complete:<n> / onboarding_step_skip:<n> /
 *   onboarding_dropoff:<n>   (n = 1-4 since the 2026-10-14 tour
 *   shortening; 5-6 appear only in pre-change history)
 *   feature_first_use:<camera|flight|satellite|layer|recon|search|alerts|oi|recording>
 *   conversion_shown / conversion_click_pro / conversion_dismiss
 * Pre-existing events reused: globe_reached, camera_open,
 * upgrade_gate_shown.
 *
 * DEDUPE RULES (no double-counting):
 *  - Every audience metric counts DISTINCT sessions (or distinct users),
 *    never raw event rows. A session that fires onboarding_impression
 *    three times still counts as ONE impression.
 *  - Session duration = SUM(durationSec) over the session's plain page
 *    views (event rows carry no duration), matching the existing admin.
 *  - A session's variant/device/utm/landing are resolved ONCE per session
 *    (first non-null value in time order), so downstream filters never
 *    multiply-count a session across groups.
 */
import { db } from "@/lib/db";
import { splitEvent } from "./ingest-fields";
import { COMP_PRICE_ID } from "@/lib/pro/comp";
import type {
  OnboardingReport,
  OnboardingFilters,
  StepStat,
  FunnelStep,
  DurationBucket,
  VariantRow,
} from "./onboarding-types";

export type { OnboardingReport, OnboardingFilters } from "./onboarding-types";

/** Minimum sessions per A/B group before comparison numbers are shown as meaningful. */
export const MIN_VARIANT_SAMPLE = 30;

/**
 * Step rows tabulated in the report. The live tour has 4 steps (since
 * 2026-10-14), but the table keeps all 6 historical steps so pre-change
 * step 5–6 events in the selected range still report instead of being
 * silently dropped; they simply read zero for post-change ranges.
 */
const TOUR_STEPS = 6;

export interface PvRow {
  sessionId: string;
  userId: string | null;
  path: string;
  event: string | null;
  durationSec: number | null;
  utmSource: string | null;
  variant: string | null;
  device: string | null;
  createdAt: Date;
}

export interface SubRow {
  userId: string;
  status: string;
  stripePriceId: string;
  createdAt: Date;
}

interface SessionInfo {
  sid: string;
  userId: string | null;
  startedAt: number;
  landingPath: string;
  utmSource: string | null;
  variant: string; // "A" | "B" | "unknown"
  device: string; // class or "unknown"
  durationSec: number;
  paths: Set<string>;
  /** event name -> occurrences (detail-aware where relevant) */
  events: Map<string, { detail: string | null; ts: number }[]>;
  stepCompleted: Set<number>;
  stepSkipped: Set<number>;
  maxStepTouched: number;
  features: Set<string>;
  days: Set<string>;
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function buildSessions(rows: PvRow[]): SessionInfo[] {
  const bySid = new Map<string, PvRow[]>();
  for (const r of rows) {
    const arr = bySid.get(r.sessionId);
    if (arr) arr.push(r);
    else bySid.set(r.sessionId, [r]);
  }
  const sessions: SessionInfo[] = [];
  for (const [sid, rs] of bySid) {
    rs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const first = rs[0];
    const firstStamped = <K extends "utmSource" | "variant" | "device" | "userId">(key: K) => {
      for (const r of rs) if (r[key] != null) return r[key];
      return null;
    };
    const landingRow = rs.find((r) => r.event == null) ?? first;
    const s: SessionInfo = {
      sid,
      userId: firstStamped("userId"),
      startedAt: first.createdAt.getTime(),
      landingPath: landingRow.path,
      utmSource: firstStamped("utmSource"),
      variant: firstStamped("variant") ?? "unknown",
      device: firstStamped("device") ?? "unknown",
      durationSec: 0,
      paths: new Set(),
      events: new Map(),
      stepCompleted: new Set(),
      stepSkipped: new Set(),
      maxStepTouched: 0,
      features: new Set(),
      days: new Set([dayKey(first.createdAt.getTime())]),
    };
    for (const r of rs) {
      s.days.add(dayKey(r.createdAt.getTime()));
      if (r.event == null) {
        s.paths.add(r.path);
        if (r.durationSec != null) s.durationSec += r.durationSec;
        continue;
      }
      const { name, detail } = splitEvent(r.event);
      const list = s.events.get(name) ?? [];
      list.push({ detail, ts: r.createdAt.getTime() });
      s.events.set(name, list);
      const stepNum = detail != null && /^\d+$/.test(detail) ? parseInt(detail, 10) : null;
      if (name === "onboarding_step_complete" && stepNum != null) {
        s.stepCompleted.add(stepNum);
        s.maxStepTouched = Math.max(s.maxStepTouched, stepNum);
      } else if (name === "onboarding_step_skip" && stepNum != null) {
        s.stepSkipped.add(stepNum);
        s.maxStepTouched = Math.max(s.maxStepTouched, stepNum);
      } else if (name === "onboarding_dropoff" && stepNum != null) {
        s.maxStepTouched = Math.max(s.maxStepTouched, stepNum);
      } else if (name === "feature_first_use" && detail) {
        s.features.add(detail);
      }
    }
    if (s.events.has("camera_open")) s.features.add("camera");
    if (s.events.has("globe_reached")) s.features.add("globe");
    sessions.push(s);
  }
  return sessions.sort((a, b) => a.startedAt - b.startedAt);
}

type StatusKey = "completed" | "skipped" | "exposed" | "never_offered";
const STATUS_LABELS: Record<StatusKey, string> = {
  completed: "Completed the tour",
  skipped: "Skipped / dismissed",
  exposed: "Exposed, didn't finish",
  never_offered: "Never offered",
};

function sessionStatus(s: SessionInfo): StatusKey {
  if (s.events.has("onboarding_complete")) return "completed";
  if (s.events.has("onboarding_dismiss") || s.stepSkipped.size > 0) return "skipped";
  if (s.events.has("onboarding_impression") || s.events.has("onboarding_start")) return "exposed";
  return "never_offered";
}

function hasFirstFeature(s: SessionInfo): boolean {
  return s.features.size > 0;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((x, y) => x + y, 0) / nums.length;
}
function rate(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

export interface ReportInput {
  rows: PvRow[];
  subs: SubRow[];
  filters: OnboardingFilters;
}

/** Pure aggregation — unit-tested against seeded fixtures. */
export function buildOnboardingReport(input: ReportInput): OnboardingReport {
  const { subs, filters } = input;
  const allSessions = buildSessions(input.rows);

  const availableSources = [...new Set(allSessions.map((s) => s.utmSource).filter((x): x is string => !!x))].sort();
  const availableLandings = [...new Set(allSessions.map((s) => s.landingPath))].sort();

  const sessions = allSessions.filter((s) => {
    if (filters.source && s.utmSource !== filters.source) return false;
    if (filters.landing && s.landingPath !== filters.landing) return false;
    if (filters.device && s.device !== filters.device) return false;
    return true;
  });

  const has = (s: SessionInfo, name: string) => s.events.has(name);
  const hasOnboardingData = allSessions.some((s) =>
    [...s.events.keys()].some((n) => n.startsWith("onboarding_") || n === "conversion_shown"),
  );

  // ── Tour totals (distinct sessions — see dedupe rules in the header) ──
  const impressions = sessions.filter((s) => has(s, "onboarding_impression")).length;
  const starts = sessions.filter((s) => has(s, "onboarding_start")).length;
  const completions = sessions.filter((s) => has(s, "onboarding_complete")).length;
  const dismissals = sessions.filter((s) => has(s, "onboarding_dismiss")).length;
  const skipSessions = sessions.filter((s) => s.stepSkipped.size > 0).length;

  // Time in tutorial: first start → completion, else dismissal, else the
  // last onboarding event of the session. Sessions with only a start event
  // have no measurable span and are excluded (counted in `starts` only).
  const tutorialSpans: number[] = [];
  for (const s of sessions) {
    const startList = s.events.get("onboarding_start");
    if (!startList) continue;
    const startTs = startList[0].ts;
    let endTs: number | null = null;
    const complete = s.events.get("onboarding_complete");
    const dismiss = s.events.get("onboarding_dismiss");
    if (complete) endTs = complete[0].ts;
    else if (dismiss) endTs = dismiss[0].ts;
    else {
      for (const [name, list] of s.events) {
        if (!name.startsWith("onboarding_")) continue;
        for (const e of list) endTs = Math.max(endTs ?? 0, e.ts);
      }
    }
    if (endTs != null && endTs > startTs) tutorialSpans.push((endTs - startTs) / 1000);
  }

  // ── Step funnel ──
  const steps: StepStat[] = [];
  for (let k = 1; k <= TOUR_STEPS; k++) {
    steps.push({
      step: k,
      completed: sessions.filter((s) => s.stepCompleted.has(k)).length,
      skipped: sessions.filter((s) => s.stepSkipped.has(k)).length,
      reached: sessions.filter((s) => s.maxStepTouched >= k).length,
      droppedOff: sessions.filter((s) => {
        if (!has(s, "onboarding_start") || has(s, "onboarding_complete")) return false;
        const drop = s.events.get("onboarding_dropoff");
        if (drop && drop[0].detail != null && /^\d+$/.test(drop[0].detail)) {
          return parseInt(drop[0].detail, 10) === k;
        }
        return s.maxStepTouched === k || (k === 1 && s.maxStepTouched === 0);
      }).length,
    });
  }

  // ── First-use milestones ──
  const firsts = {
    globe: sessions.filter((s) => has(s, "globe_reached")).length,
    camera: sessions.filter((s) => has(s, "camera_open") || s.features.has("camera")).length,
    flight: sessions.filter((s) => s.features.has("flight")).length,
    satellite: sessions.filter((s) => s.features.has("satellite")).length,
    layer: sessions.filter((s) => s.features.has("layer")).length,
  };

  // ── Pro / conversion moments ──
  const pricingByStatus = (Object.keys(STATUS_LABELS) as StatusKey[]).map((key) => ({
    key,
    label: STATUS_LABELS[key],
    sessions: sessions.filter((s) => sessionStatus(s) === key && s.paths.has("/pricing")).length,
  }));
  const conversionShown = sessions.filter((s) => has(s, "conversion_shown")).length;
  const conversionClickPro = sessions.filter((s) => has(s, "conversion_click_pro")).length;
  const conversionDismiss = sessions.filter((s) => has(s, "conversion_dismiss")).length;

  // ── Subscriptions (range-scoped by the fetcher). Paid excludes comp
  //    grants (COMP_PRICE_ID) — free Pro is not a purchase. Trials that
  //    already converted read as `active` today and land in paidStarted;
  //    see report notes. ──
  const isPaid = (sub: SubRow) => sub.stripePriceId !== COMP_PRICE_ID;
  const trialSubs = subs.filter((sub) => sub.status === "trialing" && isPaid(sub));
  const paidSubs = subs.filter((sub) => sub.status === "active" && isPaid(sub));
  const exposedUserIds = new Set(
    sessions
      .filter((s) => sessionStatus(s) !== "never_offered" && s.userId)
      .map((s) => s.userId as string),
  );
  const trialsAttributed = trialSubs.filter((sub) => exposedUserIds.has(sub.userId)).length;
  const paidAttributed = paidSubs.filter((sub) => exposedUserIds.has(sub.userId)).length;

  // ── Funnel ──
  const visitors = sessions.length;
  const startedCount = starts;
  const firstFeatureCount = sessions.filter(hasFirstFeature).length;
  const proViewed = sessions.filter((s) => s.paths.has("/pricing") || has(s, "conversion_click_pro")).length;
  const funnelRaw: { key: string; label: string; count: number; note: string | null }[] = [
    { key: "visitor", label: "Visitor", count: visitors, note: null },
    { key: "tour_started", label: "Tour Started", count: startedCount, note: null },
    { key: "first_feature", label: "First Feature Used", count: firstFeatureCount, note: null },
    { key: "tour_completed", label: "Tour Completed", count: completions, note: null },
    { key: "pro_viewed", label: "Pro Viewed", count: proViewed, note: null },
    {
      key: "trial_started",
      label: "Trial Started",
      count: trialSubs.length,
      note: "site-wide — subscriptions can't be joined to anonymous sessions",
    },
    {
      key: "purchased",
      label: "Subscription Purchased",
      count: paidSubs.length,
      note: "site-wide — subscriptions can't be joined to anonymous sessions",
    },
  ];
  const funnel: FunnelStep[] = funnelRaw.map((f, i) => ({
    ...f,
    pctFromPrevious: i === 0 ? null : rate(f.count, funnelRaw[i - 1].count),
  }));

  // ── Session duration by onboarding status ──
  const durationsByStatus: DurationBucket[] = (Object.keys(STATUS_LABELS) as StatusKey[]).map((key) => {
    const group = sessions.filter((s) => sessionStatus(s) === key);
    const durs = group.map((s) => s.durationSec);
    return {
      key,
      label: STATUS_LABELS[key],
      sessions: group.length,
      avgSec: avg(durs),
      medianSec: median(durs),
    };
  });

  // ── Return visits (signed-in users only — anonymous sessionIds are
  //    per-visit by design, so cross-day identity doesn't exist for them) ──
  function returnStats(group: SessionInfo[]): { visitors: number; returning: number; rate: number | null } {
    const daysByUser = new Map<string, Set<string>>();
    for (const s of group) {
      if (!s.userId) continue;
      const set = daysByUser.get(s.userId) ?? new Set<string>();
      for (const d of s.days) set.add(d);
      // Days are within the selected range (rows were range-scoped).
      if (s.days.size > 0) daysByUser.set(s.userId, set);
    }
    const visitorsN = daysByUser.size;
    const returning = [...daysByUser.values()].filter((d) => d.size >= 2).length;
    return { visitors: visitorsN, returning, rate: rate(returning, visitorsN) };
  }
  const returnsAll = returnStats(sessions);

  // ── A/B comparison ──
  function variantRow(variant: string, label: string): VariantRow {
    const group = sessions.filter((s) => s.variant === variant);
    const durs = group.map((s) => s.durationSec);
    const ret = returnStats(group);
    const groupUserIds = new Set(group.map((s) => s.userId).filter((x): x is string => !!x));
    return {
      variant,
      label,
      sessions: group.length,
      activationRate: rate(group.filter(hasFirstFeature).length, group.length),
      avgDurationSec: avg(durs),
      medianDurationSec: median(durs),
      avgFeaturesPerSession: avg(group.map((s) => s.features.size)),
      proCtr: rate(group.filter((s) => s.paths.has("/pricing")).length, group.length),
      returnRate: ret.rate,
      returnBase: ret.visitors,
      paidAttributed: paidSubs.filter((sub) => groupUserIds.has(sub.userId)).length,
      enoughData: group.length >= MIN_VARIANT_SAMPLE,
    };
  }
  const variants: VariantRow[] = [
    variantRow("A", "Group A — no proactive tour"),
    variantRow("B", "Group B — onboarding"),
    variantRow("unknown", "Unassigned / pre-test traffic"),
  ];

  const notes: string[] = [
    "All audience metrics count distinct sessions; a session firing an event repeatedly counts once.",
    "Trial Started counts subscriptions created in range that are still trialing. Trials that already converted read as active and are counted under Subscription Purchased — historical trial starts can't be reconstructed from current status.",
    "Paid counts exclude comp free-Pro grants. Subscription steps are site-wide for the range; only subscriptions whose account also appears in an onboarding-exposed session are counted as attributed.",
    "Return visits use signed-in accounts active on 2+ distinct days in range. Anonymous visitor IDs are per-visit, so anonymous return visits aren't measurable with the current tracker.",
    "Device class is stamped at ingest (client-reported or from the User-Agent). Sessions from before the column existed show as \u201cunknown\u201d.",
    `A/B groups need at least ${MIN_VARIANT_SAMPLE} sessions each before differences are treated as meaningful. No winner is declared by this report.`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    filters,
    availableSources,
    availableLandings,
    hasOnboardingData,
    totals: {
      sessions: visitors,
      impressions,
      starts,
      startRate: rate(starts, impressions),
      completions,
      completionRate: rate(completions, starts),
      dismissals,
      skipSessions,
      skipRate: rate(skipSessions, starts),
      conversionShown,
      conversionClickPro,
      conversionDismiss,
      medianTimeInTutorialSec: median(tutorialSpans),
      avgTimeInTutorialSec: avg(tutorialSpans),
      timedTutorialSessions: tutorialSpans.length,
    },
    steps,
    firsts,
    pricingByStatus,
    funnel,
    subscriptions: {
      trialsStarted: trialSubs.length,
      trialsAttributed,
      paidStarted: paidSubs.length,
      paidAttributed,
    },
    durationsByStatus,
    variants,
    returns: {
      signedInVisitors: returnsAll.visitors,
      returningVisitors: returnsAll.returning,
      rate: returnsAll.rate,
    },
    notes,
  };
}

/** Fetch + aggregate for the admin API route. */
export async function getOnboardingReport(filters: OnboardingFilters): Promise<OnboardingReport> {
  const from = new Date(filters.from);
  const to = new Date(filters.to);
  const [rows, subs] = await Promise.all([
    db.pageView.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: {
        sessionId: true,
        userId: true,
        path: true,
        event: true,
        durationSec: true,
        utmSource: true,
        variant: true,
        device: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 200_000,
    }),
    db.subscription.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { userId: true, status: true, stripePriceId: true, createdAt: true },
    }),
  ]);
  return buildOnboardingReport({
    rows: rows as PvRow[],
    subs: subs.map((s) => ({
      userId: s.userId,
      status: s.status as string,
      stripePriceId: s.stripePriceId,
      createdAt: s.createdAt,
    })),
    filters,
  });
}
