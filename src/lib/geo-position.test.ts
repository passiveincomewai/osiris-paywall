import { describe, it, expect } from 'vitest';
import {
  classifyGeoError,
  geoEnvironmentIssue,
} from './geo-position';

describe('classifyGeoError', () => {
  it('maps PERMISSION_DENIED (1) to the denied remedy — never to HTTPS', () => {
    const issue = classifyGeoError({ code: 1 }, { hasGeolocation: true, secureContext: true });
    expect(issue.kind).toBe('denied');
    expect(issue.title).toMatch(/location is off/i);
    expect(issue.remedy).toMatch(/site settings/i);
    expect(issue.remedy).toMatch(/try again/i);
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('maps POSITION_UNAVAILABLE (2) to its own message', () => {
    const issue = classifyGeoError({ code: 2 }, { secureContext: true });
    expect(issue.kind).toBe('unavailable');
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('maps TIMEOUT (3) to its own message', () => {
    const issue = classifyGeoError({ code: 3 }, { secureContext: true });
    expect(issue.kind).toBe('timeout');
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('blames HTTPS only when the context is actually insecure', () => {
    const issue = classifyGeoError({ code: 1 }, { secureContext: false });
    expect(issue.kind).toBe('insecure');
    expect(issue.remedy).toMatch(/HTTPS/);
    expect(issue.retryable).toBe(false);
  });

  it('a secure context with no error code is unknown, never insecure', () => {
    const issue = classifyGeoError(null, { secureContext: true });
    expect(issue.kind).toBe('unknown');
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('a browser without geolocation is unsupported, whatever the code says', () => {
    const issue = classifyGeoError({ code: 1 }, { hasGeolocation: false, secureContext: true });
    expect(issue.kind).toBe('unsupported');
    expect(issue.retryable).toBe(false);
  });

  it('an unrecognised code degrades to unknown', () => {
    expect(classifyGeoError({ code: 99 }).kind).toBe('unknown');
    expect(classifyGeoError(undefined).kind).toBe('unknown');
    expect(classifyGeoError({}).kind).toBe('unknown');
  });
});

describe('geoEnvironmentIssue', () => {
  it('passes a normal secure browser through to the watch', () => {
    expect(geoEnvironmentIssue({ hasGeolocation: true, secureContext: true })).toBeNull();
    expect(geoEnvironmentIssue({})).toBeNull();
  });

  it('short-circuits insecure contexts and missing geolocation', () => {
    expect(geoEnvironmentIssue({ secureContext: false })?.kind).toBe('insecure');
    expect(geoEnvironmentIssue({ hasGeolocation: false })?.kind).toBe('unsupported');
  });
});
