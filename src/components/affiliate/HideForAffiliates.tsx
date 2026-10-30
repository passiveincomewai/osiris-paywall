"use client";
// Renders its children (demo links/CTAs) for everyone EXCEPT signed-in
// users who already hold an affiliate profile — active affiliates work
// from their real dashboard and shouldn't be routed into the demo.
// Client-side by design: the check is one /api/affiliate/me fetch after
// mount, and the demo routes themselves hard-redirect active affiliates
// server-side (affiliates/demo/layout.tsx), so this is presentation
// only. For signed-out visitors and non-affiliate members it renders
// immediately and never hides.
import { useEffect, useState } from "react";

export default function HideForAffiliates({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        if (r.ok) setHidden(true);
      } catch { /* offline / signed out — keep the link */ }
    })();
  }, []);
  if (hidden) return null;
  return <>{children}</>;
}
