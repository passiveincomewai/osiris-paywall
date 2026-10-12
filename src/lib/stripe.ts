import Stripe from "stripe";
import { appBaseUrl } from "./app-url";

let stripeClient: Stripe | null = null;

/**
 * Lazy Stripe singleton. Built on first use (not import time) so
 * `next build` / `next lint` never crash when STRIPE_SECRET_KEY is
 * absent from the build environment.
 */
export function stripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  stripeClient = new Stripe(secretKey, {
    // Omit apiVersion to use the SDK default pinned to your Stripe
    // account; or set STRIPE_API_VERSION to pin explicitly.
    ...(process.env.STRIPE_API_VERSION
      ? { apiVersion: process.env.STRIPE_API_VERSION as Stripe.StripeConfig["apiVersion"] }
      : {}),
    appInfo: { name: "osiris-paywall", version: "0.1.0" },
    typescript: true,
  });
  return stripeClient;
}

export function appUrl(): string {
  return appBaseUrl();
}
