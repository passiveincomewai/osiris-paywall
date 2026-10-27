"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the Live traffic panel current: re-runs the server component every
 * 30 seconds so the live count and per-visit graph reflect new PageView rows
 * without a manual reload. Renders only a small caption.
 */
export default function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);
  return <div className="mt-2 text-[10px] text-white/30">Auto-refreshes every 30s</div>;
}
