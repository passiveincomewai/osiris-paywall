import { describe, it, expect } from 'vitest';
import { GEO_LAYER_DEFS, layerDef, layersForEngine } from './geo-layers';
import { buildGeoJson } from '../../components/fraud-radar/FraudRadarGeoMap';

/**
 * §5.1/§5.3 pins: the layer set is the closed published set;
 * recipient and performance layers are distinct keys with
 * distinct semantics; the map join keys cells to boundary
 * polygons by state name and never invents a value for withheld
 * or no-record states.
 */
describe('geo-layers — closed set + separation', () => {
  it('carries exactly the 11 published layers', () => {
    expect(GEO_LAYER_DEFS.map((d) => d.layer).sort()).toEqual([
      'care_home_health_state',
      'care_hospice_state',
      'contracts_performance_state',
      'contracts_subrecipient_state',
      'contracts_vendor_state',
      'grants_performance_state',
      'grants_recipient_state',
      'grants_subrecipient_state',
      'medicaid_billing_practice_state',
      'medicaid_servicing_practice_state',
      'medicare_provider_state',
    ]);
  });

  it('recipient vs performance are separate layers, never one def', () => {
    const r = layerDef('grants_recipient_state');
    const p = layerDef('grants_performance_state');
    expect(r).not.toBeNull();
    expect(p).not.toBeNull();
    expect(r!.geographyFieldLabel).not.toBe(p!.geographyFieldLabel);
    expect(layersForEngine('grants')).toHaveLength(3);
  });

  it('no layer is a signals/screening layer (§5.2 refusal)', () => {
    for (const d of GEO_LAYER_DEFS) {
      expect(d.layer).not.toMatch(/signal|lead|screen/);
    }
  });
});

describe('buildGeoJson — boundary join', () => {
  const boundaries = {
    features: [
      { type: 'Feature', properties: { name: 'Utah' }, geometry: null },
      { type: 'Feature', properties: { name: 'Wyoming' }, geometry: null },
    ],
  };
  it('joins by state name; unknown polygons get no value', () => {
    const out = buildGeoJson(boundaries as never, [
      { stateCode: 'UT', stateName: 'Utah', attribution: 'attributed', value: 50 },
    ], 100);
    const ut = out.features[0].properties as Record<string, unknown>;
    const wy = out.features[1].properties as Record<string, unknown>;
    expect(ut.stateCode).toBe('UT');
    expect(ut.share).toBe(0.5);
    expect(wy.share).toBe(-1);
    expect(wy.attribution).toBe('no_published_records');
  });

  it('withheld cells carry share -1 (flat), never a ramp value', () => {
    const out = buildGeoJson(boundaries as never, [
      { stateCode: 'UT', stateName: 'Utah', attribution: 'withheld_small_cell', value: null },
    ], 100);
    expect((out.features[0].properties as Record<string, unknown>).share).toBe(-1);
  });
});
