import { describe, it, expect } from 'vitest';
import {
  heroTrackProgress, heroExitAmount, heroDismissedAfter,
  CINEMATIC_HERO_ENABLED, heroSkippedForSearch,
} from './CinematicHero';

// The hero's dismissal model. The production bug (2026-10-18, Jameson's
// iPhone): after reaching the globe, tapping bottom-nav buttons brought
// the cinematic intro back over the app. The old design kept the stage
// mounted forever, recomputed its visibility from live layout every
// frame, and RELEASED its latch when progress sagged below the exit
// start — any large viewport/scroll swing (in-app-browser chrome, a
// keyboard opening, focus scroll) collapsed progress and resurrected it.
// The model below is the structural replacement: dismissal is a one-way
// door, and the stage unmounts. These tests pin the contract.

describe('heroTrackProgress', () => {
  it('is 0 at the top and 1 at the end of the track range', () => {
    // Track 350vh ≈ 2450px in a 700px viewport → range 1750px.
    expect(heroTrackProgress(0, 2450, 700)).toBe(0);
    expect(heroTrackProgress(-1750, 2450, 700)).toBe(1);
    expect(heroTrackProgress(-875, 2450, 700)).toBe(0.5);
  });

  it('clamps outside the range', () => {
    expect(heroTrackProgress(50, 2450, 700)).toBe(0); // rubber-band above top
    expect(heroTrackProgress(-99999, 2450, 700)).toBe(1); // SEO shell below
  });

  it('survives a degenerate range (track shorter than the viewport)', () => {
    expect(heroTrackProgress(-10, 600, 700)).toBe(1); // total clamped to 1
    expect(heroTrackProgress(0, 600, 700)).toBe(0);
  });
});

describe('heroExitAmount — first-visit behaviour is unchanged', () => {
  it('holds the stage until the exit start, then slides it linearly', () => {
    expect(heroExitAmount(0)).toBe(0);
    expect(heroExitAmount(0.5)).toBe(0);
    expect(heroExitAmount(0.85)).toBe(0);
    expect(heroExitAmount(0.91)).toBeCloseTo(0.5, 5);
    expect(heroExitAmount(0.97)).toBe(1);
    expect(heroExitAmount(1)).toBe(1);
  });
});

describe('heroDismissedAfter — the one-way door', () => {
  it('does not dismiss before the exit completes', () => {
    expect(heroDismissedAfter(false, 0)).toBe(false);
    expect(heroDismissedAfter(false, 0.9)).toBe(false);
    expect(heroDismissedAfter(false, 0.969)).toBe(false);
  });

  it('dismisses the moment progress completes the exit', () => {
    expect(heroDismissedAfter(false, 0.97)).toBe(true);
    expect(heroDismissedAfter(false, 1)).toBe(true);
  });

  it('NEVER un-dismisses, whatever progress does afterwards', () => {
    // The full post-dismissal interaction matrix, expressed as progress
    // values: bottom-nav taps (chrome reveal sag), panel open/close
    // cycles, keyboard open/close over the search drawer, focus scroll,
    // orientation-grade viewport swings, and a deliberate scroll all the
    // way back to the document top. Every one of these must keep the
    // hero dismissed.
    const afterDismissal = [0.99, 0.958, 0.9, 0.85, 0.6, 0.3, 0.0, 0.5, 0.97, 0.0, 0.2, 1, 0.0];
    let dismissed = heroDismissedAfter(false, 0.98); // the completing scroll
    expect(dismissed).toBe(true);
    for (const p of afterDismissal) {
      dismissed = heroDismissedAfter(dismissed, p);
      expect(dismissed).toBe(true);
    }
  });

  it('a visitor who never completes the exit keeps a live hero', () => {
    // Scrub part-way, back to the top, part-way again — no dismissal,
    // so a first visit can still re-watch by scrolling. Dismissal must
    // not fire early, or the intro would vanish mid-experience.
    let dismissed = false;
    for (const p of [0, 0.4, 0.9, 0.96, 0.2, 0, 0.85, 0.5]) {
      dismissed = heroDismissedAfter(dismissed, p);
      expect(dismissed).toBe(false);
    }
  });

  it('a fresh session starts un-dismissed (the hero belongs to fresh entry)', () => {
    // The contract behind "returns only on a fresh page load": the
    // component mounts with dismissed=false; nothing persists across
    // loads. At a restored deep scroll the first frame completes the
    // exit and dismisses immediately — same as the pre-fix latch.
    expect(heroDismissedAfter(false, 0)).toBe(false);
    expect(heroDismissedAfter(false, 1)).toBe(true);
  });
});

describe('the kill switch — heroSkippedForSearch', () => {
  it('ships OFF by default: the hero is parked', () => {
    expect(CINEMATIC_HERO_ENABLED).toBe(false);
  });

  it('flag off: every visit lands on the globe, whatever the URL says', () => {
    expect(heroSkippedForSearch('', false)).toBe(true);
    expect(heroSkippedForSearch('?utm_source=instagram&utm_medium=social', false)).toBe(true);
    expect(heroSkippedForSearch('?camera=CAM-1', false)).toBe(true);
    // And via the defaulted argument — the state the site actually ships in.
    expect(heroSkippedForSearch('')).toBe(true);
  });

  it('flag on: organic visits keep the hero', () => {
    expect(heroSkippedForSearch('', true)).toBe(false);
    expect(heroSkippedForSearch('?utm_medium=', true)).toBe(false);
    expect(heroSkippedForSearch('?utm_source=google&utm_medium=organic', true)).toBe(false);
    expect(heroSkippedForSearch('?utm_source=chatgpt', true)).toBe(false);
  });

  it('flag on: ad traffic, explicit skips and camera deep links still skip', () => {
    expect(heroSkippedForSearch('?utm_medium=cpc', true)).toBe(true);
    expect(heroSkippedForSearch('?utm_medium=Paid-Social', true)).toBe(true);
    expect(heroSkippedForSearch('?skip_hero=1', true)).toBe(true);
    expect(heroSkippedForSearch('?ad=1', true)).toBe(true);
    expect(heroSkippedForSearch('?camera=CAM-7829', true)).toBe(true);
  });

  // Wave 2 F5 (owner order 2026-10-22): UTM-tagged Instagram arrivals
  // take the fast lane — hero skipped, hero video never loaded. This
  // supersedes the pre-F5 pin that kept the hero for
  // utm_source=instagram; the tag is what makes IG arrivals
  // distinguishable, so the referrer concern never applied to them.
  it('flag on: Instagram fast lane — utm_source=ig / instagram skips', () => {
    expect(heroSkippedForSearch('?utm_source=instagram&utm_medium=social', true)).toBe(true);
    expect(heroSkippedForSearch('?utm_source=instagram', true)).toBe(true);
    expect(heroSkippedForSearch('?utm_source=ig', true)).toBe(true);
    expect(heroSkippedForSearch('?utm_source=IG&utm_medium=cpc', true)).toBe(true);
  });
});
