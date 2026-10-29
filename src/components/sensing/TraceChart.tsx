"use client";

/**
 * Live signal trace — a canvas rendering of a rolling energy series,
 * modelled on RavenScope's own dashboard waterfall: a filled line trace
 * of motion energy, dashed state-threshold lines, and a red tick at the
 * top wherever the anomaly z-score spiked (z >= 4, RavenScope's own
 * marker rule). Data lives in a caller-owned ref (pushed at sensor rate);
 * this component only draws, on a rAF loop that skips unchanged frames.
 *
 * The chart draws measured values only — the caller decides what series
 * means (RavenScope fused RSSI energy, or WiFi Link jitter energy) and
 * labels it accordingly.
 */

import { useEffect, useRef, type RefObject } from "react";

export interface TracePoint {
  energy: number;
  z: number;
}

interface TraceChartProps {
  dataRef: RefObject<TracePoint[]>;
  /** Y-axis ceiling (energy is 0..1 in both engines). */
  max?: number;
  /** Dashed reference lines, in energy units. */
  thresholds?: { value: number; label: string }[];
  /** z at/above which a sample gets an anomaly tick. */
  anomalyZ?: number;
  height?: number;
  ariaLabel: string;
}

const STROKE = "#22d3ee";
const TICK = "rgba(251,113,133,0.85)";

export default function TraceChart({
  dataRef,
  max = 1,
  thresholds = [],
  anomalyZ = 4,
  height = 180,
  ariaLabel,
}: TraceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const drawnKeyRef = useRef("");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: r.width, h: height };
      drawnKeyRef.current = "";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const data = dataRef.current ?? [];
      const last = data[data.length - 1];
      const key = `${data.length}:${last ? `${last.energy}|${last.z}` : ""}:${sizeRef.current.w}`;
      if (key === drawnKeyRef.current) return;
      drawnKeyRef.current = key;

      const { w, h } = sizeRef.current;
      if (w < 10) return;
      const pad = 4;
      const gh = h - pad * 2;
      const yOf = (v: number) => pad + gh * (1 - Math.max(0, Math.min(max, v)) / max);
      ctx.clearRect(0, 0, w, h);

      // baseline
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yOf(0));
      ctx.lineTo(w, yOf(0));
      ctx.stroke();

      // threshold lines + labels
      ctx.font = "9px ui-monospace, monospace";
      for (const t of thresholds) {
        if (t.value <= 0 || t.value >= max) continue;
        const y = yOf(t.value);
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText(t.label, 4, y - 3);
      }

      // the trace: last N points at ~2px spacing
      const maxPoints = Math.max(10, Math.floor(w / 2));
      const pts = data.length > maxPoints ? data.slice(data.length - maxPoints) : data;
      const n = pts.length;
      if (n > 1) {
        const step = w / (maxPoints - 1);
        const x0 = w - (n - 1) * step;
        const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
        grad.addColorStop(0, "rgba(34,211,238,0.38)");
        grad.addColorStop(1, "rgba(34,211,238,0.02)");
        ctx.beginPath();
        ctx.moveTo(x0, h - pad);
        pts.forEach((p, i) => ctx.lineTo(x0 + i * step, yOf(p.energy)));
        ctx.lineTo(w, h - pad);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = x0 + i * step;
          const y = yOf(p.energy);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = STROKE;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // anomaly ticks where z spiked
        ctx.strokeStyle = TICK;
        ctx.lineWidth = 1.2;
        pts.forEach((p, i) => {
          if (p.z >= anomalyZ) {
            const x = x0 + i * step;
            ctx.beginPath();
            ctx.moveTo(x, pad);
            ctx.lineTo(x, pad + 9);
            ctx.stroke();
          }
        });
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText("collecting samples…", 6, h / 2);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dataRef, max, thresholds, anomalyZ, height]);

  return (
    <div ref={wrapRef} className="w-full" role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
