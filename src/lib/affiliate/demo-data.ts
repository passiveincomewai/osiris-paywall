// ── Affiliate demo dataset ───────────────────────────────────────────────
// A clearly-labelled SAMPLE dataset that drives the REAL dashboard UI in
// demo mode (/affiliates/demo and the reusable demo section). Every
// figure here is illustrative — invented for the demo, marked as sample
// wherever it renders, and never mixed with a real affiliate's data.
// The shapes mirror the /api/affiliate/me, /api/affiliate/dashboard and
// /api/affiliate/insights payloads so the same components render both.

import { RANKS, rankFor, nextRank, rankProgress } from "./ranks";

const DAY = 86400_000;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const dateDaysAgo = (n: number) => isoDaysAgo(n).slice(0, 10);

// Deterministic pseudo-variation (no Math.random — stable across renders).
const wave = (i: number, base: number, amp: number) =>
  Math.max(0, Math.round(base + Math.sin(i * 1.7) * amp + ((i * 37) % 11) - 5));

const XP = 4250;
const rank = rankFor(XP, RANKS);
const nxt = nextRank(XP, RANKS);

export const DEMO_CODE = "DEMO";

export function buildDemoMe() {
  return {
    profile: {
      referralCode: DEMO_CODE,
      customCode: null,
      status: "active",
      xp: XP,
      payoutEmail: "demo@example.com",
      payoutMethod: "venmo",
      venmoHandle: "demo-handle",
      payoutThresholdCents: 5000,
      directorEnabled: true,
    },
    rank,
    nextRank: nxt,
    discount: { code: "DEMO15", pct: 15, synced: true, status: "active" },
    progress: rankProgress(XP, RANKS),
    referralLink: "https://worldeye.app/ref/DEMO",
    ranks: RANKS.map((r) => ({ key: r.key, name: r.name, minXp: r.minXp })),
    creatorApplication: null,
  };
}

export function buildDemoDash() {
  const series = Array.from({ length: 30 }, (_, i) => {
    const idx = 29 - i;
    return {
      date: dateDaysAgo(idx),
      cents: wave(i, 420, 260) * (i > 22 ? 1 : 0) + (i % 6 === 0 ? 1399 : 0),
      clicks: wave(i, 46, 22),
    };
  });
  return {
    rank,
    totals: {
      lifetimeCents: 128_450,
      availableCents: 21_340,
      pendingCents: 8_720,
      paidOutCents: 98_390,
      estimatedMonthlyCents: 11_860,
      activePayingReferrals: 41,
      directReferrals: 132,
      convertedReferrals: 47,
      indirectReferrals: 18,
      clicks: 3912,
      conversionPct: 35.6,
    },
    series,
    commissions: [
      { id: "demo-c1", level: 1, amountCents: 315, currency: "usd", status: "pending", availableAt: isoDaysAgo(-24), createdAt: isoDaysAgo(2), plan: "Monthly" },
      { id: "demo-c2", level: 1, amountCents: 2250, currency: "usd", status: "pending", availableAt: isoDaysAgo(-26), createdAt: isoDaysAgo(4), plan: "VIP Pro" },
      { id: "demo-c3", level: 2, amountCents: 70, currency: "usd", status: "available", availableAt: isoDaysAgo(3), createdAt: isoDaysAgo(33), plan: "Monthly" },
      { id: "demo-c4", level: 1, amountCents: 168, currency: "usd", status: "available", availableAt: isoDaysAgo(1), createdAt: isoDaysAgo(31), plan: "Weekly" },
      { id: "demo-c5", level: 3, amountCents: 30, currency: "usd", status: "paid", availableAt: isoDaysAgo(40), createdAt: isoDaysAgo(70), plan: "Monthly" },
      { id: "demo-c6", level: 1, amountCents: 2250, currency: "usd", status: "paid", availableAt: isoDaysAgo(45), createdAt: isoDaysAgo(75), plan: "VIP Pro" },
    ],
    payouts: [
      { id: "demo-p1", amountCents: 52_400, status: "paid", method: "paypal", requestedAt: isoDaysAgo(38), decidedAt: isoDaysAgo(36), note: null },
      { id: "demo-p2", amountCents: 45_990, status: "paid", method: "paypal", requestedAt: isoDaysAgo(96), decidedAt: isoDaysAgo(94), note: null },
    ],
    xpEvents: [
      { activity: "paying_referral", xp: 150, createdAt: isoDaysAgo(2) },
      { activity: "challenge:weekly-paying-2", xp: 500, createdAt: isoDaysAgo(5) },
      { activity: "paying_referral", xp: 150, createdAt: isoDaysAgo(9) },
      { activity: "first_verified_visit", xp: 25, createdAt: isoDaysAgo(12) },
    ],
    settings: { holdingPeriodDays: 30, minPayoutCents: 2500, payoutThresholdCents: 5000, effectiveMinPayoutCents: 5000 },
  };
}

