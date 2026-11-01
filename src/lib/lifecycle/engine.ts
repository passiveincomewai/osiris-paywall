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
import { formatMoney, formatTrialEnd, planByPriceIdFromEnv, describeStripePrice } from "../billing/trial-reminders";
import {
  currentDiscountOffer,
  MARKETING_CAP_WINDOW_MS,
  WELCOME_MIN_AGE_MS,
  WELCOME_MAX_AGE_MS,
  INTEREST_ACTIVITY_WINDOW_MS,
  RETARGET_PRICING_WINDOW_MS,
  AFFILIATE_SIGNUP_WINDOW_MS,
  AFFILIATE_COMMISSION_WINDOW_MS,
  TRIAL_WINBACK2_MAX_AGE_MS,
  RENEWAL_NOTICE_WINDOW_MS,
  ONBOARDING_DAY5_MAX_AGE_MS,
  INACTIVE_STAGE1_MIN_MS,
  VERIFICATION_REMINDER_MIN_AGE_MS,
  VERIFICATION_REMINDER_MAX_AGE_MS,
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
  trialWinbackSecondDue,
  renewalNoticeDue,
  cancellationSaveDue,
  subscriptionEndedWinbackDue,
  onboardingDripDue,
  inactiveDue,
  trialExitSurveyDue,
  verificationReminderDue,
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
  trialEndedWinbackLateEmail,
  annualRenewalNoticeEmail,
  cancellationSaveEmail,
  subscriptionEndedWinbackEmail,
  involuntaryChurnWinbackEmail,
  onboardingDay2Email,
  onboardingDay5Email,
  inactiveReengagementEmail,
  trialExitSurveyEmail,
  verificationReminderEmail,
  affiliateSignupEmail,
  affiliateFirstCommissionEmail,
  regionInterestEmail,
  type RenderedEmail,
} from "./templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "./unsubscribe";
import { isVerifiedRow } from "../auth-verification";

