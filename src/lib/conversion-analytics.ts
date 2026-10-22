/**
 * Conversion analytics (admin) — where visitors come from and exactly
 * where they stop progressing.
 *
 * SOURCES OF TRUTH (real rows only; nothing estimated or simulated):
 *  - Site stages come from PageView rows written by our own tracker
 *    (/api/analytics/track). Plain views have event = NULL; interaction
 *    events reuse the same table. Events used here, verified against the
 *    emit sites: "globe_reached" (AnalyticsTracker), "camera_open"
 *    (globe page + CountryCameraExplorer). Pricing = a plain view of
 *    /pricing (the same definition the competitor-SEO report uses).
 *  - Checkout started comes from the CheckoutAttempt table — one row per
 *    subscription-mode checkout, written by the Stripe webhook on
 *    checkout.session.created. It is cross-checked against Stripe's own
 *    checkout-session count for the window when Stripe is reachable; the
 *    DB count is the one shown (it survives Stripe outages and is the
 *    same series the abandoned-cart cron works from).
 *  - Trial / first payment / renewal come from Stripe (subscriptions and
 *    paid invoices). The DB Subscription mirror carries no trial fields,
 *    so these stages cannot be sourced honestly from the DB.
 *
 * SEMANTICS WORTH KNOWING (also footnoted in the UI):
 *  - Site stages count DISTINCT SESSIONS in the window. Money stages
 *    count subscriptions/invoices whose event falls in the window — they
 *    are NOT a strict subset of this window's sessions (a renewal today
 *    belongs to a signup from weeks ago), so a later stage can exceed an
 *    earlier one. Percentages are shown anyway; read them as rates, not
 *    as a nested cohort.
 *  - Money stages EXCLUDE the owner's own/test accounts (OWNER_EMAILS)
 *    by default — resolved to user ids, Stripe customer ids and Stripe
 *    subscription ids, plus Stripe customers registered under those
 *    emails (guest checkouts). Site-stage session counts include all
 *    traffic: that is the funnel truth.
 *  - Segment attribution for money events: subscription → userId
 *    (subscription metadata, else the DB Subscription mirror) → that
 *    user's earliest session in the window → that session's segment.
 *    Events that cannot be joined land in an explicit "(unattributed)"
 *    row instead of being spread or dropped.
 *  - A session's traffic source = the first row in the window (in time
 *    order) that carries a utmSource or a referrer — labelled from the
 *    utmSource when present, else from the referrer host. This is
 *    first-touch WITHIN the window, not lifetime first-touch.
 */
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// ── Ranges ────────────────────────────────────────────────────────────

export type RangeKey = "24h" | "7d" | "30d";
export const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: "24h", label: "24h", ms: 24 * 3600_000 },
  { key: "7d", label: "7d", ms: 7 * 86400_000 },
  { key: "30d", label: "30d", ms: 30 * 86400_000 },
];
export function rangeMs(key: RangeKey): number {
  return RANGES.find((r) => r.key === key)?.ms ?? 7 * 86400_000;
}

/** Jameson's own / test accounts — excluded from every money stage. */
export const OWNER_EMAILS = [
  "jamesonlythgoe@gmail.com",
  "passiveincomewai@gmail.com",
  "xfueltests@gmail.com",
  "xfuelmarketing@gmail.com",
];

// ── PageView session resolution (pure) ────────────────────────────────

export interface PvRowLite {
  sessionId: string;
  userId: string | null;
  path: string;
  event: string | null;
  referrer: string | null;
  utmSource: string | null;
  device: string | null;
  createdAt: Date;
}

export interface SessionFacts {
  sessionId: string;
  userId: string | null;
  landingPath: string;
  /** Source label before "Other" collapsing (e.g. "ChatGPT", "Direct"). */
  source: string;
  device: string; // mobile | tablet | desktop | unknown
  hasView: boolean;
  globe: boolean;
  camera: boolean;
  pricing: boolean;
  firstAt: number; // epoch ms of the session's earliest row in window
}

function hostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return referrer.toLowerCase();
  }
}

