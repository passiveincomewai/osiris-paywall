import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SavedLocationsView from "@/components/SavedLocationsView";

/* A device-local utility page, like the dashboard: its content lives
   in the visitor's browser, so it stays out of the index and the
   sitemap. */
export const metadata: Metadata = {
  title: "Saved locations — WorldEye",
  description:
    "The places and cameras you've saved on this device, one tap from the live view.",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <>
      <main className="min-h-screen bg-[#05070d] text-white">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
              YOUR SHORTLIST
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Saved locations</h1>
            <p className="mt-4 text-white/55">
              The places and cameras you&apos;ve saved, one tap from the live view.
            </p>
          </div>

          <div className="mt-10">
            <SavedLocationsView />
          </div>

          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm text-white/50 leading-relaxed">
            <p>
              <span className="text-white/75 font-medium">Saved on this device only.</span>{" "}
              Your list is stored in this browser — it doesn&apos;t sync to your account
              or follow you to other devices, and clearing your browser data clears it.
            </p>
            <p className="mt-3">
              Signed in? Cameras can also be saved to{" "}
              <Link href="/dashboard" className="text-[#D4AF37] underline-offset-4 hover:underline">
                My Cameras in your dashboard
              </Link>{" "}
              from any camera view — those saves live on your account instead.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
