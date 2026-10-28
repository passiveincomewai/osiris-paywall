// Render pins for the Cockpit View overlay (aircraft follow, FORWARD
// mode). Node-only renderToString harness, as everywhere here: effects
// never fire, so the overlay seeds its snapshot from hudRef.current in
// its state initializer — which is exactly what these pins exercise:
// the readouts a user sees are the followed aircraft's blended fix,
// the honesty tag never leaves the frame, and nothing in the overlay
// fakes aircraft attitude (ADS-B carries no pitch/roll).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import FlightCockpitOverlay, { headingTapeTicks, tapeWindow } from './FlightCockpitOverlay';
import { FOLLOW_HONESTY_TAG, type FollowHudData } from '@/lib/flights/follow';

const TARGET = { icao24: 'a13de2', callsign: 'UAL3910' };

function snap(over: Partial<FollowHudData> = {}): FollowHudData {
  return {
    callsign: 'UAL3910',
    icao24: 'a13de2',
    lat: 39.31,
    lng: -110.36,
    alt: 12192,
    speedKnots: 424,
    headingDeg: 260,
    fix: {
      kind: 'interpolated',
      newestFixAgeS: 5,
      label: 'POSITION INTERPOLATED BETWEEN FIXES',
    },
    missing: false,
    ...over,
  };
}

function render(data: FollowHudData | null): string {
  return renderToString(
    createElement(FlightCockpitOverlay, { hudRef: { current: data }, target: TARGET }),
  );
}

describe('FlightCockpitOverlay', () => {
  it('renders the frame with the followed aircraft’s live readouts', () => {
    const html = render(snap());
    expect(html).toContain('data-flight-cockpit-overlay');
    expect(html).toContain('COCKPIT VIEW');
    expect(html).toContain('UAL3910');
    // Heading: digital readout + the tape’s W cardinal (270°) in window.
    expect(html).toContain('260°');
    expect(html).toContain('>W<');
    // Altitude in metres, the popup’s units: centre value + tape rows.
    expect(html).toContain('12,192');
    expect(html).toContain('12,200');
    // Speed in knots.
    expect(html).toContain('424');
    expect(html).toContain('420');
    expect(html).toContain('430');
  });

  it('keeps the telemetry honesty tag and the fix honesty in the overlay itself', () => {
    const html = render(snap());
    expect(html).toContain(FOLLOW_HONESTY_TAG);
    expect(html).toContain('POSITION INTERPOLATED BETWEEN FIXES');
    expect(html).toContain('FIX 5s');
  });

  it('shows SIGNAL LOST while the target is missing from the feed', () => {
    const html = render(snap({ missing: true }));
    expect(html).toContain('SIGNAL LOST — HOLDING LAST KNOWN POSITION');
    expect(html).toContain(FOLLOW_HONESTY_TAG);
  });

  it('renders the frame and honesty tag before the first fix arrives', () => {
    const html = render(null);
    expect(html).toContain('data-flight-cockpit-overlay');
    expect(html).toContain('ACQUIRING TELEMETRY…');
    expect(html).toContain(FOLLOW_HONESTY_TAG);
  });

  it('never fakes aircraft attitude — no horizon or attitude instrument anywhere', () => {
    const html = render(snap());
    expect(html.toUpperCase()).not.toContain('HORIZON');
    expect(html.toUpperCase()).not.toContain('ATTITUDE');
    expect(html.toUpperCase()).not.toContain('PITCH LADDER');
  });
});

describe('headingTapeTicks', () => {
  it('centres the current heading and labels cardinals and 30° marks', () => {
    const ticks = headingTapeTicks(260);
    const centre = ticks.find((t) => t.offsetDeg === 0);
    expect(centre?.deg).toBe(260);
    expect(ticks.find((t) => t.deg === 270)?.label).toBe('W');
    expect(ticks.find((t) => t.deg === 240)?.label).toBe('24');
    expect(ticks.find((t) => t.deg === 300)?.label).toBe('30');
    // Minor 5° ticks carry no label.
    expect(ticks.find((t) => t.deg === 265)?.label).toBeNull();
  });

  it('wraps across north', () => {
    const ticks = headingTapeTicks(355);
    expect(ticks.find((t) => t.offsetDeg === 5)?.deg).toBe(0);
    expect(ticks.find((t) => t.deg === 0)?.label).toBe('N');
  });
});

describe('tapeWindow', () => {
  it('windows altitude in 100 m rows around the rounded base', () => {
    const w = tapeWindow(12192, 100, 2);
    expect(w.base).toBe(12200);
    expect(w.rows).toEqual([12000, 12100, 12200, 12300, 12400]);
    expect(w.frac).toBeCloseTo(-0.08);
  });

  it('windows speed in 10 kt rows', () => {
    const w = tapeWindow(424, 10, 2);
    expect(w.base).toBe(420);
    expect(w.rows).toEqual([400, 410, 420, 430, 440]);
    expect(w.frac).toBeCloseTo(0.4);
  });
});
