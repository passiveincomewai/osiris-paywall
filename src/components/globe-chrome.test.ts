import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import MapControls from './MapControls';
import AccountHudControl from './AccountHudControl';
import { HelpButton } from './onboarding/HelpPanel';

/**
 * Globe chrome (owner's artwork batch, 2026-10-26): the three-position
 * day/auto/night switch, the unlocked satellite toggle, the help
 * medallion button, and the glowing header Upgrade pill.
 */

const renderControls = (props: Record<string, unknown> = {}) =>
  renderToString(
    createElement(MapControls, {
      mapRef: { current: null },
      basemapMode: 'auto',
      onBasemapModeChange: () => {},
      satelliteOn: false,
      onSatelliteToggle: () => {},
      ...props,
    } as never),
  ).replace(/<!-- -->/g, '');

describe('the day / auto / night switch', () => {
  it('renders all three artwork states as a radio group', () => {
    const html = renderControls();
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('/images/basemap-switch/switch-night.png');
    expect(html).toContain('/images/basemap-switch/switch-auto.png');
    expect(html).toContain('/images/basemap-switch/switch-day.png');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
  });

  it('checks the radio for the active position and shows only its artwork', () => {
    const day = renderControls({ basemapMode: 'day' });
    const dayRadio = day.match(/<button[^>]*aria-label="Day mode"[^>]*>/);
    expect(dayRadio?.[0]).toContain('aria-checked="true"');
    // The visible basemap state image is the day one (opacity 1); others are 0.
    const imgs = [...day.matchAll(/<img[^>]*>/g)].map(m => m[0]).filter(t => t.includes('basemap-switch/switch-'));
    const visible = imgs.filter(t => t.includes('opacity:1'));
    expect(visible).toHaveLength(1);
    expect(visible[0]).toContain('switch-day.png');
  });

  it('labels the middle position as the live terminator auto mode, never a fake blend', () => {
    const html = renderControls();
    expect(html).toContain('Auto — live day/night terminator');
  });
});

describe('the satellite switch — free for everyone', () => {
  it('renders no lock and no Pro labelling, on or off', () => {
    for (const satelliteOn of [false, true]) {
      const html = renderControls({ satelliteOn });
      expect(html).not.toContain('Pro feature');
      expect(html).not.toContain('Satellite view — Pro');
      expect(html).toContain(satelliteOn ? 'Turn satellite view off' : 'Turn satellite view on');
    }
  });

  it('uses the owner artwork family: off, transition and on frames', () => {
    const html = renderControls({ satelliteOn: false });
    expect(html).toContain('/images/basemap-switch/sat-off.png');
    expect(html).toContain('/images/basemap-switch/sat-mid.png');
    expect(html).toContain('/images/basemap-switch/sat-on.png');
    // OFF is the frame showing for a fresh (off) render.
    const satImgs = [...html.matchAll(/<img[^>]*>/g)].map(m => m[0]).filter(t => t.includes('sat-'));
    const visible = satImgs.filter(t => t.includes('opacity:1'));
    expect(visible).toHaveLength(1);
    expect(visible[0]).toContain('sat-off.png');
    // ON shows the sunlit knob-right frame.
    const on = renderControls({ satelliteOn: true });
    const onVisible = [...on.matchAll(/<img[^>]*>/g)].map(m => m[0]).filter(t => t.includes('sat-') && t.includes('opacity:1'));
    expect(onVisible).toHaveLength(1);
    expect(onVisible[0]).toContain('sat-on.png');
  });
});

describe('the zoom control artwork', () => {
  it('renders the keyed pill with Zoom in / Zoom out zones keeping their labels', () => {
    const html = renderControls();
    expect(html).toContain('/images/map-zoom.png');
    expect(html).toContain('aria-label="Zoom in"');
    expect(html).toContain('aria-label="Zoom out"');
  });
});

describe('the help button', () => {
  it('shows the medallion artwork instead of the "?" glyph, same label', () => {
    const html = renderToString(
      createElement(HelpButton, { isMobile: false, onClick: () => {} }),
    ).replace(/<!-- -->/g, '');
    expect(html).toContain('aria-label="Help and tutorials"');
    expect(html).toContain('/images/help-medallion.png');
    expect(html).not.toMatch(/>\s*\?\s*</);
  });
});

describe('the header Upgrade pill', () => {
  it('carries the gold glow class on the pill link', () => {
    const html = renderToString(createElement(AccountHudControl, { variant: 'desktop' })).replace(/<!-- -->/g, '');
    expect(html).toContain('upgrade-pill-glow');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('/upgrade-to-pro.png');
    // The old blue drop-shadow is gone — the glow is Pro gold now.
    expect(html).not.toContain('56,150,255');
  });
});
