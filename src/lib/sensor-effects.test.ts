import { describe, expect, it } from 'vitest';
import {
  clampIntensity,
  isLowPowerDevice,
  normalizeSensorEffect,
  sensorFilterCss,
  thermalTableValues,
} from './sensor-effects';

describe('sensorFilterCss', () => {
  it('off (or intensity 0) produces no visual change', () => {
    expect(sensorFilterCss({ mode: 'off', intensity: 1 })).toBe('');
    const nv = sensorFilterCss({ mode: 'night-vision', intensity: 0 });
    expect(nv).toContain('sepia(0)');
    expect(nv).toContain('hue-rotate(0deg)');
    expect(nv).toContain('saturate(1)');
  });

  it('night vision lerps toward the green phosphor look', () => {
    const full = sensorFilterCss({ mode: 'night-vision', intensity: 1 });
    expect(full).toContain('sepia(1)');
    expect(full).toContain('hue-rotate(68deg)');
    expect(full).toContain('saturate(2.6)');
    const half = sensorFilterCss({ mode: 'night-vision', intensity: 0.5 });
    expect(half).toContain('sepia(0.5)');
    expect(half).toContain('hue-rotate(34deg)');
  });

  it('thermal rides the SVG lookup, never a fake data claim in the CSS', () => {
    expect(sensorFilterCss({ mode: 'thermal', intensity: 1 })).toContain('url(#we-thermal-lut)');
  });

  it('monochrome / contrast / crt / cinematic produce their filters', () => {
    expect(sensorFilterCss({ mode: 'monochrome', intensity: 1 })).toContain('grayscale(1)');
    expect(sensorFilterCss({ mode: 'high-contrast', intensity: 1 })).toContain('contrast(1.9)');
    expect(sensorFilterCss({ mode: 'crt', intensity: 1 })).toContain('saturate(1.25)');
    expect(sensorFilterCss({ mode: 'cinematic-dark', intensity: 1 })).toContain('brightness(0.75)');
  });

  it('clamps out-of-range intensity', () => {
    expect(clampIntensity(7)).toBe(1);
    expect(clampIntensity(-2)).toBe(0);
    expect(clampIntensity(NaN)).toBe(1);
    expect(clampIntensity('x')).toBe(1);
  });
});

describe('thermalTableValues', () => {
  it('intensity 0 is the identity ramp', () => {
    const { r, g, b } = thermalTableValues(0);
    expect(r).toBe('0 0.2 0.4 0.6 0.8 1');
    expect(g).toBe('0 0.2 0.4 0.6 0.8 1');
    expect(b).toBe('0 0.2 0.4 0.6 0.8 1');
  });

  it('intensity 1 is the false-colour ramp (dark→purple→red→yellow)', () => {
    const { r, g, b } = thermalTableValues(1);
    expect(r.split(' ')).toHaveLength(6);
    expect(parseFloat(r.split(' ')[5])).toBeGreaterThan(0.95); // hot = near-white red channel
    expect(parseFloat(b.split(' ')[0])).toBeLessThan(0.05); // cold = near-black
    expect(parseFloat(g.split(' ')[5])).toBeGreaterThan(0.95);
  });
});

describe('normalizeSensorEffect', () => {
  it('accepts valid stored state', () => {
    expect(normalizeSensorEffect({ mode: 'crt', intensity: 0.4 })).toEqual({ mode: 'crt', intensity: 0.4 });
  });

  it('rejects unknown modes and garbage to off', () => {
    expect(normalizeSensorEffect({ mode: 'xray' }).mode).toBe('off');
    expect(normalizeSensorEffect(null)).toEqual({ mode: 'off', intensity: 1 });
    expect(normalizeSensorEffect('thermal')).toEqual({ mode: 'off', intensity: 1 });
  });
});

describe('isLowPowerDevice', () => {
  it('refuses only on small viewport AND very few cores', () => {
    expect(isLowPowerDevice({ innerWidth: 390, innerHeight: 844, hardwareConcurrency: 4 })).toBe(true);
    expect(isLowPowerDevice({ innerWidth: 390, innerHeight: 844, hardwareConcurrency: 8 })).toBe(false);
    expect(isLowPowerDevice({ innerWidth: 1440, innerHeight: 900, hardwareConcurrency: 2 })).toBe(false);
    expect(isLowPowerDevice({ innerWidth: 390, innerHeight: 844 })).toBe(false); // cores unknown → assume capable
  });
});