const SOURCE_RULES: { match: string[]; label: string }[] = [
  { match: ["chatgpt", "openai"], label: "ChatGPT" },
  { match: ["instagram"], label: "Instagram" },
  { match: ["google"], label: "Google" },
  { match: ["facebook", "fb"], label: "Facebook" },
  { match: ["bing"], label: "Bing" },
  { match: ["perplexity"], label: "Perplexity" },
  { match: ["claude", "anthropic"], label: "Claude" },
  { match: ["tiktok"], label: "TikTok" },
  { match: ["youtube"], label: "YouTube" },
  { match: ["twitter"], label: "X / Twitter" },
  { match: ["reddit"], label: "Reddit" },
  { match: ["duckduckgo"], label: "DuckDuckGo" },
  { match: ["yahoo"], label: "Yahoo" },
  { match: ["linkedin"], label: "LinkedIn" },
];

function labelForToken(token: string): string | null {
  const t = token.toLowerCase();
  for (const rule of SOURCE_RULES) {
    if (rule.match.some((m) => t === m || t.includes(m))) return rule.label;
  }
  return null;
}

/** Label a traffic source from a utmSource and/or referrer. */
export function sourceLabel(utmSource: string | null, referrer: string | null): string {
  const utm = (utmSource ?? "").trim();
  if (utm) {
    if (utm.toLowerCase() === "ig") return "Instagram";
    if (utm.toLowerCase() === "x") return "X / Twitter";
    return labelForToken(utm) ?? utm;
  }
  const host = hostOf(referrer);
  if (host) {
    if (host.includes("worldeye.app")) return "Direct"; // internal nav, no external source
    return labelForToken(host) ?? host.replace(/^www\./, "");
  }
  return "Direct";
}

/** Resolve raw PageView rows (any order) into one fact record per session. */
export function resolveSessions(rows: PvRowLite[]): SessionFacts[] {
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byId = new Map<string, SessionFacts & { sourceSeen: boolean }>();
  for (const r of sorted) {
    let s = byId.get(r.sessionId);
    if (!s) {
      s = {
        sessionId: r.sessionId,
        userId: null,
        landingPath: r.path,
        source: "Direct",
        sourceSeen: false,
        device: "unknown",
        hasView: false,
        globe: false,
        camera: false,
        pricing: false,
        firstAt: r.createdAt.getTime(),
      };
      byId.set(r.sessionId, s);
    }
    if (!s.userId && r.userId) s.userId = r.userId;
    if (!s.sourceSeen && (r.utmSource || r.referrer)) {
      s.source = sourceLabel(r.utmSource, r.referrer);
      s.sourceSeen = true;
    }
    if (s.device === "unknown" && r.device) s.device = r.device;
    if (r.event === null) {
      s.hasView = true;
      if (r.path === "/pricing") s.pricing = true;
    } else if (r.event === "globe_reached") {
      s.globe = true;
    } else if (r.event === "camera_open") {
      s.camera = true;
    }
  }
  return [...byId.values()].map(({ sourceSeen: _drop, ...rest }) => rest);
}

// ── Funnel (pure) ─────────────────────────────────────────────────────

export type StageKey =
  | "landed" | "globe" | "camera" | "pricing"
  | "checkout" | "trial" | "first" | "renewal";

export const STAGE_LABELS: Record<StageKey, string> = {
  landed: "Landed",
  globe: "Globe interaction",
  camera: "Camera opened",
  pricing: "Pricing viewed",
  checkout: "Checkout started",
  trial: "Free trial started",
  first: "First payment",
  renewal: "Renewal payment",
};

export interface FunnelStage {
  key: StageKey;
  label: string;
  count: number;
  /** % of the previous stage (null for the first stage / division by 0). */
  pctOfPrev: number | null;
  /** % of Landed (null when Landed is 0). */
  pctOfLanded: number | null;
  /** Sessions/events lost between the previous stage and this one. */
  dropFromPrev: number;
}

export function buildFunnel(counts: Record<StageKey, number>): {
  stages: FunnelStage[];
  biggestDropoff: FunnelStage | null;
} {
  const order: StageKey[] = ["landed", "globe", "camera", "pricing", "checkout", "trial", "first", "renewal"];
  const landed = counts.landed;
  const stages: FunnelStage[] = order.map((key, i) => {
    const count = counts[key];
    const prev = i === 0 ? null : counts[order[i - 1]];
    return {
      key,
      label: STAGE_LABELS[key],
      count,
      pctOfPrev: prev === null ? null : prev > 0 ? (100 * count) / prev : null,
      pctOfLanded: landed > 0 ? (100 * count) / landed : null,
      dropFromPrev: prev === null ? 0 : prev - count,
    };
  });
  let biggestDropoff: FunnelStage | null = null;
  for (const s of stages) {
    if (s.key === "landed") continue;
    if (!biggestDropoff || s.dropFromPrev > biggestDropoff.dropFromPrev) biggestDropoff = s;
  }
  if (biggestDropoff && biggestDropoff.dropFromPrev <= 0) biggestDropoff = null;
  return { stages, biggestDropoff };
}

