"use client";

/**
 * OSIRIS — /launches board: the live ticking countdown chip.
 *
 * Client-side on purpose: the board page is server-rendered and cached
 * for 15 minutes (the launches service's own TTL), so a countdown
 * rendered on the server would be stale on arrival. This chip ticks
 * every second from the launch's real NET, using the same pure
 * countdown maths as the globe's Space Missions panel
 * (lib/launches/countdown) — one clock, two surfaces. When LL2's NET
 * precision is coarser than the minute, the label carries "≈" and the
 * card prints the caveat: the countdown runs to the published date,
 * which is all the source states.
 */
import { useEffect, useState } from "react";
import { countdownTo } from "@/lib/launches/countdown";

export default function LaunchCountdown({
  net,
  netPrecision,
  large = false,
}: {
  net: string | null;
  netPrecision: string | null;
  large?: boolean;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (nowMs === null) {
    /* First paint (and the server render) shows the published NET date
       instead — the card prints it beside this chip either way. */
    return (
      <span className={`font-mono font-bold tabular-nums ${large ? "text-3xl" : "text-xl"}`} style={{ color: "#B388FF" }}>
        T−…
      </span>
    );
  }

  const cd = countdownTo(net, netPrecision, nowMs);
  return (
    <span className={`font-mono font-bold tabular-nums ${large ? "text-3xl" : "text-xl"}`} style={{ color: "#B388FF" }}>
      {cd.label}
      {cd.approximate && cd.secondsToNet !== null ? " ≈" : ""}
    </span>
  );
}
