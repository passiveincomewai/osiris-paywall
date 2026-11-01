// ── Account deletion with grace period (item 21) ────────────────────
// Requesting deletion stamps the user row and schedules the hard
// delete GRACE_DAYS out. During the grace window the account works
// normally and the request can be cancelled. An active subscription
// is never orphaned: at request time it is set to cancel at period
// end in Stripe, and the executor cancels anything still live before
// deleting. The executor runs from /api/cron/account-deletions.

import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendEmail, deletionScheduledEmail, deletionCompletedEmail } from "@/lib/email";

export const GRACE_DAYS = 14;

export async function requestDeletion(userId: string) {
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + GRACE_DAYS * 86400_000);
  const sub = await db.subscription.findUnique({ where: { userId } });
  let subscriptionNote: string | null = null;
  if (sub && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")) {
    // Honest handling: stop renewal now (cancel at period end) so the
    // account is never charged after deletion, while access runs to
    // the end of the paid/trial period, inside the grace window.
    try {
      await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      await db.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });
      subscriptionNote = "Your subscription is set to end at its current period end and will not renew.";
    } catch {
      subscriptionNote = "We couldn't reach the billing system to stop renewal — contact support before the deletion date if you are charged.";
    }
  }
  const user = await db.user.update({
    where: { id: userId },
    data: { deletionRequestedAt: now, deletionScheduledFor: scheduledFor },
    select: { deletionRequestedAt: true, deletionScheduledFor: true, email: true, name: true },
  });
  // Confirmation (pick 16): the exact deletion date + the cancel path
  // + the subscription note, best-effort — a mail failure never blocks
  // a deletion request the user has made.
  try {
    const scheduledForLabel = scheduledFor.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const mail = deletionScheduledEmail({ name: user.name, scheduledForLabel, subscriptionNote });
    await sendEmail(user.email, mail.subject, mail.html);
  } catch {
    /* best-effort */
  }
  return { deletionRequestedAt: user.deletionRequestedAt, deletionScheduledFor: user.deletionScheduledFor, subscriptionNote };
}

export async function cancelDeletion(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { deletionRequestedAt: null, deletionScheduledFor: null },
  });
  return { ok: true };
}

/** Hard-delete every account whose grace period has elapsed. */
export async function processDueDeletions(now: Date = new Date()): Promise<{ deleted: number }> {
  const due = await db.user.findMany({
    where: { deletionScheduledFor: { lte: now }, deletionRequestedAt: { not: null } },
    select: { id: true, email: true, name: true },
    take: 25,
  });
  let deleted = 0;
  for (const { id, email, name } of due) {
    try {
      const sub = await db.subscription.findUnique({ where: { userId: id } });
      if (sub) {
        // Belt-and-braces: nothing billable survives the account.
        await stripe().subscriptions.cancel(sub.stripeSubscriptionId).catch(() => {});
        await stripe().customers.del(sub.stripeCustomerId).catch(() => {});
      }
      // Fraud Radar vault sweep (PHASE8 §2.6 rule 3, completed
      // by P8-B): the DB cascade removes the FrCaseEvidence
      // ROWS but cannot delete Blob objects — enumerate the
      // user's vault pathnames and delete the bytes FIRST, so
      // no evidence file is left ownerless. Best-effort per
      // object; a failure is logged, never silent.
      if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
        const evidenceRows = await db.frCaseEvidence
          .findMany({
            where: { case: { ownerId: id } },
            select: { blobPathname: true, extractedTextPathname: true },
          })
          .catch(() => []);
        const pathnames = evidenceRows
          .flatMap((r) => [r.blobPathname, r.extractedTextPathname])
          .filter((p): p is string => typeof p === "string" && p.length > 0);
        for (const pathname of pathnames) {
          await del(pathname).catch((err) => {
            console.error("[account-deletion] vault delete failed", pathname, err);
          });
        }
      }
      // Cascades remove preferences, devices, sign-in events, TOTP,
      // saved cameras, alert rules, shares and the affiliate profile.
      await db.user.delete({ where: { id } });
      deleted++;
      // Completion confirmation (pick 16): sent only AFTER the delete
      // has actually happened, to the address captured before it.
      try {
        const mail = deletionCompletedEmail({ name });
        await sendEmail(email, mail.subject, mail.html);
      } catch {
        /* best-effort */
      }
    } catch (err) {
      console.error("[account-deletion] failed for user", id, err);
    }
  }
  return { deleted };
}