// ── Payment classification (pure) ─────────────────────────────────────

export interface PaidInvoiceLite {
  subscriptionId: string;
  /** Invoice creation time, epoch seconds. */
  createdSec: number;
  userId: string | null;
}

export type MoneyEventKind = "trial" | "first" | "renewal";
export interface MoneyEvent {
  kind: MoneyEventKind;
  userId: string | null;
  atSec: number;
}

/**
 * Classify paid invoices that fall inside the window.
 * `subsWithPriorPayment` = subscription ids with at least one paid invoice
 * BEFORE the window. Per the stage definitions, a subscription counts
 * toward "first payment" when its first-ever paid invoice is in the
 * window, and toward "renewal" when a 2nd-or-later paid invoice is in
 * the window — a weekly plan converted and renewed inside a 30d window
 * legitimately counts in both.
 */
export function classifyPayments(
  inWindow: PaidInvoiceLite[],
  subsWithPriorPayment: ReadonlySet<string>,
): { firstPayments: number; renewals: number; events: MoneyEvent[] } {
  const bySub = new Map<string, PaidInvoiceLite[]>();
  for (const inv of inWindow) {
    const arr = bySub.get(inv.subscriptionId) ?? [];
    arr.push(inv);
    bySub.set(inv.subscriptionId, arr);
  }
  let firstPayments = 0;
  let renewals = 0;
  const events: MoneyEvent[] = [];
  for (const [subId, invs] of bySub) {
    const sorted = [...invs].sort((a, b) => a.createdSec - b.createdSec);
    const hasPrior = subsWithPriorPayment.has(subId);
    if (!hasPrior) {
      firstPayments += 1;
      events.push({ kind: "first", userId: sorted[0].userId, atSec: sorted[0].createdSec });
    }
    if (hasPrior || sorted.length >= 2) {
      renewals += 1;
      const renewalInv = hasPrior ? sorted[0] : sorted[1];
      events.push({ kind: "renewal", userId: renewalInv.userId, atSec: renewalInv.createdSec });
    }
  }
  return { firstPayments, renewals, events };
}

// ── Segments (pure) ───────────────────────────────────────────────────

export type SegmentDimension = "source" | "device" | "landing";

export interface SegmentRow {
  key: string;
  label: string;
  landed: number;
  globe: number;
  camera: number;
  pricing: number;
  trials: number;
  paid: number; // first payments + renewals attributed to the segment
  /** paid as % of landed (null when landed is 0). */
  endToEndPct: number | null;
}

const OTHER_KEY = "__other";
const UNATTRIBUTED_KEY = "__unattributed";
const SOURCE_KEEP = 7; // named sources kept before folding into "Other"
const LANDING_KEEP = 12; // per spec: top 12 landing pages

function emptyRow(key: string, label: string): SegmentRow {
  return { key, label, landed: 0, globe: 0, camera: 0, pricing: 0, trials: 0, paid: 0, endToEndPct: null };
}

