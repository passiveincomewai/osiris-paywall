import type { Metadata } from "next";
import AmbientMode from "@/components/ambient/AmbientMode";

/**
 * /ambient — the Slow TV player itself. An app surface, not a
 * landing page (the story lives on /ambient-mode), so it is noindex
 * like the other app surfaces (/dashboard, /checkout).
 */
export const metadata: Metadata = {
  title: "Ambient Mode — WorldEye Slow TV",
  description:
    "WorldEye Ambient: live cameras from around the world as Slow TV — rainy cities, snowy mountains, tropical beaches and night views, crossfading on your screen.",
  robots: { index: false, follow: false },
};

export default function AmbientPage() {
  return (
    <main className="h-[100dvh] w-full bg-black">
      <AmbientMode />
    </main>
  );
}
