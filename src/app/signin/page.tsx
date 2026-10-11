import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm, { type OAuthProvider } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in — WorldEye",
  description: "Sign in to your WorldEye account with email, Google, Apple, GitHub and more.",
  robots: { index: false, follow: false },
};

function configuredProviders(): { oauth: OAuthProvider[]; emailLink: boolean } {
  const oauth: OAuthProvider[] = [];
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)
    oauth.push({ id: "github", label: "GitHub" });
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
    oauth.push({ id: "google", label: "Google" });
  if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET)
    oauth.push({ id: "apple", label: "Apple" });
  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET)
    oauth.push({ id: "discord", label: "Discord" });
  if (process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET)
    oauth.push({ id: "twitter", label: "X" });
  if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET)
    oauth.push({ id: "facebook", label: "Facebook" });
  return { oauth, emailLink: !!process.env.AUTH_RESEND_KEY };
}

/** Only allow relative callback URLs (open-redirect protection). */
function safeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const { oauth, emailLink } = configuredProviders();
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your WorldEye account">
      <SignInForm
        oauth={oauth}
        emailLink={emailLink}
        callbackUrl={safeCallbackUrl(first(sp.callbackUrl))}
        status={{
          verified: first(sp.verified) === "1",
          checkEmail: first(sp.check) === "email",
          error: first(sp.error),
        }}
      />
    </AuthShell>
  );
}
