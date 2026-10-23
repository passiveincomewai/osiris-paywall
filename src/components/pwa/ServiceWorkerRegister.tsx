"use client";

/**
 * Registers the WorldEye service worker (public/sw.js) — production only.
 *
 * Update path: when a NEW worker finishes installing while an older one
 * controls the page, we tell it to skipWaiting; the resulting
 * `controllerchange` reloads the page exactly once so visitors land on the
 * fresh build instead of being stranded on stale app code. A first-ever
 * install has no previous controller, so nothing reloads. We also ask the
 * browser to re-check for a new worker hourly and whenever the tab regains
 * focus.
 *
 * In dev and tests this renders nothing and registers nothing, so local
 * work never fights a cached shell.
 */

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    let interval: number | undefined;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        const activateWaiting = () => {
          if (registration.waiting && navigator.serviceWorker.controller) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        };
        activateWaiting();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") activateWaiting();
          });
        });

        interval = window.setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        };
        document.addEventListener("visibilitychange", onVisible);
      } catch {
        // Registration is best-effort: the site works fully without it.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  return null;
}
