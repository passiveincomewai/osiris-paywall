import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = {
  title: "Forgot password — WorldEye",
  description: "Reset your WorldEye account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
