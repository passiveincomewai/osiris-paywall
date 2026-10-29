"use client";

/**
 * Mode shell for the /sensing tool. Three real sensing modes, one display:
 *
 *  - RavenScope (laptop/desktop flagship): connects to a RavenScope
 *    program running on the visitor's own computer. Default on wide
 *    viewports.
 *  - WiFi Link (works everywhere, starts on its own): RTT-jitter sensing
 *    of this device's own WiFi link. Default on phones.
 *  - Camera: on-device frame-difference motion sensing.
 *
 * Only the active mode is mounted, so switching tabs stops the previous
 * mode's camera stream, probe loop or event stream.
 */

import { useEffect, useState } from "react";
import CameraSensing from "./CameraSensing";
import RavenScopeSensing from "./RavenScopeSensing";
import WifiLinkSensing from "./WifiLinkSensing";

type Mode = "ravenscope" | "wifi" | "camera";

const TABS: { id: Mode; label: string; hint: string }[] = [
  { id: "ravenscope", label: "RavenScope", hint: "Full WiFi sensing from a free program on your computer" },
  { id: "wifi", label: "WiFi Link", hint: "Disturbance sensing of this device's own WiFi link" },
  { id: "camera", label: "Camera", hint: "Motion sensing with this device's camera, on-device" },
];

export default function SensingTool() {
  const [mode, setMode] = useState<Mode>("wifi");
  const [resolved, setResolved] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const isNarrow = window.innerWidth < 1024;
    setNarrow(isNarrow);
    setMode(isNarrow ? "wifi" : "ravenscope");
    setResolved(true);
  }, []);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sensing mode">
        {TABS.map((t) => {
          const active = mode === t.id;
          const laptopOnly = t.id === "ravenscope" && narrow;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setMode(t.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                  : laptopOnly
                    ? "border-white/10 bg-white/5 text-white/35 hover:text-white/60"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {t.label}
              {laptopOnly && <span className="ml-1.5 text-xs font-normal">(laptop / desktop)</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-white/50">{TABS.find((t) => t.id === mode)?.hint}</p>

      <div className="mt-5">
        {!resolved ? (
          <div
            data-testid="sensing-state"
            className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6"
            aria-live="polite"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Sensor state</p>
            <p className="mt-1 text-4xl font-bold text-white">STARTING…</p>
            <p className="mt-1 text-sm text-white/50">Starting the sensor on this device — no account, nothing uploaded.</p>
          </div>
        ) : mode === "ravenscope" ? (
          <RavenScopeSensing />
        ) : mode === "wifi" ? (
          <WifiLinkSensing />
        ) : (
          <CameraSensing />
        )}
      </div>
    </div>
  );
}
