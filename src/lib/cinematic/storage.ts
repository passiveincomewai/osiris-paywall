/**
 * OSIRIS — cinematic scene persistence (localStorage).
 *
 * The storage backend is injectable so the logic is testable without a
 * DOM; in the app it defaults to window.localStorage behind try/catch
 * (storage can be unavailable in private contexts — scenes then simply
 * live for the session instead of crashing the director).
 */
import { normalizeScene, type CinematicScene } from './scenes';

export const SCENES_STORAGE_KEY = 'we_cinematic_scenes_v1';
const MAX_SAVED_SCENES = 24;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultStorage(): KeyValueStorage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* unavailable */ }
  return null;
}

export function loadSavedScenes(storage: KeyValueStorage | null = defaultStorage()): CinematicScene[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCENES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => normalizeScene(s))
      .filter((s): s is CinematicScene => s !== null)
      .slice(0, MAX_SAVED_SCENES);
  } catch {
    return [];
  }
}

export function saveSavedScenes(scenes: CinematicScene[], storage: KeyValueStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes.slice(0, MAX_SAVED_SCENES)));
  } catch { /* quota / private mode — scenes stay session-only */ }
}

/** Insert or replace by id; returns the new list (newest first). */
export function upsertScene(scenes: CinematicScene[], scene: CinematicScene): CinematicScene[] {
  return [scene, ...scenes.filter((s) => s.id !== scene.id)].slice(0, MAX_SAVED_SCENES);
}

export function deleteScene(scenes: CinematicScene[], id: string): CinematicScene[] {
  return scenes.filter((s) => s.id !== id);
}