export type LifecycleTemplate =
  | "welcome_discount"
  | "interest_followup"
  | "retarget_pricing"
  | "retarget_checkout"
  | "trial_started"
  | "trial_ended_winback"
  | "trial_ended_winback_30d"
  | "annual_renewal_notice"
  | "cancellation_save"
  | "subscription_ended_winback"
  | "subscription_ended_winback_involuntary"
  | "onboarding_day2"
  | "onboarding_day5"
  | "inactive_reengagement"
  | "trial_exit_survey"
  | "verification_reminder"
  | "affiliate_signup"
  | "affiliate_first_commission"
  | "region_interest"
  | "payment_failed_recovery"
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
    // The welcome is exempt from the marketing cap: it is the first
    // touch the cap's spacing exists to protect, and a follow-up
    // template (retarget/interest) must never be able to consume its
    // slot first — a minutes-old user who views /pricing would
    // otherwise lose the welcome for good (the cap lifts at +48h,
    // exactly when the welcome window closes). Sections run welcome
    // first, so once it logs, same-batch follow-ups see the cap spent.
    const marketingSendsInWindow =
      kind === "marketing" && template !== "welcome_discount"
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
        // Window comes from config.ts (owner policy: near-instant
        // welcome, 48h cap) — never hardcode it here; a hardcoded
        // 15-minute floor once silently overrode the configured
        // 2-minute minimum and let retargeting steal the welcome's
        // marketing-cap slot for brand-new users.
        createdAt: {
          gte: new Date(now.getTime() - WELCOME_MAX_AGE_MS),
          lte: new Date(now.getTime() - WELCOME_MIN_AGE_MS),
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
        // Wide enough for the SECOND win-back band too: a sub created
        // up to (38d band + a long trial) ago can still be in it.
        created: { gte: Math.floor((now.getTime() - (TRIAL_WINBACK2_MAX_AGE_MS + 14 * DAY_MS)) / 1000) },
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
        const triggerInput = {
          stripeStatus: sub.status,
          trialEndSec: sub.trial_end,
          hasLiveSubscription:
            LIVE_STATUSES.has(dbSub.status) && dbSub.stripeSubscriptionId !== sub.id,
        };
        const verdict = trialWinbackDue(triggerInput, now);
        const secondVerdict = verdict.due ? null : trialWinbackSecondDue(triggerInput, now);
        if (!verdict.due && !secondVerdict?.due) continue;
        const user = await db.user.findUnique({ where: { id: dbSub.userId }, select: userSelect });
        if (!user) continue;
        const labels = planLabelsFor(sub.items.data[0]?.price?.id ?? dbSub.stripePriceId);
        if (verdict.due) {
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
        } else {
          await deliver({
            user,
            template: "trial_ended_winback_30d",
            contextKey: sub.id,
            kind: "marketing",
            render: () =>
              trialEndedWinbackLateEmail({
                name: user.name,
                planName: labels.planName,
                offer,
                unsubscribeUrl: unsubFor(user.id),
              }),
          });
        }
      }
    }
  });

  // ── (g) Annual renewal advance notice (transactional) ────────────
  // DB rows nominate candidates (live, non-cancelling, period ending
  // inside the window); the live Stripe price is the only honest
  // source for "is this annual" and the exact amount, so both come
  // from describeStripePrice at send time — never from restated
  // constants. Once per (subscription, period end) via the log.
  await section("annual_renewal_notice", async () => {
    const s = stripe();
    const rows = await db.subscription.findMany({
      where: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          gt: now,
          lte: new Date(now.getTime() + RENEWAL_NOTICE_WINDOW_MS),
        },
      },
      select: {
        userId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        status: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true,
      },
      take: 200,
    });
    for (const row of rows) {
      let price: Awaited<ReturnType<typeof s.prices.retrieve>> | null = null;
      try {
        price = await s.prices.retrieve(row.stripePriceId);
      } catch {
        continue; // an unreadable price means no honest amount — skip
      }
      const verdict = renewalNoticeDue(
        {
          stripeStatus: row.status,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd,
          periodEnd: row.currentPeriodEnd,
          isAnnual: price.recurring?.interval === "year",
        },
        now,
      );
      if (!verdict.due) continue;
      const user = await db.user.findUnique({ where: { id: row.userId }, select: userSelect });
      if (!user) continue;
      const desc = describeStripePrice(
        {
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring
            ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
            : null,
        },
        planByPriceId,
      );
      await deliver({
        user,
        template: "annual_renewal_notice",
        contextKey: `${row.stripeSubscriptionId}:${row.currentPeriodEnd.toISOString().slice(0, 10)}`,
        kind: "transactional",
        render: () =>
          annualRenewalNoticeEmail({
            name: user.name,
            planLabel: desc.planLabel,
            chargeLabel: desc.chargeLabel,
            perMonthLabel: desc.perMonthLabel,
            renewsOnLabel: formatTrialEnd(Math.floor(row.currentPeriodEnd.getTime() / 1000)),
          }),
      });
    }
  });

  // ── (h) Cancellation save (marketing) ──────────────────────────────
  // State-based: any live Stripe subscription sitting in
  // cancel_at_period_end gets one save email per period. Stripe is
  // the source of truth for the state; the DB row resolves the user.
  await section("cancellation_save", async () => {
    const s = stripe();
    for (const status of ["active", "trialing"] as const) {
      const list = await s.subscriptions.list({ status, limit: 100 });
      for (const sub of list.data) {
        const periodEndSec = sub.items.data[0]?.current_period_end;
        if (!periodEndSec) continue;
        const verdict = cancellationSaveDue(
          {
            stripeStatus: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            periodEnd: new Date(periodEndSec * 1000),
          },
          now,
        );
        if (!verdict.due) continue;
        const dbSub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true, stripePriceId: true },
        });
        if (!dbSub) continue;
        const user = await db.user.findUnique({ where: { id: dbSub.userId }, select: userSelect });
        if (!user) continue;
        const labels = planLabelsFor(sub.items.data[0]?.price?.id ?? dbSub.stripePriceId);
        await deliver({
          user,
          template: "cancellation_save",
          contextKey: `${sub.id}:${new Date(periodEndSec * 1000).toISOString().slice(0, 10)}`,
          kind: "marketing",
          render: () =>
            cancellationSaveEmail({
              name: user.name,
              planName: labels.planName,
              accessUntilLabel: formatTrialEnd(periodEndSec),
              offer,
              unsubscribeUrl: unsubFor(user.id),
            }),
        });
      }
    }
  });

  // ── (i) Paid subscription ended → win-back (marketing) ─────────────
  await section("subscription_ended_winback", async () => {
    const s = stripe();
    const list = await s.subscriptions.list({
      status: "canceled",
      created: { gte: Math.floor((now.getTime() - 75 * DAY_MS) / 1000) },
      limit: 100,
      expand: ["data.latest_invoice"],
    });
    for (const sub of list.data) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const dbSub = await db.subscription.findFirst({
        where: { stripeCustomerId: customerId },
        select: { userId: true, status: true, stripeSubscriptionId: true, stripePriceId: true },
      });
      if (!dbSub) continue;
      const verdict = subscriptionEndedWinbackDue(
        {
          stripeStatus: sub.status,
          trialEndSec: sub.trial_end,
          canceledAtSec: sub.canceled_at,
          hasLiveSubscription:
            LIVE_STATUSES.has(dbSub.status) && dbSub.stripeSubscriptionId !== sub.id,
        },
        now,
      );
      if (!verdict.due) continue;
      const user = await db.user.findUnique({ where: { id: dbSub.userId }, select: userSelect });
      if (!user) continue;
      // R4 split: if the subscription's final invoice is still unpaid
      // (open) or written off (uncollectible), the sub died of a failed
      // payment, not a decision — that population gets the involuntary
      // variant. The two templates share the once-only discipline via
      // an either-template log check, so nobody gets both.
      const latestInvoice =
        typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
      const involuntary =
        latestInvoice?.status === "uncollectible" || latestInvoice?.status === "open";
      const priorTouch = await db.lifecycleEmailLog.findFirst({
        where: {
          userId: user.id,
          contextKey: sub.id,
          template: { in: ["subscription_ended_winback", "subscription_ended_winback_involuntary"] },
        },
        select: { id: true },
      });
      if (priorTouch) continue;
      const labels = planLabelsFor(sub.items.data[0]?.price?.id ?? dbSub.stripePriceId);
      if (involuntary) {
        await deliver({
          user,
          template: "subscription_ended_winback_involuntary",
          contextKey: sub.id,
          kind: "marketing",
          render: () =>
            involuntaryChurnWinbackEmail({
              name: user.name,
              planName: labels.planName,
              offer,
              unsubscribeUrl: unsubFor(user.id),
            }),
        });
      } else {
        await deliver({
          user,
          template: "subscription_ended_winback",
          contextKey: sub.id,
          kind: "marketing",
          render: () =>
            subscriptionEndedWinbackEmail({
              name: user.name,
              planName: labels.planName,
              offer,
              unsubscribeUrl: unsubFor(user.id),
            }),
        });
      }
    }
  });

  // ── (j) Onboarding drip (marketing) ────────────────────────────────
  // Verified free accounts only (unverified accounts get the R1
  // verification reminder instead; subscribers have a live sub row).
  await section("onboarding_drip", async () => {
    const candidates = await db.user.findMany({
      where: {
        emailVerified: { not: null },
        createdAt: { gte: new Date(now.getTime() - ONBOARDING_DAY5_MAX_AGE_MS) },
      },
      select: { id: true, email: true, name: true, emailOptOut: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const planLines = (["weekly", "monthly", "annual"] as const)
      .map((k) => checkoutPlanSummary(k))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => `${s.name} — ${s.price}${s.per}${s.trialLabel ? ` · ${s.trialLabel}` : ""}`);
    for (const u of candidates) {
      const dbSub = await db.subscription.findUnique({
        where: { userId: u.id },
        select: { status: true },
      });
      const v = onboardingDripDue(
        { createdAt: u.createdAt, hasLiveSubscription: !!dbSub && LIVE_STATUSES.has(dbSub.status) },
        now,
      );
      if (v.day2.due) {
        await deliver({
          user: u,
          template: "onboarding_day2",
          contextKey: "account",
          kind: "marketing",
          render: () => onboardingDay2Email({ name: u.name, unsubscribeUrl: unsubFor(u.id) }),
        });
      } else if (v.day5.due) {
        await deliver({
          user: u,
          template: "onboarding_day5",
          contextKey: "account",
          kind: "marketing",
          render: () =>
            onboardingDay5Email({ name: u.name, planLines, unsubscribeUrl: unsubFor(u.id) }),
        });
      }
    }
  });

  // ── (k) Inactive re-engagement (marketing) ─────────────────────────
  await section("inactive_reengagement", async () => {
    const candidates = await db.user.findMany({
      where: {
        emailVerified: { not: null },
        createdAt: {
          lte: new Date(now.getTime() - INACTIVE_STAGE1_MIN_MS),
          gte: new Date(now.getTime() - 120 * DAY_MS),
        },
      },
      select: { id: true, email: true, name: true, emailOptOut: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    for (const u of candidates) {
      const dbSub = await db.subscription.findUnique({
        where: { userId: u.id },
        select: { status: true },
      });
      const lastView = await db.pageView.findFirst({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const quietSince =
        lastView && lastView.createdAt > u.createdAt ? lastView.createdAt : u.createdAt;
      const v = inactiveDue(
        { quietSince, hasLiveSubscription: !!dbSub && LIVE_STATUSES.has(dbSub.status) },
        now,
      );
      if (v.stage14.due) {
        await deliver({
          user: u,
          template: "inactive_reengagement",
          contextKey: "stage14",
          kind: "marketing",
          render: () =>
            inactiveReengagementEmail({ name: u.name, stage: 14, unsubscribeUrl: unsubFor(u.id) }),
        });
      } else if (v.stage30.due) {
        await deliver({
          user: u,
          template: "inactive_reengagement",
          contextKey: "stage30",
          kind: "marketing",
          render: () =>
            inactiveReengagementEmail({ name: u.name, stage: 30, unsubscribeUrl: unsubFor(u.id) }),
        });
      }
    }
  });

  // ── (l) Exit survey (marketing) ────────────────────────────────────
  await section("trial_exit_survey", async () => {
    const s = stripe();
    for (const status of ["canceled", "incomplete_expired"] as const) {
      const list = await s.subscriptions.list({
        status,
        created: { gte: Math.floor((now.getTime() - 20 * DAY_MS) / 1000) },
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
        const verdict = trialExitSurveyDue(
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
          template: "trial_exit_survey",
          contextKey: sub.id,
          kind: "marketing",
          render: () =>
            trialExitSurveyEmail({
              name: user.name,
              planName: labels.planName,
              unsubscribeUrl: unsubFor(user.id),
            }),
        });
      }
    }
  });

  // ── (m) Verification reminder (marketing, R1) ──────────────────────
  // Column-null users only at the query; the verdict re-checks with
  // isVerifiedRow so a provider-verified (Google) account whose stamp
  // hasn't healed is never reminded.
  await section("verification_reminder", async () => {
    const candidates = await db.user.findMany({
      where: {
        emailVerified: null,
        createdAt: {
          gte: new Date(now.getTime() - VERIFICATION_REMINDER_MAX_AGE_MS),
          lte: new Date(now.getTime() - VERIFICATION_REMINDER_MIN_AGE_MS),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailOptOut: true,
        createdAt: true,
        emailVerified: true,
        accounts: { select: { provider: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    for (const u of candidates) {
      const verdict = verificationReminderDue(
        { verified: isVerifiedRow(u), createdAt: u.createdAt },
        now,
      );
      if (!verdict.due) continue;
      await deliver({
        user: u,
        template: "verification_reminder",
        contextKey: "account",
        kind: "marketing",
        render: () =>
          verificationReminderEmail({ name: u.name, unsubscribeUrl: unsubFor(u.id) }),
      });
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