export function buildSegments(
  sessions: SessionFacts[],
  moneyEvents: MoneyEvent[],
  dimension: SegmentDimension,
): SegmentRow[] {
  const dimOf = (s: SessionFacts): { key: string; label: string } => {
    if (dimension === "source") return { key: `src:${s.source}`, label: s.source };
    if (dimension === "device") return { key: `dev:${s.device}`, label: s.device };
    return { key: `land:${s.landingPath}`, label: s.landingPath };
  };

  const rows = new Map<string, SegmentRow>();
  const get = (key: string, label: string) => {
    let r = rows.get(key);
    if (!r) {
      r = emptyRow(key, label);
      rows.set(key, r);
    }
    return r;
  };

  // Earliest in-window session per user, for money attribution.
  const userSession = new Map<string, SessionFacts>();
  for (const s of sessions) {
    if (!s.hasView) continue;
    const d = dimOf(s);
    const r = get(d.key, d.label);
    r.landed += 1;
    if (s.globe) r.globe += 1;
    if (s.camera) r.camera += 1;
    if (s.pricing) r.pricing += 1;
    if (s.userId) {
      const cur = userSession.get(s.userId);
      if (!cur || s.firstAt < cur.firstAt) userSession.set(s.userId, s);
    }
  }

  const unattributed = emptyRow(UNATTRIBUTED_KEY, "(unattributed)");
  for (const ev of moneyEvents) {
    const s = ev.userId ? userSession.get(ev.userId) : undefined;
    const r = s ? get(dimOf(s).key, dimOf(s).label) : unattributed;
    if (ev.kind === "trial") r.trials += 1;
    else r.paid += 1;
  }

  let list = [...rows.values()];

  // Folding: keep the biggest buckets, fold the tail into "Other" so the
  // table stays readable. Money counts fold with their sessions.
  const fold = (keep: number, otherLabel: string) => {
    const sorted = [...list].sort((a, b) => b.landed - a.landed);
    if (sorted.length <= keep) {
      list = sorted;
      return;
    }
    const kept = sorted.slice(0, keep);
    const tail = sorted.slice(keep);
    const other = emptyRow(OTHER_KEY, otherLabel);
    for (const r of tail) {
      other.landed += r.landed;
      other.globe += r.globe;
      other.camera += r.camera;
      other.pricing += r.pricing;
      other.trials += r.trials;
      other.paid += r.paid;
    }
    list = [...kept, other];
  };
  if (dimension === "source") fold(SOURCE_KEEP, "Other sources");
  if (dimension === "landing") fold(LANDING_KEEP, "Other landing pages");
  if (dimension === "device") list.sort((a, b) => b.landed - a.landed);

  for (const r of list) r.endToEndPct = r.landed > 0 ? (100 * r.paid) / r.landed : null;
  if (unattributed.trials > 0 || unattributed.paid > 0) {
    unattributed.endToEndPct = null;
    list.push(unattributed);
  }
  return list;
}

// ── Stripe money stages (server fetch, failure-tolerant) ─────────────

interface StripeMoney {
  ok: boolean;
  checkoutCrossCheck: number | null; // Stripe's own subscription-checkout count
  checkoutCustomers: number | null; // distinct Stripe customers starting checkout
  trialsStarted: number;
  firstPayments: number;
  renewals: number;
  events: MoneyEvent[];
}

const STRIPE_CACHE_TTL_MS = 5 * 60_000;
const stripeCache = new Map<string, { at: number; value: StripeMoney }>();

/** Stripe v18: Invoice.subscription was removed; use parent.subscription_details. */
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details" && parent.subscription_details) {
    const s = parent.subscription_details.subscription;
    return typeof s === "string" ? s : s.id;
  }
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object") return legacy.id;
  return null;
}

async function listAll<T>(
  fetchPage: (startingAfter?: string) => Promise<{ data: T[]; has_more: boolean }>,
  idOf: (item: T) => string,
  maxPages: number,
): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchPage(startingAfter);
    out.push(...res.data);
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = idOf(res.data[res.data.length - 1]);
    if (!startingAfter) break;
  }
  return out;
}

