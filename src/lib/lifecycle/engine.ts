// ── Lifecycle email engine ───────────────────────────────────────────
// The runner: pulls candidates from the data the site already produces
// (User, PageView, CheckoutAttempt, ReferralAttribution, Commission,
// Subscription + Stripe reads), evaluates the pure triggers, applies
// the compliance guards, sends through the established user-mail path
// (src/lib/email.ts → Resend) and writes the send log.
//
// Discipline, mirroring the alert-suite jobs:
//  - NEVER double-send: a "sent" LifecycleEmailLog row for
//    (userId, template, contextKey) blocks any repeat, forever.
//  - Windows do the baseline's job: every trigger only looks at fresh
//    events (see config.ts), so the first production run cannot blast
//    the historical user base.
//  - A failed send writes NO log row — the next run retries it.
//  - Dry-run renders everything due and sends/logs nothing.
//  - Each section is isolated: one trigger's data problem can't stop
//    the others; failures land in summary.errors.
//
// The trial-ENDING email is intentionally absent — /api/cron/
// trial-reminders owns that moment (see triggers.ts).

import { db } from "../db";
import { stripe } from "../stripe";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { checkoutPlanSummary } from "../billing/trial-checkout";
import { formatMoney, formatTrialEnd, planByPriceIdFromEnv } from "../billing/trial-reminders";
import {
  currentDiscountOffer,
  MARKETING_CAP_WINDOW_MS,
  INTEREST_ACTIVITY_WINDOW_MS,
  RETARGET_PRICING_WINDOW_MS,
  AFFILIATE_SIGNUP_WINDOW_MS,
  AFFILIATE_COMMISSION_WINDOW_MS,
  TRIAL_WINBACK_WINDOW_MS,
  REGION_WINDOW_MS,
  DAY_MS,
} from "./config";
import { evaluateGuards, type EmailKind } from "./guards";
import { inferPlanInterest, type PlanKey } from "./interest";
import {
  welcomeDue,
  interestFollowupDue,
  retargetPricingDue,
  retargetCheckoutDue,
  trialStartedDue,
  trialWinbackDue,
  affiliateSignupDue,
  affiliateFirstCommissionDue,
  regionInterestDue,
} from "./triggers";
import {
  aggregateRegionStats,
  summarizeRegionInterest,
  COUNTRY_PATH_PREFIX,
} from "./region";
import countriesIndex from "../../data/camera-countries.json";

const COUNTRY_BY_SLUG = new Map(
  (countriesIndex as { countries: { slug: string; name: string; count: number }[] }).countries.map(
    (c) => [c.slug, c] as const,
  ),
);
import {
  welcomeDiscountEmail,
  interestFollowupEmail,
  retargetPricingEmail,
  retargetCheckoutEmail,
  trialStartedEmail,
  trialEndedWinbackEmail,
  affiliateSignupEmail,
  affiliateFirstCommissionEmail,
  regionInterestEmail,
  type RenderedEmail,
} from "./templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "./unsubscribe";

export type LifecycleTemplate =
  | "welcome_discount"
  | "interest_followup"
  | "retarget_pricing"
  | "retarget_checkout"
  | "trial_started"
  | "trial_ended_winback"
  | "affiliate_signup"
  | "affiliate_first_commission"
  | "region_interest"
  | "campaign";

export interface SentRecord {
  template: LifecycleTemplate;
  userId: string;
  email: string;
  subject: string;
  kind: EmailKind;
  /** Present only in dry-run: the exact HTML that would have been sent. */
  html?: string;
}

export interface LifecycleRunSummary {
  dryRun: boolean;
  evaluated: number;
  sent: SentRecord[];
  /** Skip counts keyed by guard/trigger reason. */
  skipped: Record<string, number>;
  errors: string[];
}

export interface LifecycleRunOptions {
  dryRun?: boolean;
  now?: Date;
  env?: Record<string, string | undefined>;
  /** Injectable for tests; defaults to the Resend-backed sendEmail. */
  send?: (to: string, subject: string, html: string) => Promise<boolean>;
}

