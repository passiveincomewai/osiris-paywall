import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin sign in — WorldEye",
  description: "Restricted area. Authorized administrators only.",
  robots: { index: false, follow: false },
};

/** Only allow relative callback URLs inside the admin area (open-redirect protection). */
function safeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/admin") && !raw.startsWith("//")) return raw;
  return "/admin";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const callbackUrl = safeCallbackUrl(first(sp.callbackUrl));

  // Already signed in as an admin? Skip the form.
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (email && adminEmails().includes(email)) redirect(callbackUrl);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(0,150,255,0.12), transparent 60%), #050810",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={56}
            height={56}
            className="mx-auto mb-4"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.4))" }}
          />
          <h1 className="text-xl font-extrabold text-white tracking-wide">
            Admin <span className="text-[#0096FF]">Access</span>
          </h1>
          <p className="text-xs text-white/40 mt-2 tracking-[0.2em] uppercase">
            Restricted area
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-6 shadow-2xl">
          <AdminLoginForm callbackUrl={callbackUrl} />
        </div>
        <p className="text-center text-xs text-white/30 mt-6">
          <Link href="/" className="hover:text-white/60 transition">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
