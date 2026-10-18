import { describe, expect, it } from 'vitest';
import { familyEnabled, familyInfo, isStructurallyExcluded } from './families';

describe('family licensing registry', () => {
  it('clears spot-checked public-agency families', () => {
    expect(familyInfo('state511').verdict).toBe('clear');
    expect(familyInfo('rivergojp').verdict).toBe('clear');
    expect(familyEnabled('state511')).toBe(true);
  });

  it('holds unreviewed families by default — the registry is an allowlist', () => {
    expect(familyInfo('some-unreviewed-family').verdict).toBe('conditional');
    expect(familyEnabled('some-unreviewed-family')).toBe(false);
  });

  it('lets a run force-enable a conditional family, explicitly', () => {
    expect(familyEnabled('panomax')).toBe(false);
    expect(familyEnabled('panomax', new Set(['panomax']))).toBe(true);
  });

  it('structurally excludes the Windy catalog, whatever the flag says', () => {
    expect(isStructurallyExcluded('windy')).toBe(true);
    expect(isStructurallyExcluded('windy-providers')).toBe(true);
    expect(familyInfo('windy').verdict).toBe('excluded');
    expect(familyEnabled('windy', new Set(['windy']))).toBe(false);
    expect(familyEnabled('windy-providers', new Set(['windy-providers']))).toBe(false);
  });

  it('excludes commercial networks whose terms do not clear', () => {
    expect(familyInfo('weatherbug').verdict).toBe('excluded');
    expect(familyInfo('earthcam').verdict).toBe('excluded');
    expect(familyEnabled('earthcam', new Set(['earthcam']))).toBe(false);
  });

  it('holds families WorldEye already covers through a dedicated layer', () => {
    expect(familyInfo('alertcalifornia').verdict).toBe('conditional');
    expect(familyEnabled('alertcalifornia')).toBe(false);
  });
});
