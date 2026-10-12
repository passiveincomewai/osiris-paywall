import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create an account — WorldEye",
  description: "Create your free WorldEye account with an email and password.",
  robots: { index: false, follow: false },
};

function googleConfigured(): boolean {
  // Google only — other OAuth providers removed per owner decision 2026-10-11.
  return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

function safeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cb = sp.callbackUrl;
  return (
    <AuthShell title="Create your account" subtitle="Free forever. No credit card required.">
      <SignupForm
        callbackUrl={safeCallbackUrl(Array.isArray(cb) ? cb[0] : cb)}
        googleEnabled={googleConfigured()}
      />
    </AuthShell>
  );
}
