import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "./ResetForm";

export const metadata: Metadata = {
  title: "Choose a new password — WorldEye",
  description: "Choose a new password for your WorldEye account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <AuthShell title="Choose a new password" subtitle="Make it at least 8 characters.">
      <ResetForm token={first(sp.token) ?? ""} email={first(sp.email) ?? ""} />
    </AuthShell>
  );
}