export function buildDemoInsights() {
  const dash = buildDemoDash();
  return {
    rangeTotals: { clicks: 1284, signups: 44, conversions: 12, earnedCents: 18_240, range: "30" },
    series: dash.series,
    granularity: "day",
    funnel: [
      { key: "clicks", label: "Link clicks", count: 3912, pctOfPrev: null, pctOfFirst: 100 },
      { key: "signups", label: "Signups", count: 132, pctOfPrev: 3.4, pctOfFirst: 3.4 },
      { key: "plans", label: "Started a plan (trial or paid)", count: 68, pctOfPrev: 51.5, pctOfFirst: 1.7 },
      { key: "paying", label: "Became paying subscribers", count: 47, pctOfPrev: 69.1, pctOfFirst: 1.2 },
    ],
    retention: {
      referredSubscribers: 47, currentlyPaying: 41, currentlyTrialing: 5,
      pastDue: 1, churned: 5, trialToPaidPct: 69.1,
      note: "Sample figures for the demo. In a live dashboard these are each referred subscriber's current subscription status.",
    },
    sources: {
      byPlatform: [
        { label: "YouTube", count: 512, pct: 39.9 },
        { label: "No referrer (direct / in-app)", count: 301, pct: 23.4 },
        { label: "X (Twitter)", count: 188, pct: 14.6 },
        { label: "Instagram", count: 142, pct: 11.1 },
        { label: "TikTok", count: 141, pct: 11 },
      ],
      byUtmSource: [
        { label: "youtube", count: 498, pct: 38.8 },
        { label: "Not tracked", count: 402, pct: 31.3 },
        { label: "x", count: 201, pct: 15.7 },
        { label: "newsletter", count: 183, pct: 14.2 },
      ],
      byUtmCampaign: [
        { label: "storm-season", count: 356, pct: 27.7 },
        { label: "Not tracked", count: 690, pct: 53.7 },
        { label: "launch-week", count: 238, pct: 18.5 },
      ],
      byDevice: [
        { label: "Mobile", count: 806, pct: 62.8 },
        { label: "Desktop", count: 421, pct: 32.8 },
        { label: "Tablet", count: 57, pct: 4.4 },
      ],
      byOs: [
        { label: "iOS", count: 512, pct: 39.9 },
        { label: "Android", count: 351, pct: 27.3 },
        { label: "Windows", count: 268, pct: 20.9 },
        { label: "macOS", count: 153, pct: 11.9 },
      ],
      trackedShare: 68.7,
      country: { tracked: false, note: "Country is not captured for referral clicks, so no country breakdown is shown." },
    },
    links: [
      { id: null, label: "Primary link", slug: DEMO_CODE, url: "https://worldeye.app/ref/DEMO", clicks: 2210, signups: 74, primary: true },
      { id: "demo-l1", label: "YouTube description", slug: "youtube", url: "https://worldeye.app/ref/DEMO?t=youtube", clicks: 1104, signups: 39, primary: false },
      { id: "demo-l2", label: "Newsletter", slug: "newsletter", url: "https://worldeye.app/ref/DEMO?t=newsletter", clicks: 598, signups: 19, primary: false },
    ],
    creative: {
      rows: [
        { templateSlug: "storm-watch-reel", kind: "video", creations: 6, signups: 0, signupsTracked: false },
        { templateSlug: "globe-intro-card", kind: "image", creations: 4, signups: 0, signupsTracked: false },
      ],
      totalCreations: 10,
      note: "Sample figures for the demo. In a live dashboard, creations are counted from your Studio library; signups per creative aren't tracked yet, so that reads 0 rather than guessing.",
    },
    ladder: RANKS.map((r) => ({
      key: r.key, name: r.name, minXp: r.minXp, commissionPct: r.commissionPct, discountPct: r.discountPct,
      color: r.color, badge: r.badge,
      unlocks: [
        `${r.commissionPct}% direct commission`,
        `Audience discount code: ${r.discountPct}% off`,
        ...(r.key === "visionary" ? ["Free WorldEye Pro while you hold the rank"] : []),
      ],
      reached: XP >= r.minXp,
      current: rank.key === r.key,
    })),
    rankHistory: [
      { rankKey: "explorer", rankName: "Explorer", reachedAt: isoDaysAgo(120), xpTotal: 100 },
      { rankKey: "scout", rankName: "Scout", reachedAt: isoDaysAgo(74), xpTotal: 1050 },
      { rankKey: "analyst", rankName: "Analyst", reachedAt: isoDaysAgo(21), xpTotal: 3125 },
    ],
  };
}

