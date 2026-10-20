import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Backend Enterprise gate for the camera-feed surfaces. Mirrors
 * src/lib/recording/access.ts (the Pro check), narrowed to the
 * enterprise tier: an active/trialing subscription whose price is the
 * enterprise Stripe price (STRIPE_ENTERPRISE_PRICE_ID), inside its paid
 * period. A Pro subscription — or a comp grant — is NOT enterprise.
 */
export async function enterpriseAccess(): Promise<
  | { ok: true; userId: string; enterprise: true }
  | { ok: true; userId: string; enterprise: false }
  | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  const sub = await db.subscription.findUnique({ where: { userId } }).catch(() => null);
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;
  const enterprise = !!(
    sub &&
    enterprisePriceId &&
    sub.stripePriceId === enterprisePriceId &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
  return enterprise
    ? { ok: true, userId, enterprise: true }
    : { ok: true, userId, enterprise: false };
}

/**
 * Is this user's enterprise subscription currently live? Used by the
 * public doors (feed / API / embed), where the credential names a
 * collection and access follows the OWNER's subscription state — a
 * lapsed enterprise plan turns its feeds off.
 */
export async function userHasLiveEnterprise(userId: string): Promise<boolean> {
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;
  if (!enterprisePriceId) return false;
  const sub = await db.subscription.findUnique({ where: { userId } }).catch(() => null);
  return !!(
    sub &&
    sub.stripePriceId === enterprisePriceId &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
}
