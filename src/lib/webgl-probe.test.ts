/**
 * WebGL probe contracts (lib/webgl-probe). The probe decides whether
 * the globe engine starts or the fallback panel renders, so its
 * classification must not drift:
 *  - WebGL2 granted (even with the weakest attributes) → 'webgl2';
 *  - WebGL2 refused, WebGL granted → 'webgl1';
 *  - both refused or throwing → 'none';
 *  - ?glfallback=panel parses as the panel override, nothing else does;
 *  - MapLibre's WebGL-initialization errors are recognised as the
 *    panel class, while unrelated errors are not (they must still
 *    reach the error boundary).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyWebGL,
  glContextOverride,
  glPanelOverride,
  isWebGLInitError,
  resetWebGLProbeCache,
  webgl2Available,
} from './webgl-probe';

function fakeCanvas(grants: Record<string, boolean>, throwing = false) {
  return () => ({
    getContext: (type: string) => {
      if (throwing) throw new Error('blocked');
      if (!grants[type]) return null;
      return { getExtension: () => ({ loseContext: () => {} }) };
    },
  }) as never;
}

beforeEach(() => resetWebGLProbeCache());

describe('classifyWebGL', () => {
  it('classifies a WebGL2-capable browser as webgl2', () => {
    expect(classifyWebGL(fakeCanvas({ webgl2: true, webgl: true }))).toBe('webgl2');
  });

  it('classifies a WebGL1-only browser as webgl1', () => {
    expect(classifyWebGL(fakeCanvas({ webgl2: false, webgl: true }))).toBe('webgl1');
  });

  it('classifies a browser with no WebGL as none', () => {
    expect(classifyWebGL(fakeCanvas({ webgl2: false, webgl: false }))).toBe('none');
  });

  it('classifies a throwing getContext as none', () => {
    expect(classifyWebGL(fakeCanvas({}, true))).toBe('none');
  });

  it('caches the classification within the page lifetime', () => {
    expect(classifyWebGL(fakeCanvas({ webgl2: true }))).toBe('webgl2');
    // A second probe with a different canvas must not reclassify.
    expect(classifyWebGL(fakeCanvas({ webgl2: false, webgl: false }))).toBe('webgl2');
  });
});

describe('glPanelOverride', () => {
  it('matches ?glfallback=panel', () => {
    expect(glPanelOverride('?glfallback=panel')).toBe(true);
    expect(glPanelOverride('?x=1&glfallback=panel')).toBe(true);
  });

  it('does not match other values or a missing param', () => {
    expect(glPanelOverride('?glfallback=1')).toBe(false);
    expect(glPanelOverride('?glctx=webgl1')).toBe(false);
    expect(glPanelOverride('')).toBe(false);
    expect(glPanelOverride(undefined)).toBe(false);
  });
});

describe('glContextOverride + webgl2Available', () => {
  it('parses ?glctx=webgl1 and nothing else', () => {
    expect(glContextOverride('?glctx=webgl1')).toBe('webgl1');
    expect(glContextOverride('?glctx=webgl2')).toBe(null);
    expect(glContextOverride('?glfallback=panel')).toBe(null);
    expect(glContextOverride(undefined)).toBe(null);
  });

  it('webgl2Available follows the probe class', () => {
    resetWebGLProbeCache();
    classifyWebGL(fakeCanvas({ webgl2: true, webgl: true }));
    expect(webgl2Available('?x=1')).toBe(true);
    // The test override forces WebGL1 behaviour even on a WebGL2 browser.
    expect(webgl2Available('?glctx=webgl1')).toBe(false);
  });

  it('webgl2Available is false for a WebGL1-only browser', () => {
    resetWebGLProbeCache();
    classifyWebGL(fakeCanvas({ webgl2: false, webgl: true }));
    expect(webgl2Available('?x=1')).toBe(false);
  });
});

describe('isWebGLInitError', () => {
  it('recognises the MapLibre 6 WebGL2-required throw', () => {
    expect(
      isWebGLInitError(
        new Error('WebGL2 is required to display this map. We are sorry, but it seems that your browser does not support WebGL2'),
      ),
    ).toBe(true);
  });

  it('recognises the MapLibre 5 initialization failure', () => {
    expect(isWebGLInitError(new Error('Failed to initialize WebGL'))).toBe(true);
  });

  it('does not swallow unrelated errors', () => {
    expect(isWebGLInitError(new Error('Failed to fetch style'))).toBe(false);
    expect(isWebGLInitError(new Error('WebGL context lost'))).toBe(false);
    expect(isWebGLInitError(new Error('some other crash'))).toBe(false);
    expect(isWebGLInitError(null)).toBe(false);
  });
});
