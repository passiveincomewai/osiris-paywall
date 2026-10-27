import { Suspense } from "react";
import type { Metadata } from "next";
import WelcomeClient from "./WelcomeClient";

export const metadata: Metadata = {
  title: "Welcome to WorldEye Pro",
  description: "Your Pro subscription is active — set your password to claim your account.",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeClient />
    </Suspense>
  );
}
