/**
 * The structured failure every checkout client flow throws
 * (lib/billing/embedded-checkout's runCheckoutFlow and
 * lib/billing/trial-checkout's startHostedCheckout) and every checkout
 * surface renders.
 *
 * Why a class and not a bare `new Error(message)`: the route's refusals
 * are not all equal, and a message string alone cannot carry the
 * difference. The guard's 409 (lib/billing/checkout-guard) is a
 * DEFINITIVE refusal — the member already holds a live plan, so
 * retrying the same POST can never succeed and the only useful action
 * is managing the existing subscription. It arrives with a machine
 * `code` and a `manageUrl` in the body precisely so the client can
 * offer that action. The pre-fix flows threw `data?.error || "Checkout
 * failed"` as a plain Error: the code and manageUrl were dropped at
 * the throw, the surfaces could only render the string next to a
 * "Try again" button, and whenever the final response carried no JSON
 * message at all (an unhandled 500 renders as an HTML error page, so
 * the body's json() yields null) even the words were lost — the bare
 * "Checkout failed" dead end. This type is the fix's spine: message
 * verbatim, code and manage path riding along, generic only when the
 * server genuinely sent nothing.
 */
import {
  ALREADY_SUBSCRIBED_CODE,
  MANAGE_SUBSCRIPTION_PATH,
} from "./checkout-guard";

/** The fallback line for failures the server gave no words to. */
export const CHECKOUT_FAILED_MESSAGE = "Checkout failed";

export class CheckoutError extends Error {
  /** The server's own refusal message, verbatim — null when it sent none. */
  readonly serverMessage: string | null;
  /** The server's machine code (e.g. "already_subscribed"), or null. */
  readonly code: string | null;
  /** The server-sent manage-subscription path, or null. */
  readonly manageUrl: string | null;

  constructor(
    opts: {
      serverMessage?: string | null;
      code?: string | null;
      manageUrl?: string | null;
    } = {},
  ) {
    super(opts.serverMessage ?? CHECKOUT_FAILED_MESSAGE);
    this.name = "CheckoutError";
    this.serverMessage = opts.serverMessage ?? null;
    this.code = opts.code ?? null;
    this.manageUrl = opts.manageUrl ?? null;
  }

  /** The definitive refusal: this member already holds a live plan. */
  get alreadySubscribed(): boolean {
    return this.code === ALREADY_SUBSCRIBED_CODE;
  }

  /** Where "Manage subscription" points: the server's path when it
   *  sent one, else the canonical settings path from the guard. */
  get managePath(): string {
    return this.manageUrl ?? MANAGE_SUBSCRIPTION_PATH;
  }
}

/**
 * Build a CheckoutError from a POST /api/checkout response body (or
 * null, when the body wasn't JSON — an unhandled 500's HTML page, a
 * network-level failure page). Anything missing stays missing: no
 * message is ever invented here.
 */
export function checkoutErrorFromData(data: unknown): CheckoutError {
  const body = (data ?? null) as {
    error?: unknown;
    code?: unknown;
    manageUrl?: unknown;
  } | null;
  return new CheckoutError({
    serverMessage:
      typeof body?.error === "string" && body.error.trim() ? body.error : null,
    code: typeof body?.code === "string" ? body.code : null,
    manageUrl: typeof body?.manageUrl === "string" ? body.manageUrl : null,
  });
}

/**
 * Widen anything a checkout flow threw into a CheckoutError, for the
 * surfaces' catch blocks. A CheckoutError passes through untouched;
 * anything else (a transport TypeError, a Stripe.js failure that
 * escaped a flow) becomes the generic, retryable failure — its raw
 * message is a browser implementation detail, not something the
 * server said, so it is never shown to the buyer.
 */
export function toCheckoutError(e: unknown): CheckoutError {
  if (e instanceof CheckoutError) return e;
  return new CheckoutError();
}