async function fetchStripeMoney(
  sinceSec: number,
  ownerCustomerIds: ReadonlySet<string>,
  ownerSubscriptionIds: ReadonlySet<string>,
  subUserByStripeId: ReadonlyMap<string, string>,
): Promise<StripeMoney> {
  const s = stripe();
  const fail: StripeMoney = {
    ok: false, checkoutCrossCheck: null, checkoutCustomers: null,
    trialsStarted: 0, firstPayments: 0, renewals: 0, events: [],
  };

  // Owner Stripe customers registered under owner emails but possibly not
  // mirrored in our DB (guest checkouts). Best-effort: a failure here
  // only weakens the exclusion, it must not fail the whole read.
  const ownerCustomers = new Set(ownerCustomerIds);
  for (const email of OWNER_EMAILS) {
    try {
      const found = await s.customers.list({ email, limit: 10 });
      for (const c of found.data) ownerCustomers.add(c.id);
    } catch { /* best effort */ }
  }
  const isOwnerSub = (subId: string, customerId: string | null) =>
    ownerSubscriptionIds.has(subId) || (customerId !== null && ownerCustomers.has(customerId));

  // ── Trials: subscriptions created in the window with a trial set ──
  let trialEvents: MoneyEvent[] = [];
  let trialsStarted = 0;
  try {
    const subs = await listAll<Stripe.Subscription>(
      (startingAfter) =>
        s.subscriptions.list({ created: { gte: sinceSec }, limit: 100, starting_after: startingAfter }),
      (sub) => sub.id,
      20,
    );
    for (const sub of subs) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      if (isOwnerSub(sub.id, customerId)) continue;
      if (sub.trial_end == null) continue;
      trialsStarted += 1;
      // Stripe types metadata values as string; widen like the webhook does.
      const metaUserId: string | undefined = sub.metadata?.userId || undefined;
      trialEvents.push({
        kind: "trial",
        userId: metaUserId ?? subUserByStripeId.get(sub.id) ?? null,
        atSec: sub.created,
      });
    }
  } catch {
    return fail;
  }

  // ── Payments: paid invoices in the window, classified per subscription ──
  let payment: ReturnType<typeof classifyPayments> = { firstPayments: 0, renewals: 0, events: [] };
  try {
    const invoices = await listAll<Stripe.Invoice>(
      (startingAfter) =>
        s.invoices.list({ created: { gte: sinceSec }, status: "paid", limit: 100, starting_after: startingAfter }),
      (inv) => inv.id ?? "",
      20,
    );
    const inWindow: PaidInvoiceLite[] = [];
    const payingSubs = new Set<string>();
    for (const inv of invoices) {
      if (!(inv.amount_paid > 0)) continue; // a $0 "paid" invoice is not a payment
      const subId = subscriptionIdFromInvoice(inv);
      if (!subId) continue;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
      if (isOwnerSub(subId, customerId)) continue;
      payingSubs.add(subId);
      inWindow.push({ subscriptionId: subId, createdSec: inv.created, userId: null });
    }
    // Which of these subscriptions already paid before the window?
    const prior = new Set<string>();
    for (const subId of payingSubs) {
      const before = await s.invoices.list({
        subscription: subId, status: "paid", created: { lt: sinceSec }, limit: 10,
      });
      if (before.data.some((i) => i.amount_paid > 0)) prior.add(subId);
    }
    // Resolve userIds for attribution (metadata is not on invoices; use
    // the DB mirror keyed by Stripe subscription id).
    for (const inv of inWindow) inv.userId = subUserByStripeId.get(inv.subscriptionId) ?? null;
    payment = classifyPayments(inWindow, prior);
  } catch {
    return fail;
  }

  // ── Checkout cross-check: Stripe's own count for the window ──
  let checkoutCrossCheck: number | null = null;
  let checkoutCustomers: number | null = null;
  try {
    const sessions = await listAll<Stripe.Checkout.Session>(
      (startingAfter) =>
        s.checkout.sessions.list({ created: { gte: sinceSec }, limit: 100, starting_after: startingAfter }),
      (cs) => cs.id,
      10,
    );
    const customers = new Set<string>();
    let count = 0;
    for (const cs of sessions) {
      if (cs.mode !== "subscription") continue;
      const customerId = typeof cs.customer === "string" ? cs.customer : cs.customer?.id ?? null;
      if (customerId && ownerCustomers.has(customerId)) continue;
      count += 1;
      if (customerId) customers.add(customerId);
    }
    checkoutCrossCheck = count;
    checkoutCustomers = customers.size;
  } catch {
    checkoutCrossCheck = null;
    checkoutCustomers = null;
  }

  return {
    ok: true,
    checkoutCrossCheck,
    checkoutCustomers,
    trialsStarted,
    firstPayments: payment.firstPayments,
    renewals: payment.renewals,
    events: [...trialEvents, ...payment.events],
  };
}

async function getStripeMoneyCached(
  range: RangeKey,
  sinceSec: number,
  ownerCustomerIds: ReadonlySet<string>,
  ownerSubscriptionIds: ReadonlySet<string>,
  subUserByStripeId: ReadonlyMap<string, string>,
): Promise<StripeMoney> {
  const hit = stripeCache.get(range);
  if (hit && Date.now() - hit.at < STRIPE_CACHE_TTL_MS) return hit.value;
  const value = await fetchStripeMoney(
    sinceSec, ownerCustomerIds, ownerSubscriptionIds, subUserByStripeId,
  ).catch(() => ({
    ok: false, checkoutCrossCheck: null, checkoutCustomers: null,
    trialsStarted: 0, firstPayments: 0, renewals: 0, events: [] as MoneyEvent[],
  }));
  if (value.ok) stripeCache.set(range, { at: Date.now(), value });
  return value;
}

