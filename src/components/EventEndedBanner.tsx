// ── Event-ended banner ──────────────────────────────────────────────
// Presentational notice band for dated-event pages whose event is
// over (phase "past" from lib/events/lifecycle). A dated page's value
// after its event is whatever stays live underneath it — on WorldEye
// that is the camera walls — so the band says exactly three things:
// the event has ended, the cameras below remain live, and where to
// find events that are still on.
//
// It deliberately carries NO result, winner, score or recap copy: the
// site holds no sourced outcome data for these events, so the banner
// states nothing about how the event turned out. Pages supply their
// own event name and end label; pair with eventPhase() so the band
// only renders once the event is actually past.

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function EventEndedBanner({
  eventName,
  endLabel,
}: {
  /** Display name of the event, e.g. "World Series 2026". */
  eventName: string;
  /**
   * Human end phrase that reads after "ended", e.g. "in late October
   * 2026" or "on October 31, 2026".
   */
  endLabel: string;
}) {
  return (
    <section aria-label={`${eventName} has ended`} className="mt-10 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
        <p className="text-sm font-bold text-white/90">This event has ended</p>
        <p className="text-sm text-white/55 leading-relaxed mt-1">
          {eventName} ended {endLabel}. The cameras below remain live — the
          host cities are still broadcasting around the clock, free to watch.
        </p>
        <Link
          href="/live-events"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[#00E5FF] hover:underline"
        >
          See what&apos;s live now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
