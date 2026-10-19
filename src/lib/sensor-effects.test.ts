import { describe, expect, it } from 'vitest';
import {
  clampIntensity,
  isLowPowerDevice,
  normalizeSensorEffect,
  sensorEffectPlan,
  sensorFilterCss,
  supportsSvgFilterReference,
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

describe('supportsSvgFilterReference', () => {
  // Regression coverage for the iOS failure: WebKit parses `filter: url(#…)`
  // but never paints it on HTML elements, so thermal silently did nothing
  // on iPhones. Every iOS browser is WebKit under the hood.
  const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1';
  const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const CHROME_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0';

  it('is false for WebKit engines (Safari, and every iOS browser)', () => {
    expect(supportsSvgFilterReference(SAFARI_IOS)).toBe(false);
    expect(supportsSvgFilterReference(CHROME_IOS)).toBe(false);
    expect(supportsSvgFilterReference(SAFARI_MAC)).toBe(false);
  });

  it('is true for Chromium and Firefox', () => {
    expect(supportsSvgFilterReference(CHROME_DESKTOP)).toBe(true);
    expect(supportsSvgFilterReference(CHROME_ANDROID)).toBe(true);
    expect(supportsSvgFilterReference(FIREFOX)).toBe(true);
  });
});

describe('thermal fallback (WebKit)', () => {
  it('without SVG filter support, thermal is a visible CSS chain — never a url() reference', () => {
    const css = sensorFilterCss({ mode: 'thermal', intensity: 1 }, { svgFilters: false });
    expect(css).not.toContain('url(');
    expect(css).toContain('grayscale(1)');
    expect(css).toContain('sepia(1)');
    expect(css.length).toBeGreaterThan(0);
  });

  it('with SVG filter support (default), thermal still rides the LUT', () => {
    expect(sensorFilterCss({ mode: 'thermal', intensity: 1 })).toContain('url(#we-thermal-lut)');
    expect(sensorFilterCss({ mode: 'thermal', intensity: 1 }, { svgFilters: true })).toContain('url(#we-thermal-lut)');
  });
});

describe('sensorEffectPlan', () => {
  it('off → clear everything', () => {
    expect(sensorEffectPlan({ mode: 'off', intensity: 1 }, { lowPower: false, svgFilters: true }))
      .toEqual({ result: 'off', filterCss: '', crtOverlay: false, crtOpacity: 0 });
  });

  it('low-power refuses with a cleared filter (the chip explains it)', () => {
    const plan = sensorEffectPlan({ mode: 'night-vision', intensity: 1 }, { lowPower: true, svgFilters: true });
    expect(plan.result).toBe('refused');
    expect(plan.filterCss).toBe('');
    expect(plan.crtOverlay).toBe(false);
  });

  it('a modern phone (small viewport, 6 cores) is NOT refused', () => {
    const lowPower = isLowPowerDevice({ innerWidth: 390, innerHeight: 844, hardwareConcurrency: 6 });
    const plan = sensorEffectPlan({ mode: 'night-vision', intensity: 1 }, { lowPower, svgFilters: false });
    expect(plan.result).toBe('applied');
    expect(plan.filterCss).toContain('sepia(1)');
  });

  it('thermal on WebKit applies the fallback chain, on Chromium the LUT', () => {
    const webkit = sensorEffectPlan({ mode: 'thermal', intensity: 1 }, { lowPower: false, svgFilters: false });
    expect(webkit.result).toBe('applied');
    expect(webkit.filterCss).not.toContain('url(');
    const chromium = sensorEffectPlan({ mode: 'thermal', intensity: 1 }, { lowPower: false, svgFilters: true });
    expect(chromium.filterCss).toContain('url(#we-thermal-lut)');
  });

  it('CRT is the only mode that asks for the scanline overlay', () => {
    const crt = sensorEffectPlan({ mode: 'crt', intensity: 0.5 }, { lowPower: false, svgFilters: true });
    expect(crt.crtOverlay).toBe(true);
    expect(crt.crtOpacity).toBeCloseTo(0.35 + 0.65 * 0.5);
    const mono = sensorEffectPlan({ mode: 'monochrome', intensity: 0.5 }, { lowPower: false, svgFilters: true });
    expect(mono.crtOverlay).toBe(false);
  });
});
