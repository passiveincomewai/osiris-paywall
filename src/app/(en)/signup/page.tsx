import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Camera, SlidersHorizontal } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create an account",
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

// What a free account actually unlocks — every line verified against the
// code (see the evidence notes in the wave record):
//  - Camera opens: lib/camera-ladder — a guest gets 5 opens; a free
//    account whose email is verified gets 10 total (the +5 is granted
//    by verifying, not by the signup itself).
//  - Saved cameras: SavedCamera rows are stored per account in the DB
//    (src/app/api/recording/cameras — "Free users may save (preview)";
//    the route only requires sign-in), surfaced as My Cameras in the
//    dashboard. (The separate starred "saved locations" list is
//    device-local by design and is NOT claimed here.)
//  - Settings: lib/account/preferences — every account-settings control
//    persists to the account's server-side UserPreference row, so the
//    settings apply wherever the member signs in.
// Camera alerts are deliberately NOT listed: the free tier's alert cap
// is 0 (lib/billing/plans entitlementsFor — Pro 2, Ultra 10).
const FREE_ACCOUNT_UNLOCKS = [
  {
    icon: Camera,
    text: "10 camera opens instead of 5 — verify your email after signing up and your free allowance doubles, from 5 opens as a guest to 10 in total.",
  },
  {
    icon: Bookmark,
    text: "Cameras saved to your account — save cameras to My Cameras in your dashboard and they are stored on your account, not just on this device.",
  },
  {
    icon: SlidersHorizontal,
    text: "Settings that follow you — your account settings are stored on your account, so they apply wherever you sign in.",
  },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cb = sp.callbackUrl;
  return (
    <AuthShell title="Create your account" subtitle="Free to browse. No credit card required.">
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-semibold text-white/85">What a free account unlocks</p>
        <ul className="mt-3 space-y-2.5">
          {FREE_ACCOUNT_UNLOCKS.map((u) => (
            <li key={u.text} className="flex items-start gap-2.5 text-sm text-white/55 leading-relaxed">
              <u.icon className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>{u.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <SignupForm
        callbackUrl={safeCallbackUrl(Array.isArray(cb) ? cb[0] : cb)}
        googleEnabled={googleConfigured()}
      />
      <p className="mt-6 text-center text-sm text-white/50">
        Just exploring?{" "}
        <Link href="/" className="text-[#D4AF37] font-semibold hover:underline">
          Open the free map
        </Link>{" "}
        — no account needed.
      </p>
    </AuthShell>
  );
}
