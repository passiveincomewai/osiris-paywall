import { Suspense } from "react";
import type { Metadata } from "next";
import TotpChallengeClient from "./TotpChallengeClient";

export const metadata: Metadata = {
  title: "Two-factor check",
  robots: { index: false, follow: false },
};

export default function TotpChallengePage() {
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white flex items-start justify-center px-4 py-16">
      <Suspense>
        <TotpChallengeClient />
      </Suspense>
    </div>
  );
}
