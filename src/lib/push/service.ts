/**
 * Browser push — subscription storage.
 *
 * One row per browser/device subscription. The endpoint is the
 * subscription's identity (unique): (re)subscribing with an endpoint
 * that already exists refreshes its keys and owner — a browser that
 * changed hands or re-subscribed after a key rotation must not leave
 * a stale row behind.
 */

import { db } from "@/lib/db";
import type { PushSubscriptionInput } from "./logic";

export async function saveSubscription(
  userId: string,
  input: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent,
    },
    update: {
      userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent,
      lastSeenAt: new Date(),
    },
  });
}

/** Remove one of the user's own subscriptions (by endpoint). Foreign
 *  endpoints are untouched — unsubscribe is scoped to the caller. */
export async function removeSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await db.pushSubscription
    .deleteMany({ where: { userId, endpoint } })
    .catch(() => {});
}

export async function countSubscriptions(userId: string): Promise<number> {
  return db.pushSubscription.count({ where: { userId } }).catch(() => 0);
}