export function buildDemoNotifications() {
  return [
    { id: "demo-n1", type: "referral_converted", title: "A referral subscribed", body: "One of your referrals became a paying subscriber — commissions from them now flow into your ledger.", href: "/affiliates/dashboard", read: false, createdAt: isoDaysAgo(2) },
    { id: "demo-n2", type: "referral_signup", title: "New referral signup", body: "Someone created a WorldEye account through your referral link.", href: "/affiliates/network", read: false, createdAt: isoDaysAgo(3) },
    { id: "demo-n3", type: "payout_paid", title: "Payout sent", body: "Your payout of $524.00 was approved and sent.", href: "/affiliates/dashboard", read: true, createdAt: isoDaysAgo(36) },
  ];
}

export function buildDemoLinks() {
  // The ready-made platform set (slugs from the platforms registry, in
  // registry order) plus two custom links — the demo dashboard renders
  // the same Social platforms / Your links split as a live account.
  return [
    { label: "Instagram", slug: "instagram", url: "https://worldeye.app/ref/DEMO?t=instagram", clicks: 862, signups: 27 },
    { label: "TikTok", slug: "tiktok", url: "https://worldeye.app/ref/DEMO?t=tiktok", clicks: 743, signups: 22 },
    { label: "YouTube", slug: "youtube", url: "https://worldeye.app/ref/DEMO?t=youtube", clicks: 1104, signups: 39 },
    { label: "X", slug: "x-twitter", url: "https://worldeye.app/ref/DEMO?t=x-twitter", clicks: 655, signups: 18 },
    { label: "Facebook", slug: "facebook", url: "https://worldeye.app/ref/DEMO?t=facebook", clicks: 431, signups: 12 },
    { label: "Threads", slug: "threads", url: "https://worldeye.app/ref/DEMO?t=threads", clicks: 246, signups: 7 },
    { label: "Twitch", slug: "twitch", url: "https://worldeye.app/ref/DEMO?t=twitch", clicks: 388, signups: 11 },
    { label: "LinkedIn", slug: "linkedin", url: "https://worldeye.app/ref/DEMO?t=linkedin", clicks: 96, signups: 3 },
    { label: "Pinterest", slug: "pinterest", url: "https://worldeye.app/ref/DEMO?t=pinterest", clicks: 122, signups: 4 },
    { label: "Reddit", slug: "reddit", url: "https://worldeye.app/ref/DEMO?t=reddit", clicks: 198, signups: 6 },
    { label: "Newsletter", slug: "newsletter", url: "https://worldeye.app/ref/DEMO?t=newsletter", clicks: 598, signups: 19 },
    { label: "Blog sidebar", slug: "blog-sidebar", url: "https://worldeye.app/ref/DEMO?t=blog-sidebar", clicks: 154, signups: 5 },
  ];
}

// ── Demo: Missions ───────────────────────────────────────────────────────
// The mission definitions mirror the real seeded challenges
// (lib/affiliate/challenges SEEDED_CHALLENGES — same slugs, titles,
// targets and XP). Only the progress/completion figures are sample.

export interface DemoChallenge {
  id: string; slug: string; kind: "daily" | "weekly" | "monthly";
  title: string; description: string; xpReward: number; metric: string;
  target: number; endsAt: string; progress: number; completedAt: string | null;
}

