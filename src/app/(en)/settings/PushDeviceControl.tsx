"use client";

// Browser push on this device (wave-2 item 4): per-device enable /
// disable for the push channel the alert checkers deliver through
// src/lib/push. Honest states only — unsupported browser, blocked
// permission and "not switched on yet" (no VAPID keys server-side)
// each say exactly that; nothing pretends a subscription exists when
// it doesn't.

import { useCallback, useEffect, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";

const btnGhost =
  "px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60";
const btnGold =
  "px-4 py-2 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-xs font-bold hover:brightness-110 transition disabled:opacity-60";

type Phase =
  | "loading"
  | "unsupported"
  | "blocked"
  | "not-configured"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushDeviceControl() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPhase("unsupported");
      return;
    }
    try {
      const res = await fetch("/api/push/public-key");
      const data = (await res.json().catch(() => null)) as
        | { configured?: boolean; publicKey?: string }
        | null;
      if (!data?.configured || !data.publicKey) {
        setPhase("not-configured");
        return;
      }
      setPublicKey(data.publicKey);
      if (Notification.permission === "denied") {
        setPhase("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setPhase(existing ? "on" : "off");
    } catch {
      setPhase("unsupported");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPhase(permission === "denied" ? "blocked" : "off");
        setNote("Notifications were not allowed — push stays off on this device.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setPhase("on");
      setNote("Push is on for this device.");
    } catch {
      setNote("Something went wrong turning push on — please try again.");
      void refresh();
    } finally {
      setBusy(false);
    }
  }, [publicKey, refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
      setPhase("off");
      setNote("Push is off for this device.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { accepted?: number; attempted?: number }
        | null;
      if (res.ok && data && (data.accepted ?? 0) > 0) {
        setNote(`Test sent — ${data.accepted} device(s) accepted it.`);
      } else if (res.ok) {
        setNote("No device accepted the test — try turning push off and on again.");
      } else {
        setNote("The test could not be sent.");
      }
    } catch {
      setNote("The test could not be sent.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/85 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#D4AF37]" /> Browser push on this device
          </p>
          <p className="text-xs text-white/35 mt-1 max-w-md">
            {phase === "loading" && "Checking this device…"}
            {phase === "unsupported" &&
              "This browser doesn't support push notifications. On iPhone, add WorldEye to your Home Screen first — push works from the installed app."}
            {phase === "blocked" &&
              "Notifications are blocked for WorldEye in this browser. Allow them in the browser's site settings, then turn push on here."}
            {phase === "not-configured" &&
              "Push isn't switched on yet on our side — alerts you set to push will wait until it is. Email keeps working as usual."}
            {phase === "off" &&
              "Off here. Turn it on, then set camera or event alerts to “Browser push” above."}
            {phase === "on" &&
              "On — alerts you set to browser push will arrive on this device."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
          {phase === "off" && (
            <button type="button" className={btnGold} disabled={busy} onClick={() => void enable()}>
              Turn on push
            </button>
          )}
          {phase === "on" && (
            <>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => void sendTest()}>
                Send a test notification
              </button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => void disable()}>
                Turn off
              </button>
            </>
          )}
          {phase === "on" && !busy && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> On
            </span>
          )}
        </div>
      </div>
      {note && <p className="text-xs text-white/50 mt-2">{note}</p>}
    </div>
  );
}
