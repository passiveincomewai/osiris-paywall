import { describe, it, expect } from 'vitest';
import { parseNdwSiteLocations, parseNdwSpeedSamples, ndwPublicationTimeMs } from './ndw';

/** Fragments trimmed from the live NDW DATEX II v3 files captured
 *  2026-11-04 (site GAD02_Amstd_31_0 is real, Amsterdam 52.379673 /
 *  4.901155). Tag and attribute structure is byte-faithful; the speed
 *  rows keep the real -1.0 no-data sentinel shape. */
const SITE_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<mc:messageContainer><mc:payload xsi:type="roa:MeasurementSiteTablePublication">
<com:publicationTime>2026-11-04T08:23:00.001Z</com:publicationTime>
<roa:measurementSiteTable id="NDW01_AVG"><roa:measurementSite id="GAD02_Amstd_31_0" version="19"><roa:measurementSiteName><com:values><com:value lang="nl">Michiel de Ruijtertunnel Richting West</com:value></com:values></roa:measurementSiteName><roa:measurementSiteLocation xsi:type="loc:PointLocation"><loc:pointByCoordinates><loc:pointCoordinates><loc:latitude>52.379673</loc:latitude><loc:longitude>4.901155</loc:longitude></loc:pointCoordinates></loc:pointByCoordinates></roa:measurementSiteLocation></roa:measurementSite><roa:measurementSite id="NO_COORDS_1" version="1"><roa:measurementSiteName><com:values><com:value lang="nl">Nowhere</com:value></com:values></roa:measurementSiteName></roa:measurementSite></roa:measurementSiteTable>
</mc:payload></mc:messageContainer>`;

const MEASUREMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<mc:messageContainer><mc:payload xsi:type="roa:MeasuredDataPublication">
<com:publicationTime>2026-11-04T08:24:00.000Z</com:publicationTime>
<roa:siteMeasurements><roa:measurementSiteReference targetClass="roa:MeasurementSite" id="GAD02_Amstd_31_0" version="19"/><roa:physicalQuantity index="1"><roa:physicalQuantity xsi:type="roa:SinglePhysicalQuantity"><roa:basicData xsi:type="roa:TrafficFlow"><roa:vehicleFlow accuracy="0.0"><com:vehicleFlowRate>480</com:vehicleFlowRate></roa:vehicleFlow></roa:basicData></roa:physicalQuantity></roa:physicalQuantity><roa:physicalQuantity index="7"><roa:physicalQuantity xsi:type="roa:SinglePhysicalQuantity"><roa:basicData xsi:type="roa:TrafficSpeed"><roa:averageVehicleSpeed accuracy="0.0" numberOfInputValuesUsed="0"><com:speed>-1.0</com:speed></roa:averageVehicleSpeed></roa:basicData></roa:physicalQuantity></roa:physicalQuantity><roa:physicalQuantity index="8"><roa:physicalQuantity xsi:type="roa:SinglePhysicalQuantity"><roa:basicData xsi:type="roa:TrafficSpeed"><roa:averageVehicleSpeed accuracy="0.0" numberOfInputValuesUsed="8" standardDeviation="6.98"><com:speed>50.0</com:speed></roa:averageVehicleSpeed></roa:basicData></roa:physicalQuantity></roa:physicalQuantity></roa:siteMeasurements>
<roa:siteMeasurements><roa:measurementSiteReference targetClass="roa:MeasurementSite" id="UNKNOWN_SITE" version="1"/><roa:physicalQuantity index="1"><roa:physicalQuantity xsi:type="roa:SinglePhysicalQuantity"><roa:basicData xsi:type="roa:TrafficSpeed"><roa:averageVehicleSpeed accuracy="0.0" numberOfInputValuesUsed="4"><com:speed>80.0</com:speed></roa:averageVehicleSpeed></roa:basicData></roa:physicalQuantity></roa:physicalQuantity></roa:siteMeasurements>
</mc:payload></mc:messageContainer>`;

describe('parseNdwSiteLocations', () => {
  it('extracts point locations by site id and skips unlocated sites', () => {
    const sites = parseNdwSiteLocations(SITE_TABLE);
    expect(sites.get('GAD02_Amstd_31_0')).toEqual({ lat: 52.379673, lng: 4.901155 });
    expect(sites.has('NO_COORDS_1')).toBe(false);
  });
});

describe('parseNdwSpeedSamples', () => {
  it('averages valid TrafficSpeed values and drops the -1 sentinel', () => {
    const sites = parseNdwSiteLocations(SITE_TABLE);
    const samples = parseNdwSpeedSamples(MEASUREMENTS, sites);
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({ lng: 4.901155, lat: 52.379673, source: 'ndw', speedKmh: 50 });
  });

  it('returns nothing without locations', () => {
    expect(parseNdwSpeedSamples(MEASUREMENTS, new Map())).toEqual([]);
  });
});

describe('ndwPublicationTimeMs', () => {
  it('reads the latest publication time', () => {
    expect(ndwPublicationTimeMs(MEASUREMENTS)).toBe(Date.parse('2026-11-04T08:24:00.000Z'));
    expect(ndwPublicationTimeMs('<x/>')).toBeNull();
  });
});
