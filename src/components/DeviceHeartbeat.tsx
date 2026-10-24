"use client";

// ── DeviceHeartbeat (items 3–4 client half) ─────────────────────────
// Mints this browser's device id once, heartbeats it to the server a
// few seconds after load (and every 5 minutes), and signs out when
// the server says this device was remotely revoked. Signed-out
// visitors do nothing at all.

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { DEVICE_ID_KEY } from "@/lib/account/device";

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function currentDeviceId(): string {
  try {
    return localStorage.getItem(DEVICE_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function DeviceHeartbeat() {
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function beat() {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const session = s.ok ? await s.json() : null;
        if (!session?.user?.id || stopped) return;
        const id = deviceId();
        if (!id) return;
        const r = await fetch("/api/account/device/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: id }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.revoked && !stopped) {
            await signOut({ callbackUrl: "/signin?reason=device-revoked" });
            return;
          }
        }
        if (!stopped) timer = setTimeout(beat, 5 * 60_000);
      } catch {
        // Tracking is best-effort; never disturb the page over it.
      }
    }

    timer = setTimeout(beat, 2500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
