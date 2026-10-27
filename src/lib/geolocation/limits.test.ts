import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumeIpQuota,
  consumeVisionBudget,
  geolocationEnabled,
  resetGeolocationLimits,
  visionConfigured,
} from './limits';

const env = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({ ...extra }) as NodeJS.ProcessEnv;

describe('kill switch', () => {
  it('is on by default and off only on an explicit off value', () => {
    expect(geolocationEnabled(env())).toBe(true);
    expect(geolocationEnabled(env({ GEOLOCATION_BETA_ENABLED: '1' }))).toBe(true);
    expect(geolocationEnabled(env({ GEOLOCATION_BETA_ENABLED: '0' }))).toBe(false);
    expect(geolocationEnabled(env({ GEOLOCATION_BETA_ENABLED: 'false' }))).toBe(false);
    expect(visionConfigured(env())).toBe(true);
    expect(visionConfigured(env({ GEOLOCATION_VISION_ENABLED: 'off' }))).toBe(false);
  });
});

describe('per-IP daily quota', () => {
  beforeEach(() => resetGeolocationLimits());

  it('allows the daily allowance, then blocks', () => {
    const e = env({ GEOLOCATION_PER_IP_DAILY: '3' });
    expect(consumeIpQuota('203.0.113.9', e)).toMatchObject({ allowed: true, remaining: 2 });
    expect(consumeIpQuota('203.0.113.9', e)).toMatchObject({ allowed: true, remaining: 1 });
    expect(consumeIpQuota('203.0.113.9', e)).toMatchObject({ allowed: true, remaining: 0 });
    expect(consumeIpQuota('203.0.113.9', e)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('keeps separate IPs in separate buckets', () => {
    const e = env({ GEOLOCATION_PER_IP_DAILY: '1' });
    expect(consumeIpQuota('203.0.113.9', e).allowed).toBe(true);
    expect(consumeIpQuota('203.0.113.9', e).allowed).toBe(false);
    expect(consumeIpQuota('198.51.100.4', e).allowed).toBe(true);
  });
});

describe('global vision budget', () => {
  beforeEach(() => resetGeolocationLimits());

  it('stops handing out vision calls at the daily cap', () => {
    const e = env({ GEOLOCATION_VISION_DAILY_CAP: '2' });
    expect(consumeVisionBudget(e)).toBe(true);
    expect(consumeVisionBudget(e)).toBe(true);
    expect(consumeVisionBudget(e)).toBe(false);
  });
});
