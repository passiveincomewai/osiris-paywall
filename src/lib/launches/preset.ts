/**
 * OSIRIS — "Space Mission" preset for the Cinematic Director.
 *
 * A keyframe preset, registered through the Director's extraPresets slot
 * like Wave 2's Aircraft Follow. It flies to the launch WorldEye has
 * selected — or, with nothing selected, to the next upcoming launch's
 * pad. The target arrives via the preset context (OsirisMap feeds it from
 * the live /api/launches state); when no launch data is loaded the preset
 * builds nothing and the Director shows the unavailable note — it never
 * invents a pad to fly to.
 */
import { makeScene, type CinematicScene } from '@/lib/cinematic/scenes';
import type { CinematicPreset, CinematicPresetContext } from '@/lib/cinematic/presets';

export function spaceMissionScene(target: NonNullable<CinematicPresetContext['spaceTarget']>): CinematicScene {
  const center: [number, number] = [target.lon, target.lat];
  const padLabel = target.padName ?? 'Launch pad';
  return makeScene(`Space Mission — ${target.name}`, [
    { center, zoom: 4.2, pitch: 0, bearing: 0, durationMs: 6000, holdMs: 400, label: `Approach — ${padLabel}` },
    { center, zoom: 10.5, pitch: 40, bearing: 35, durationMs: 7000, holdMs: 600, label: 'Descent to the pad' },
    { center, zoom: 13.8, pitch: 58, bearing: 95, durationMs: 6000, holdMs: 2600, label: padLabel.slice(0, 60) },
  ]);
}

export function spaceMissionPreset(): CinematicPreset {
  return {
    id: 'space-mission',
    label: 'Space Mission',
    description: 'Fly to the pad of the selected launch — or the next launch on the board.',
    build: (ctx) => (ctx.spaceTarget ? spaceMissionScene(ctx.spaceTarget) : null),
    unavailableNote: 'Turn on the Space Missions layer and pick a launch (or wait for the board to load) — this preset flies to a real launch pad.',
  };
}
