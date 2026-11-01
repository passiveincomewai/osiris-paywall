import { describe, expect, it } from 'vitest';
import {
  TRAFFIC_LAYER_KEYS,
  TRAFFIC_PUBLIC_ACCESS,
  isTrafficLayerKey,
  trafficLayerUnlocked,
  trafficPublicAccess,
} from './public-access';

describe('traffic public access switch', () => {
  it('is ON (owner order, 2026-10-31: traffic viewing open "for now")', () => {
    expect(TRAFFIC_PUBLIC_ACCESS).toBe(true);
    expect(trafficPublicAccess()).toBe(true);
  });

  it('names exactly the three traffic layer keys', () => {
    expect([...TRAFFIC_LAYER_KEYS].sort()).toEqual([
      'traffic',
      'traffic_congestion',
      'traffic_vehicles',
    ]);
    expect(isTrafficLayerKey('traffic')).toBe(true);
    expect(isTrafficLayerKey('traffic_vehicles')).toBe(true);
    expect(isTrafficLayerKey('traffic_congestion')).toBe(true);
    expect(isTrafficLayerKey('satellites')).toBe(false);
    expect(isTrafficLayerKey('flights')).toBe(false);
    expect(isTrafficLayerKey('')).toBe(false);
  });

  it('unlocks traffic viewing for everyone while the switch is on', () => {
    expect(trafficLayerUnlocked('traffic', false)).toBe(true);
    expect(trafficLayerUnlocked('traffic_congestion', false)).toBe(true);
    expect(trafficLayerUnlocked('traffic', true)).toBe(true);
  });

  it('leaves every non-traffic layer exactly as gated as before', () => {
    // The switch must never leak into another premium surface: a
    // non-subscriber stays locked out of everything that is not traffic.
    expect(trafficLayerUnlocked('satellites', false)).toBe(false);
    expect(trafficLayerUnlocked('oi', false)).toBe(false);
    expect(trafficLayerUnlocked('satellites', true)).toBe(true);
  });
});
