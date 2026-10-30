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
