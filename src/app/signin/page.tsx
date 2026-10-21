import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm, { type OAuthProvider } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your WorldEye account with Google or email.",
  robots: { index: false, follow: false },
};

function configuredProviders(): { oauth: OAuthProvider[]; emailLink: boolean } {
  const oauth: OAuthProvider[] = [];
  // Google only — other OAuth providers removed per owner decision 2026-10-11.
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
    oauth.push({ id: "google", label: "Google" });
  return { oauth, emailLink: !!process.env.AUTH_RESEND_KEY };
}

/**
 * Open-redirect protection with one necessary exception: Auth.js
 * normalizes the callbackUrl to an ABSOLUTE same-origin URL when it
 * forwards /api/auth/signin requests to this page, so a relative-only
 * check silently destroyed the destination of every CTA and page guard
 * that routes through /api/auth/signin (affiliate CTAs, affiliate page
 * guards). Accept relative URLs, and absolute URLs on this request's
 * own host (reduced to path+query); everything else falls back to "/".
 */
async function safeCallbackUrl(raw: string | undefined): Promise<string> {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const u = new URL(raw);
    if (host && u.host === host) return u.pathname + u.search;
  } catch {
    // Not a URL at all — fall through to the safe default.
  }
  return "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const callbackUrl = await safeCallbackUrl(first(sp.callbackUrl));
  // Already signed in: every "Sign in" CTA on the site carries a
  // callbackUrl (e.g. /affiliates → /api/auth/signin?callbackUrl=
  // /affiliates/dashboard, which Auth.js forwards here). Rendering the
  // form anyway strands signed-in users on this page — forward them to
  // their destination instead. Auth pages are excluded as targets so a
  // callback can never loop back into the form.
  if (first(sp.callbackUrl)) {
    const session = await auth();
    const isAuthPage = ["/signin", "/signup"].some(
      (p) => callbackUrl === p || callbackUrl.startsWith(`${p}?`) || callbackUrl.startsWith(`${p}/`),
    );
    if (session?.user && !isAuthPage) redirect(callbackUrl);
  }
  const { oauth, emailLink } = configuredProviders();
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your WorldEye account">
      <SignInForm
        oauth={oauth}
        emailLink={emailLink}
        callbackUrl={callbackUrl}
        status={{
          verified: first(sp.verified) === "1",
          checkEmail: first(sp.check) === "email",
          error: first(sp.error),
        }}
      />
    </AuthShell>
  );
}