interface RecipientUser {
  id: string;
  email: string | null;
  name: string | null;
  emailOptOut: boolean;
}

const LIVE_STATUSES = new Set(["active", "trialing"]);

export async function runLifecycleEmails(
  opts: LifecycleRunOptions = {},
): Promise<LifecycleRunSummary> {
  const now = opts.now ?? new Date();
  const env = opts.env ?? process.env;
  const send = opts.send ?? sendEmail;
  const offer = currentDiscountOffer(env, now);
  const secret = unsubscribeSecret(env);
  const summary: LifecycleRunSummary = {
    dryRun: !!opts.dryRun,
    evaluated: 0,
    sent: [],
    skipped: {},
    errors: [],
  };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  const unsubFor = (userId: string) => buildUnsubscribeUrl(appBaseUrl(), userId, secret);

  /** Guards → render → send → log. The single path every email takes. */
  async function deliver(input: {
    user: RecipientUser;
    template: LifecycleTemplate;
    contextKey: string;
    kind: EmailKind;
    render: () => RenderedEmail;
  }): Promise<void> {
    summary.evaluated++;
    const { user, template, contextKey, kind } = input;
    const existing = await db.lifecycleEmailLog.findUnique({
      where: { userId_template_contextKey: { userId: user.id, template, contextKey } },
      select: { id: true, status: true },
    });
    const marketingSendsInWindow =
      kind === "marketing"
        ? await db.lifecycleEmailLog.count({
            where: {
              userId: user.id,
              kind: "marketing",
              status: "sent",
              createdAt: { gte: new Date(now.getTime() - MARKETING_CAP_WINDOW_MS) },
            },
          })
        : 0;
    const verdict = evaluateGuards({
      email: user.email,
      kind,
      emailOptOut: user.emailOptOut,
      alreadySent: existing?.status === "sent",
      marketingSendsInWindow,
    });
    if (!verdict.allow) {
      skip(verdict.reason);
      return;
    }
    const rendered = input.render();
    if (summary.dryRun) {
      summary.sent.push({
        template,
        userId: user.id,
        email: user.email!,
        subject: rendered.subject,
        kind,
        html: rendered.html,
      });
      return;
    }
    const ok = await send(user.email!, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      return;
    }
    try {
      await db.lifecycleEmailLog.create({
        data: {
          userId: user.id,
          recipientEmail: user.email!,
          template,
          contextKey,
          kind,
          subject: rendered.subject,
          status: "sent",
        },
      });
    } catch {
      // Unique-violation race: another run logged it first. The email
      // went out once from this run; count it as sent either way.
    }
    summary.sent.push({ template, userId: user.id, email: user.email!, subject: rendered.subject, kind });
  }

  const section = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      summary.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const userSelect = { id: true, email: true, name: true, emailOptOut: true } as const;

  async function hasLiveSubscription(userId: string): Promise<boolean> {
    const sub = await db.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    return !!sub && LIVE_STATUSES.has(sub.status);
  }

  async function attemptsForEmail(email: string, sinceMs: number) {
    return db.checkoutAttempt.findMany({
      where: { email: email.toLowerCase(), createdAt: { gte: new Date(now.getTime() - sinceMs) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, plan: true, status: true, createdAt: true, remindedAt: true },
    });
  }

  async function pricingViewsForUser(userId: string, sinceMs: number) {
    return db.pageView.findMany({
      where: {
        userId,
        path: "/pricing",
        event: null,
        createdAt: { gte: new Date(now.getTime() - sinceMs) },
      },
      orderBy: { createdAt: "desc" },
      select: { durationSec: true, createdAt: true },
    });
  }

  // ── (a) Welcome + discount ─────────────────────────────────────────
  await section("welcome", async () => {
    const users = await db.user.findMany({
      where: {
        email: { not: null },
        createdAt: {
          gte: new Date(now.getTime() - 48 * 3600_000),
          lte: new Date(now.getTime() - 15 * 60_000),
        },
      },
      select: { ...userSelect, createdAt: true },
      take: 200,
    });
    for (const u of users) {
      const verdict = welcomeDue(
        { userCreatedAt: u.createdAt, hasLiveSubscription: await hasLiveSubscription(u.id) },
        now,
      );
      if (!verdict.due) continue;
      await deliver({
        user: u,
        template: "welcome_discount",
        contextKey: "",
        kind: "marketing",
        render: () =>
          welcomeDiscountEmail({ name: u.name, offer, unsubscribeUrl: unsubFor(u.id) }),
      });
    }
  });

  // ── (b) Interest-matched follow-up ─────────────────────────────────
  await section("interest_followup", async () => {
    const attempts = await db.checkoutAttempt.findMany({
      where: {
        plan: { not: null },
        email: { not: null },
        createdAt: { gte: new Date(now.getTime() - INTEREST_ACTIVITY_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { email: true },
      take: 500,
    });
    const emails = [...new Set(attempts.map((a) => a.email!.toLowerCase()))];
    for (const email of emails) {
      const user = await db.user.findFirst({ where: { email }, select: { ...userSelect, createdAt: true } });
      if (!user) continue;
      const interest = inferPlanInterest({
        attempts: await attemptsForEmail(email, 90 * DAY_MS),
        pricingViews: await pricingViewsForUser(user.id, INTEREST_ACTIVITY_WINDOW_MS),
      });
      const verdict = interestFollowupDue(
        {
          userCreatedAt: user.createdAt,
          interest,
          hasLiveSubscription: await hasLiveSubscription(user.id),
        },
        now,
      );
      if (!verdict.due || !interest.plan) continue;
      const summaryForPlan = checkoutPlanSummary(interest.plan);
      await deliver({
        user,
        template: "interest_followup",
        contextKey: interest.plan,
        kind: "marketing",
        render: () =>
          interestFollowupEmail({
            name: user.name,
            planName: summaryForPlan?.name ?? interest.plan!,
            planPriceLabel: summaryForPlan
              ? `${summaryForPlan.price}${summaryForPlan.per}`
              : "",
            offer,
            unsubscribeUrl: unsubFor(user.id),
          }),
      });
    }
  });

  // ── (c1) Pricing retargeting ───────────────────────────────────────
  await section("retarget_pricing", async () => {
    const views = await db.pageView.findMany({
      where: {
        path: "/pricing",
        event: null,
        userId: { not: null },
        createdAt: { gte: new Date(now.getTime() - RETARGET_PRICING_WINDOW_MS) },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 500,
    });
    for (const v of views) {
      const user = await db.user.findUnique({ where: { id: v.userId! }, select: userSelect });
      if (!user?.email) continue;
      const attempts = await attemptsForEmail(user.email, 90 * DAY_MS);
      const interest = inferPlanInterest({
        attempts,
        pricingViews: await pricingViewsForUser(user.id, RETARGET_PRICING_WINDOW_MS),
      });
      const verdict = retargetPricingDue(
        {
          interest,
          lastAttemptAt: attempts.length > 0 ? attempts[0].createdAt : null,
          hasLiveSubscription: await hasLiveSubscription(user.id),
        },
        now,
      );
      if (!verdict.due) continue;
      await deliver({
        user,
        template: "retarget_pricing",
        contextKey: "",
        kind: "marketing",
        render: () =>
          retargetPricingEmail({ name: user.name, offer, unsubscribeUrl: unsubFor(user.id) }),
      });
    }
  });

  // ── (c2) Checkout retargeting (second touch, with code) ────────────
  await section("retarget_checkout", async () => {
    const attempts = await db.checkoutAttempt.findMany({
      where: {
        status: "reminded",
        email: { not: null },
        createdAt: { lte: new Date(now.getTime() - 72 * 3600_000) },
        remindedAt: { lte: new Date(now.getTime() - 48 * 3600_000) },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    for (const a of attempts) {
      const user = await db.user.findFirst({
        where: { email: a.email!.toLowerCase() },
        select: userSelect,
      });
      if (!user) {
        skip("no_account");
        continue;
      }
      const verdict = retargetCheckoutDue(
        {
          attempt: { status: a.status, createdAt: a.createdAt, remindedAt: a.remindedAt },
          hasLiveSubscription: await hasLiveSubscription(user.id),
        },
        now,
      );
      if (!verdict.due) continue;
      const plan = checkoutPlanSummary(a.plan);
      await deliver({
        user,
        template: "retarget_checkout",
        contextKey: a.id,
        kind: "marketing",
        render: () =>
          retargetCheckoutEmail({
            name: user.name,
            planName: plan?.name ?? null,
            offer,
            unsubscribeUrl: unsubFor(user.id),
          }),
      });
    }
  });

  // ── (d) Trial lifecycle (Stripe is the source of truth) ────────────
  const planByPriceId = planByPriceIdFromEnv(env);
  const planLabelsFor = (priceId: string | null | undefined) => {
    const key = priceId ? (planByPriceId[priceId] as PlanKey | "enterprise" | undefined) : undefined;
    const summaryForPlan = key ? checkoutPlanSummary(key) : null;
    return {
      planName: summaryForPlan?.name ?? "Pro",
      tier: (key === "annual" || key === "enterprise" ? "vip" : "pro") as "pro" | "vip",
    };
  };

  await section("trial_started", async () => {
    const s = stripe();
    const list = await s.subscriptions.list({
      status: "trialing",
      created: { gte: Math.floor((now.getTime() - DAY_MS) / 1000) },
      limit: 100,
    });
    for (const sub of list.data) {
      const dbSub = await db.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { userId: true, stripePriceId: true },
      });
      if (!dbSub) continue;
      const verdict = trialStartedDue(
        { stripeStatus: sub.status, subscriptionCreatedAt: new Date(sub.created * 1000) },
        now,
      );
      if (!verdict.due) continue;
      const user = await db.user.findUnique({ where: { id: dbSub.userId }, select: userSelect });
      if (!user) continue;
      const labels = planLabelsFor(sub.items.data[0]?.price?.id ?? dbSub.stripePriceId);
      await deliver({
        user,
        template: "trial_started",
        contextKey: sub.id,
        kind: "transactional",
        render: () =>
          trialStartedEmail({
            name: user.name,
            planName: labels.planName,
            tier: labels.tier,
            trialEndsLabel: sub.trial_end ? formatTrialEnd(sub.trial_end) : null,
          }),
      });
    }
  });

  await section("trial_ended_winback", async () => {
    const s = stripe();
    for (const status of ["canceled", "incomplete_expired"] as const) {
      const list = await s.subscriptions.list({
        status,
        created: { gte: Math.floor((now.getTime() - (TRIAL_WINBACK_WINDOW_MS + 30 * DAY_MS)) / 1000) },
        limit: 100,
      });
      for (const sub of list.data) {
        if (!sub.trial_end) continue;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const dbSub = await db.subscription.findFirst({
          where: { stripeCustomerId: customerId },
          select: { userId: true, status: true, stripeSubscriptionId: true, stripePriceId: true },
        });
        if (!dbSub) continue;
        const verdict = trialWinbackDue(
          {
            stripeStatus: sub.status,
            trialEndSec: sub.trial_end,
            hasLiveSubscription:
              LIVE_STATUSES.has(dbSub.status) && dbSub.stripeSubscriptionId !== sub.id,
          },
          now,
        );
        if (!verdict.due) continue;
        const user = await db.user.findUnique({ where: { id: dbSub.userId }, select: userSelect });
        if (!user) continue;
        const labels = planLabelsFor(sub.items.data[0]?.price?.id ?? dbSub.stripePriceId);
        await deliver({
          user,
          template: "trial_ended_winback",
          contextKey: sub.id,
          kind: "marketing",
          render: () =>
            trialEndedWinbackEmail({
              name: user.name,
              planName: labels.planName,
              offer,
              unsubscribeUrl: unsubFor(user.id),
            }),
        });
      }
    }
  });

  // ── (e1) Affiliate signup notifications ────────────────────────────
  await section("affiliate_signup", async () => {
    const attributions = await db.referralAttribution.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - AFFILIATE_SIGNUP_WINDOW_MS) } },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        affiliate: { include: { user: { select: userSelect } } },
      },
    });
    for (const attr of attributions) {
      if (attr.affiliate.userId === attr.referredUserId) continue;
      const verdict = affiliateSignupDue({ attributionCreatedAt: attr.createdAt }, now);
      if (!verdict.due) continue;
      const referred = await db.user.findUnique({
        where: { id: attr.referredUserId },
        select: { name: true },
      });
      const user = attr.affiliate.user;
      await deliver({
        user,
        template: "affiliate_signup",
        contextKey: attr.id,
        kind: "transactional",
        render: () =>
          affiliateSignupEmail({ name: user.name, referredName: referred?.name ?? null }),
      });
    }
  });

  // ── (e2) Affiliate first commission ────────────────────────────────
  await section("affiliate_first_commission", async () => {
    const commissions = await db.commission.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - AFFILIATE_COMMISSION_WINDOW_MS) } },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { affiliate: { include: { user: { select: userSelect } } } },
    });
    for (const c of commissions) {
      const earlier = await db.commission.count({
        where: { affiliateProfileId: c.affiliateProfileId, createdAt: { lt: c.createdAt } },
      });
      const verdict = affiliateFirstCommissionDue(
        { commissionCreatedAt: c.createdAt, isFirstCommission: earlier === 0 },
        now,
      );
      if (!verdict.due) continue;
      const user = c.affiliate.user;
      await deliver({
        user,
        template: "affiliate_first_commission",
        contextKey: c.id,
        kind: "transactional",
        render: () =>
          affiliateFirstCommissionEmail({
            name: user.name,
            amountLabel: formatMoney(c.amountCents, c.currency),
          }),
      });
    }
  });

  // ── (f) Region interest ────────────────────────────────────────────
  await section("region_interest", async () => {
    const since = new Date(now.getTime() - REGION_WINDOW_MS);
    const actives = await db.pageView.findMany({
      where: {
        userId: { not: null },
        path: { startsWith: COUNTRY_PATH_PREFIX },
        createdAt: { gte: since },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 500,
    });
    for (const a of actives) {
      const user = await db.user.findUnique({
        where: { id: a.userId! },
        select: userSelect,
      });
      if (!user?.email) continue;
      const rows = await db.pageView.findMany({
        where: {
          userId: user.id,
          path: { startsWith: COUNTRY_PATH_PREFIX },
          createdAt: { gte: since },
        },
        select: { path: true, event: true, durationSec: true },
        take: 2000,
      });
      const interest = summarizeRegionInterest(aggregateRegionStats(rows));
      const verdict = regionInterestDue(
        { interest, hasLiveSubscription: await hasLiveSubscription(user.id) },
        now,
      );
      if (!verdict.due || !interest) continue;
      const entry = COUNTRY_BY_SLUG.get(interest.slug);
      if (!entry) continue; // a slug we can't name is not an email we send
      await deliver({
        user,
        template: "region_interest",
        contextKey: interest.slug,
        kind: "marketing",
        render: () =>
          regionInterestEmail({
            name: user.name,
            countryName: entry.name,
            countrySlug: interest.slug,
            opens: interest.opens,
            countryCameraCount: entry.count,
            offer,
            unsubscribeUrl: unsubFor(user.id),
          }),
      });
    }
  });

  return summary;
}