export function buildDemoChallenges(): DemoChallenge[] {
  const endsIn = (days: number) => new Date(Date.now() + days * DAY).toISOString();
  const defs: Omit<DemoChallenge, "id" | "endsAt">[] = [
    { slug: "daily-tutorial", kind: "daily", title: "Study the Playbook", description: "Complete the affiliate marketing tutorial in Resources.", xpReward: 200, metric: "tutorial", target: 1, progress: 1, completedAt: isoDaysAgo(0) },
    { slug: "daily-visits-3", kind: "daily", title: "First Signals", description: "Generate 3 verified unique referral visits.", xpReward: 250, metric: "visits", target: 3, progress: 2, completedAt: null },
    { slug: "daily-resource", kind: "daily", title: "Arsenal Check", description: "Open a new promotional resource.", xpReward: 200, metric: "tutorial", target: 1, progress: 0, completedAt: null },
    { slug: "weekly-signups-3", kind: "weekly", title: "Recruit Squad", description: "Refer 3 verified new users.", xpReward: 400, metric: "signups", target: 3, progress: 1, completedAt: null },
    { slug: "weekly-paying-2", kind: "weekly", title: "Double Conversion", description: "Generate 2 paying subscriptions.", xpReward: 500, metric: "paying_referrals", target: 2, progress: 1, completedAt: null },
    { slug: "weekly-visits-100", kind: "weekly", title: "Signal Flood", description: "Reach 100 legitimate affiliate link visits.", xpReward: 350, metric: "visits", target: 100, progress: 64, completedAt: null },
    { slug: "monthly-paying-10", kind: "monthly", title: "Network Effect", description: "Generate 10 paying subscribers.", xpReward: 1200, metric: "paying_referrals", target: 10, progress: 4, completedAt: null },
    { slug: "monthly-revenue-500", kind: "monthly", title: "Half Grand", description: "Reach $500 in qualifying referred subscription revenue.", xpReward: 2000, metric: "revenue_cents", target: 50000, progress: 18200, completedAt: null },
    { slug: "monthly-rank-up", kind: "monthly", title: "Promotion", description: "Unlock a new affiliate rank.", xpReward: 800, metric: "rank_up", target: 1, progress: 0, completedAt: null },
    { slug: "monthly-studio-creator", kind: "monthly", title: "Studio Creator", description: "Save 10 creations in the Studio this month", xpReward: 600, metric: "studio_creations", target: 10, progress: 3, completedAt: null },
    { slug: "monthly-studio-days", kind: "monthly", title: "Studio Regular", description: "Create on 7 different days this month", xpReward: 500, metric: "studio_days", target: 7, progress: 2, completedAt: null },
    { slug: "monthly-studio-video", kind: "monthly", title: "First Reel", description: "Personalize a video in the Studio", xpReward: 300, metric: "studio_videos", target: 1, progress: 0, completedAt: null },
    { slug: "monthly-studio-campaign", kind: "monthly", title: "Campaign Starter", description: "Join a Studio campaign", xpReward: 400, metric: "campaign_joins", target: 1, progress: 0, completedAt: null },
  ];
  const span = { daily: 1, weekly: 5, monthly: 21 } as const;
  return defs.map((d) => ({ ...d, id: `demo-ch-${d.slug}`, endsAt: endsIn(span[d.kind]) }));
}

// ── Demo: Network ────────────────────────────────────────────────────────
// A sample 3-level tree. Every person is fictional and labelled
// "(sample)" inline; the demo page banner says the same. Figures are
// illustrative only.

export interface DemoNetworkNode {
  id: string;
  name: string;
  image: string | null;
  level: number;
  joinedAt: string;
  converted: boolean;
  commissionsCents: number;
  lastActivityAt?: string | null;
  children: DemoNetworkNode[];
}

export function buildDemoNetworkTree(): DemoNetworkNode[] {
  const node = (
    id: string, name: string, level: number, joinedDaysAgo: number,
    converted: boolean, commissionsCents: number, lastSaleDaysAgo: number | null,
    children: DemoNetworkNode[] = [],
  ): DemoNetworkNode => ({
    id, name: `${name} (sample)`, image: null, level,
    joinedAt: isoDaysAgo(joinedDaysAgo), converted, commissionsCents,
    lastActivityAt: lastSaleDaysAgo === null ? null : isoDaysAgo(lastSaleDaysAgo),
    children,
  });
  return [
    node("demo-net-1", "Alex Rivers", 1, 96, true, 18_240, 2, [
      node("demo-net-1a", "Sam Carter", 2, 61, true, 2_610, 6, [
        node("demo-net-1a-i", "Jamie Lee", 3, 40, true, 420, 9),
        node("demo-net-1a-ii", "Robin Fox", 3, 22, false, 0, null),
      ]),
      node("demo-net-1b", "Priya Nair", 2, 33, false, 0, null),
    ]),
    node("demo-net-2", "Marco Ruiz", 1, 74, true, 9_870, 4, [
      node("demo-net-2a", "Elena Petrova", 2, 51, true, 1_155, 12),
    ]),
    node("customer:demo-net-3", "Casey Kim", 1, 18, true, 3_150, 1),
    node("demo-net-4", "Jordan Blake", 1, 9, false, 0, null),
  ];
}

// ── Demo: Leaderboard ────────────────────────────────────────────────────
// Sample boards in the /api/affiliate/leaderboard response shape.
// Handles are fictional and carry "(sample)"; no real affiliate appears.

export interface DemoBoardRow {
  id: string;
  name: string;
  image: string | null;
  rank: string;
  rankColor: string;
  badge: string;
  xp: number;
  payingReferrals?: number;
  revenueCents?: number;
  clicks?: number;
}

