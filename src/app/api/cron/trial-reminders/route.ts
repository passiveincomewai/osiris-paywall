import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getPreferences } from "@/lib/account/preferences";
import { sendEmail, trialEndingEmail, appUrl } from "@/lib/email";
import {
  trialReminderDue,
  describeStripePrice,
  planByPriceIdFromEnv,
  formatTrialEnd,
  TRIAL_REMINDER_METADATA_KEY,
} from "@/lib/billing/trial-reminders";

export const runtime = "nodejs";

/**
 * Vercel Cron (every 6h): one honest heads-up before a free trial's
 * first charge. Stripe is queried directly — it is the source of truth
 * for trial end and price, neither of which the Subscription table
 * stores — and a successful send stamps the subscription's metadata so
 * no trial ever gets two reminders. Selection rules live in
 * lib/billing/trial-reminders.ts. Protect with CRON_SECRET (Vercel
 * sends it as Bearer token), same as the abandoned-cart cron.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const s = stripe();
  const planByPriceId = planByPriceIdFromEnv(process.env);
  const now = Date.now();
  let checked = 0;
  let reminded = 0;

  let startingAfter: string | undefined;
  for (let page = 0; page < 5; page++) {
    const list = await s.subscriptions.list({
      status: "trialing",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: ["data.customer"],
    });

    for (const sub of list.data) {
      checked++;
      try {
        if (
          !trialReminderDue(
            { status: sub.status, trialEnd: sub.trial_end, metadata: sub.metadata },
            now,
          )
        ) {
          continue;
        }
        const customer = sub.customer;
        const email =
          customer && typeof customer !== "string" && !customer.deleted
            ? customer.email
            : null;
        if (!email) continue;
        // Email-preferences center (item 16): the UserPreference row
        // is the one opt-out store — a user who turned trial reminders
        // off doesn't get one. The marker is still stamped so the
        // subscription isn't re-evaluated every run.
        const accountUser = await db.user
          .findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } })
          .catch(() => null);
        if (accountUser) {
          const prefs = await getPreferences(accountUser.id).catch(() => null);
          if (prefs && !prefs.emailTrialReminders) {
            await s.subscriptions.update(sub.id, {
              metadata: {
                ...sub.metadata,
                [TRIAL_REMINDER_METADATA_KEY]: new Date(now).toISOString(),
              },
            });
            continue;
          }
        }
        const price = sub.items.data[0]?.price;
        if (!price) continue;

        const desc = describeStripePrice(
          {
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring
              ? {
                  interval: price.recurring.interval,
                  interval_count: price.recurring.interval_count,
                }
              : null,
          },
          planByPriceId,
        );
        const { subject, html } = trialEndingEmail({
          planLabel: desc.planLabel,
          chargeLabel: desc.chargeLabel,
          perMonthLabel: desc.perMonthLabel,
          endsOnLabel: formatTrialEnd(sub.trial_end!),
          manageUrl: appUrl("/settings"),
        });
        const sent = await sendEmail(email, subject, html);
        if (sent) {
          await s.subscriptions.update(sub.id, {
            metadata: {
              ...sub.metadata,
              [TRIAL_REMINDER_METADATA_KEY]: new Date(now).toISOString(),
            },
          });
          reminded++;
        }
      } catch {
        // Leave for the next run.
      }
    }

    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1].id;
  }

  return NextResponse.json({ ok: true, checked, reminded });
}
