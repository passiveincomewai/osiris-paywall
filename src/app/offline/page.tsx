import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback for the PWA service worker (F17). This page is
 * precached so it can render with no network at all. It is honest about
 * what WorldEye is — live data — and never presents stale content as if
 * it were current.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06060C] px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt="WorldEye"
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px] rounded-2xl"
        />
        <h1 className="mt-6 text-2xl font-semibold text-white">
          You&apos;re offline
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          WorldEye is a live window on the planet — cameras, flights,
          satellites and weather update in real time, so there&apos;s
          nothing honest to show without a connection. Reconnect and the
          globe comes right back.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5c55c]"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
