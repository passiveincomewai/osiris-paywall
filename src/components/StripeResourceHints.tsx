/**
 * Resource hints for the checkout surfaces (/checkout and /pricing,
 * whose sheet mounts the same form): warm the connections Stripe's
 * embedded form needs — Stripe.js itself (js.stripe.com) and Stripe's
 * API host (api.stripe.com) — while our own bundle and the session POST
 * are still in flight, so the TLS handshakes don't serialize behind
 * them when the form mounts. Rendered by the two checkout-surface
 * pages only; React hoists these <link>s into <head>.
 */
export default function StripeResourceHints() {
  return (
    <>
      <link rel="preconnect" href="https://js.stripe.com" />
      <link rel="preconnect" href="https://api.stripe.com" />
      <link rel="dns-prefetch" href="https://js.stripe.com" />
      <link rel="dns-prefetch" href="https://api.stripe.com" />
    </>
  );
}