export function buildDemoLeaderboard(): Record<string, DemoBoardRow[]> {
  const byKey = (key: string) => RANKS.find((r) => r.key === key) ?? RANKS[0];
  const row = (
    id: string, name: string, rankKey: string,
    metrics: Partial<Pick<DemoBoardRow, "xp" | "payingReferrals" | "revenueCents" | "clicks">>,
  ): DemoBoardRow => {
    const r = byKey(rankKey);
    return {
      id, name: `${name} (sample)`, image: null,
      rank: r.name, rankColor: r.color, badge: r.badge,
      xp: 0, ...metrics,
    };
  };
  const people: [string, string, string][] = [
    ["demo-lb-1", "SkyWatcher", "visionary"],
    ["demo-lb-2", "HarborLights", "elite"],
    ["demo-lb-3", "NightOwlCams", "commander"],
    ["demo-lb-4", "GlobeTrotter", "commander"],
    ["demo-lb-5", "StormChaser99", "analyst"],
    ["demo-lb-6", "CoastalViews", "analyst"],
  ];
  const mk = (metrics: Partial<Pick<DemoBoardRow, "xp" | "payingReferrals" | "revenueCents" | "clicks">>[]) =>
    people.map(([id, name, rankKey], i) => row(id, name, rankKey, metrics[i]));
  return {
    payingThisMonth: mk([
      { payingReferrals: 23, xp: 31_400 }, { payingReferrals: 19, xp: 17_250 },
      { payingReferrals: 14, xp: 9_800 }, { payingReferrals: 11, xp: 8_150 },
      { payingReferrals: 8, xp: 4_260 }, { payingReferrals: 6, xp: 3_540 },
    ]),
    topRevenue: mk([
      { revenueCents: 412_300, xp: 31_400 }, { revenueCents: 356_750, xp: 17_250 },
      { revenueCents: 238_900, xp: 9_800 }, { revenueCents: 201_450, xp: 8_150 },
      { revenueCents: 132_600, xp: 4_260 }, { revenueCents: 98_200, xp: 3_540 },
    ]),
    topXp: mk([
      { xp: 31_400 }, { xp: 17_250 }, { xp: 9_800 },
      { xp: 8_150 }, { xp: 4_260 }, { xp: 3_540 },
    ]),
    allTime: mk([
      { revenueCents: 1_284_900, xp: 31_400 }, { revenueCents: 964_300, xp: 17_250 },
      { revenueCents: 587_150, xp: 9_800 }, { revenueCents: 402_800, xp: 8_150 },
      { revenueCents: 219_450, xp: 4_260 }, { revenueCents: 141_900, xp: 3_540 },
    ]),
    growth: mk([
      { clicks: 8_412, xp: 4_260 }, { clicks: 6_930, xp: 3_540 },
      { clicks: 5_208, xp: 31_400 }, { clicks: 3_977, xp: 9_800 },
      { clicks: 2_845, xp: 17_250 }, { clicks: 1_930, xp: 8_150 },
    ]),
  };
}

// ── Demo: Marketing Studio ───────────────────────────────────────────────
// The demo studio home runs the real StudioHomeClient on the demo
// persona. Featured templates are the REAL catalog (loaded server-side
// by the demo studio page, exactly like the live studio home); only the
// persona and the creations are sample.

export function buildDemoStudioMe() {
  const me = buildDemoMe();
  return {
    profile: {
      referralCode: me.profile.referralCode,
      customCode: me.profile.customCode,
      status: me.profile.status,
      xp: me.profile.xp,
    },
    rank: me.rank,
    referralLink: me.referralLink,
    discount: me.discount,
  };
}

export function buildDemoStudioCreations() {
  return [
    {
      id: "demo-sc-1",
      templateSlug: null,
      title: "Sample caption — storm season",
      kind: "caption",
      captionText:
        "Storm season is LIVE 🌩️ Watch 74,229 cameras free on WorldEye — my link gets you started, and code DEMO15 takes 15% off your first Pro payment. #ad",
      createdAt: isoDaysAgo(1),
    },
    {
      id: "demo-sc-2",
      templateSlug: null,
      title: "Sample AI caption — harbour sunrise",
      kind: "ai_caption",
      captionText:
        "Golden hour over the harbour, streaming live right now. WorldEye's free globe never sleeps — link in bio. #ad — I earn a commission on subscriptions through my link.",
      createdAt: isoDaysAgo(3),
    },
    {
      id: "demo-sc-3",
      templateSlug: null,
      title: "Sample creation — globe intro card",
      kind: "image",
      captionText: null,
      createdAt: isoDaysAgo(6),
    },
  ];
}
