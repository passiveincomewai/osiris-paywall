/**
 * Cursor-ownership contract for OsirisMap's satellite hover pick.
 *
 * MapLibre's delegated layer handlers set the canvas cursor to
 * 'pointer' when the pointer enters a clickable feature (aircraft,
 * cameras, …). The satellite hover handler runs its GPU pick on the
 * next animation frame after any mousemove, and on a pick miss it
 * used to clear ANY 'pointer' cursor:
 *
 *   else if (canvas.style.cursor === 'pointer') canvas.style.cursor = '';
 *
 * That cursor was almost never its own — with satellites enabled
 * (the default) the handler wiped the delegates' hover affordance
 * within a frame, so no clickable layer ever showed a pointer. (It
 * also corrupted two live-diagnosis rounds: "cursor never became
 * pointer" was read as dead delegates when the delegates were fine.)
 *
 * The invariant pinned here: the satellite pick may only clear a
 * cursor that the satellite pick itself set. The handler tracks
 * ownership in a local boolean — set where it assigns 'pointer',
 * and the pick-miss clear is gated on that flag (and resets it).
 * Extraction is mechanical, in the style of
 * src/lib/flights/click-wiring.test.ts: the handler is located by
 * its GPU pick call and the assertions run on that slice of source.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const osirisMap = readFileSync(
  join(process.cwd(), 'src', 'components', 'OsirisMap.tsx'),
  'utf8',
);

// The satellite hover handler: from its frame/throttle state
// declarations through the pick-and-cursor lines of the rAF callback.
// Anchor on the `let hoverFrame` declaration (unique) and take the
// FIRST pick after it — the satellite click handler above also calls
// layer.pick, and it is not the handler under contract.
const regionStart = osirisMap.indexOf('let hoverFrame = 0;');
const pickIdx = regionStart >= 0
  ? osirisMap.indexOf('layer.pick(e.point.x, e.point.y)', regionStart)
  : -1;
const handler = pickIdx >= 0
  ? osirisMap.slice(regionStart, pickIdx + 400)
  : '';

const flagMatch = handler.match(/let\s+([A-Za-z_$][\w$]*)\s*=\s*false;/);
const flag = flagMatch?.[1] ?? '';

describe('OsirisMap satellite hover — cursor ownership', () => {
  it('extracts the satellite hover handler (guard against a vacuous pass)', () => {
    expect(pickIdx).toBeGreaterThan(0);
    expect(handler).toContain("map.on('mousemove'");
    expect(handler).toContain('satLayerRef.current');
    expect(handler).toContain('requestAnimationFrame');
    expect(handler).toContain('layer.pick(e.point.x, e.point.y)');
  });

  it('keeps the surrounding behaviour: rAF deferral and the non-pointer guard', () => {
    expect(handler).toContain(
      "if (canvas.style.cursor && canvas.style.cursor !== 'pointer') return;",
    );
  });

  it('declares a local ownership flag for the cursor it sets', () => {
    expect(flag).not.toBe('');
  });

  it('records ownership where the pick sets the pointer cursor', () => {
    expect(handler).toMatch(
      new RegExp(`canvas\\.style\\.cursor = 'pointer';\\s*${flag} = true;`),
    );
  });

  it('clears the cursor on a pick miss only when the satellite pick owns it', () => {
    expect(handler).toMatch(
      new RegExp(`else if \\(${flag}\\) \\{ canvas\\.style\\.cursor = ''; ${flag} = false; \\}`),
    );
  });

  it('has no unconditional clear of a pointer cursor it did not set', () => {
    expect(handler).not.toContain(
      "canvas.style.cursor === 'pointer') canvas.style.cursor = ''",
    );
    // The gated clear above is the handler's only cursor clear.
    const clears = [...handler.matchAll(/canvas\.style\.cursor = ''/g)];
    expect(clears).toHaveLength(1);
  });
});
