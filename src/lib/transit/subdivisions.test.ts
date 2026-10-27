import { describe, it, expect } from 'vitest';
import {
  TRANSIT_SUB,
  transitSubOn,
  transitLabelsOn,
  modeFamily,
  vehicleModeVisible,
  lineModeVisible,
  anyLineFamilyOn,
} from './subdivisions';

describe('transit subdivision semantics', () => {
  it('default-on subdivisions read ON when the key was never stored (persisted state predates them)', () => {
    for (const key of [TRANSIT_SUB.vehicles, TRANSIT_SUB.busRoutes, TRANSIT_SUB.railRoutes, TRANSIT_SUB.stops, TRANSIT_SUB.alerts]) {
      expect(transitSubOn({}, key)).toBe(true);
      expect(transitSubOn(null, key)).toBe(true);
      expect(transitSubOn(undefined, key)).toBe(true);
    }
  });

  it('default-on subdivisions read OFF only when explicitly false', () => {
    expect(transitSubOn({ transit_vehicles: false }, TRANSIT_SUB.vehicles)).toBe(false);
    expect(transitSubOn({ transit_vehicles: true }, TRANSIT_SUB.vehicles)).toBe(true);
  });

  it('route labels are opt-in: OFF until explicitly true', () => {
    expect(transitLabelsOn({})).toBe(false);
    expect(transitLabelsOn({ transit_labels: false })).toBe(false);
    expect(transitLabelsOn({ transit_labels: true })).toBe(true);
  });

  it('mode families split bus vs rail vs other', () => {
    expect(modeFamily('bus')).toBe('bus');
    expect(modeFamily('tram')).toBe('rail');
    expect(modeFamily('metro')).toBe('rail');
    expect(modeFamily('train')).toBe('rail');
    expect(modeFamily('ferry')).toBe('other');
    expect(modeFamily('transit')).toBe('other');
    expect(modeFamily(undefined)).toBe('other');
  });

  it('bus toggle gates bus vehicles and lines, not rail', () => {
    const layers = { transit_bus_routes: false };
    expect(vehicleModeVisible('bus', layers)).toBe(false);
    expect(lineModeVisible('bus', layers)).toBe(false);
    expect(vehicleModeVisible('tram', layers)).toBe(true);
    expect(vehicleModeVisible('train', layers)).toBe(true);
  });

  it('rail toggle gates tram/metro/train, not bus', () => {
    const layers = { transit_rail_routes: false };
    expect(vehicleModeVisible('bus', layers)).toBe(true);
    expect(vehicleModeVisible('tram', layers)).toBe(false);
    expect(vehicleModeVisible('metro', layers)).toBe(false);
    expect(vehicleModeVisible('train', layers)).toBe(false);
    expect(lineModeVisible('train', layers)).toBe(false);
  });

  it('ferries and neutral transit follow neither family toggle', () => {
    const layers = { transit_bus_routes: false, transit_rail_routes: false };
    expect(vehicleModeVisible('ferry', layers)).toBe(true);
    expect(vehicleModeVisible('transit', layers)).toBe(true);
  });

  it('anyLineFamilyOn is false only when both families are off', () => {
    expect(anyLineFamilyOn({})).toBe(true);
    expect(anyLineFamilyOn({ transit_bus_routes: false })).toBe(true);
    expect(anyLineFamilyOn({ transit_bus_routes: false, transit_rail_routes: false })).toBe(false);
  });
});