// ── Report assembly ───────────────────────────────────────────────────

export interface ConversionReport {
  range: RangeKey;
  sinceISO: string;
  generatedAtISO: string;
  /** True when the PageView read hit its row cap (counts are a floor). */
  capped: boolean;
  stages: FunnelStage[];
  biggestDropoff: FunnelStage | null;
  checkout: {
    /** CheckoutAttempt rows in window, owner emails excluded. */
    started: number;
    /** Distinct non-null emails among those attempts. */
    distinctCustomers: number;
    /** Stripe's subscription-checkout count for the window (cross-check). */
    stripeCount: number | null;
  };
  stripeOk: boolean;
  segments: Record<SegmentDimension, SegmentRow[]>;
}

const PV_ROW_CAP = 120_000;

export async function getConversionReport(range: RangeKey): Promise<ConversionReport> {
  const now = Date.now();
  const since = new Date(now - rangeMs(range));
  const sinceSec = Math.floor(since.getTime() / 1000);

  const [pvRows, ownerUsers, subMirror, checkoutAgg, checkoutEmails] = await Promise.all([
    db.pageView.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      take: PV_ROW_CAP,
      select: {
        sessionId: true, userId: true, path: true, event: true,
        referrer: true, utmSource: true, device: true, createdAt: true,
      },
    }),
    db.user.findMany({ where: { email: { in: OWNER_EMAILS } }, select: { id: true } }),
    db.subscription.findMany({
      select: { userId: true, stripeSubscriptionId: true, stripeCustomerId: true },
    }),
    db.checkoutAttempt.count({
      where: { createdAt: { gte: since }, NOT: { email: { in: OWNER_EMAILS } } },
    }),
    db.checkoutAttempt.groupBy({
      by: ["email"],
      where: { createdAt: { gte: since }, email: { not: null }, NOT: { email: { in: OWNER_EMAILS } } },
    }),
  ]);

  const sessions = resolveSessions(pvRows as PvRowLite[]);
  const landedSessions = sessions.filter((s) => s.hasView);

  const ownerUserIds = new Set(ownerUsers.map((u) => u.id));
  const subUserByStripeId = new Map<string, string>();
  const ownerCustomerIds = new Set<string>();
  const ownerSubscriptionIds = new Set<string>();
  for (const row of subMirror) {
    subUserByStripeId.set(row.stripeSubscriptionId, row.userId);
    if (ownerUserIds.has(row.userId)) {
      ownerSubscriptionIds.add(row.stripeSubscriptionId);
      ownerCustomerIds.add(row.stripeCustomerId);
    }
  }

  const money = await getStripeMoneyCached(
    range, sinceSec, ownerCustomerIds, ownerSubscriptionIds, subUserByStripeId,
  );

  const counts: Record<StageKey, number> = {
    landed: landedSessions.length,
    globe: sessions.filter((s) => s.globe).length,
    camera: sessions.filter((s) => s.camera).length,
    pricing: sessions.filter((s) => s.pricing).length,
    checkout: checkoutAgg,
    trial: money.ok ? money.trialsStarted : 0,
    first: money.ok ? money.firstPayments : 0,
    renewal: money.ok ? money.renewals : 0,
  };
  const { stages, biggestDropoff } = buildFunnel(counts);

  return {
    range,
    sinceISO: since.toISOString(),
    generatedAtISO: new Date(now).toISOString(),
    capped: pvRows.length >= PV_ROW_CAP,
    stages,
    biggestDropoff,
    checkout: {
      started: checkoutAgg,
      distinctCustomers: checkoutEmails.length,
      stripeCount: money.checkoutCrossCheck,
    },
    stripeOk: money.ok,
    segments: {
      source: buildSegments(sessions, money.events, "source"),
      device: buildSegments(sessions, money.events, "device"),
      landing: buildSegments(sessions, money.events, "landing"),
    },
  };
}
