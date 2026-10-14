"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * IntersectionObserver mount gate for landing islands. The fallback (static,
 * server-rendered markup) is what ships in the initial HTML and what a
 * crawler or a no-JS visitor sees; the island (passed as children, normally
 * a next/dynamic component) is only rendered — and its JS chunk only
 * requested — once the section approaches the viewport. This is what keeps
 * every landing island out of the homepage's initial JS.
 */
export default function IoGate({
  children,
  fallback,
  rootMargin = "900px",
  className,
}: {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {on ? children : fallback}
    </div>
  );
}
