"use client";
// Runs once per sign-in: links the user to their referrer (server reads cookie).
import { useEffect, useRef } from "react";

export default function AffiliateSync() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fetch("/api/affiliate/sync-signup", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
