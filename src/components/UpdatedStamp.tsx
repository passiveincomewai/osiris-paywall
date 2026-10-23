// Visible freshness line for data pages: renders "Updated …" (or a caller-
// supplied label such as "Live data checked …") from a REAL timestamp the
// page already holds — a dataset's generatedAt field, or the render time of
// a server fetch the page just performed. Never pass a hard-coded date or a
// bare render-time `new Date()` for a static page: on a statically rendered
// page that would be the build time, not a data signal.
//
// Formatting is pinned to UTC so server and client renders agree.
import type { ReactNode } from "react";

const FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function UpdatedStamp({
  at,
  label = "Updated",
  source,
  className = "",
}: {
  /** The real data timestamp: ISO string, epoch ms, or Date. */
  at: string | number | Date;
  /** Verb phrase before the timestamp, e.g. "Updated" / "Live data checked". */
  label?: string;
  /** Optional data source, rendered after the timestamp. */
  source?: string;
  className?: string;
}) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString();
  const children: ReactNode = (
    <>
      {label}{" "}
      <time dateTime={iso}>{FMT.format(d)} UTC</time>
      {source ? <> · Source: {source}</> : null}
    </>
  );
  return (
    <p className={`text-xs text-white/35 ${className}`}>{children}</p>
  );
}
