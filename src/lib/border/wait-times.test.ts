import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetBorderCacheForTests,
  getBorderWaitTimes,
  normalizeCbpPayload,
  type RawCbpPort,
} from './wait-times';

/**
 * Fixtures are verbatim records from CBP's live Border Wait Times
 * feed, captured 2026-10-26 (America/Denver evening) — Blaine's
 * Pacific Highway port in a normal "no delay" state, and El Paso's
 * Paso del Norte with its standard lanes closed overnight, a SENTRI
 * lane reporting CBP's own "no delay" + 1-minute pairing, a
 * construction notice, and N/A commercial lanes. The third record is
 * Alexandria Bay as first probed, when every lane read
 * "Update Pending". If CBP changes the feed's shape, these tests are
 * the tripwire.
 */

const BLAINE_300401: RawCbpPort = {
  port_number: '300401',
  border: 'Canadian Border',
  port_name: 'Blaine',
  crossing_name: 'Pacific Highway',
  hours: '24 hrs/day',
  date: '10/26/2026',
  time: '22:29:17',
  port_status: 'Open',
  commercial_vehicle_lanes: {
    maximum_lanes: '3',
    standard_lanes: { update_time: 'At 11:00 pm PDT', operational_status: 'no delay', delay_minutes: '0', lanes_open: '1' },
    FAST_lanes: { update_time: '', operational_status: 'Lanes Closed', delay_minutes: '', lanes_open: '' },
  },
  passenger_vehicle_lanes: {
    maximum_lanes: '7',
    standard_lanes: { update_time: 'At 11:00 pm PDT', operational_status: 'no delay', delay_minutes: '0', lanes_open: '1' },
    NEXUS_SENTRI_lanes: { update_time: '', operational_status: 'Lanes Closed', delay_minutes: '', lanes_open: '' },
    ready_lanes: { update_time: '', operational_status: 'Lanes Closed', delay_minutes: '', lanes_open: '' },
  },
  pedestrian_lanes: {
    maximum_lanes: 'N/A',
    standard_lanes: { update_time: '', operational_status: 'N/A', delay_minutes: '', lanes_open: '' },
    ready_lanes: { update_time: '', operational_status: 'N/A', delay_minutes: '', lanes_open: '' },
  },
  construction_notice: '',
};

const PDN_240202: RawCbpPort = {
  port_number: '240202',
  border: 'Mexican Border',
  port_name: 'El Paso',
  crossing_name: 'Paso Del Norte (PDN)',
  hours: '24 hrs/day',
  date: '10/26/2026',
  time: '23:29:17',
  port_status: 'Open',
  commercial_vehicle_lanes: {
    maximum_lanes: 'N/A',
    standard_lanes: { update_time: '', operational_status: 'N/A', delay_minutes: '', lanes_open: '' },
    FAST_lanes: { update_time: '', operational_status: 'N/A', delay_minutes: '', lanes_open: '' },
  },
  passenger_vehicle_lanes: {
    maximum_lanes: '12',
    standard_lanes: { update_time: '', operational_status: 'Lanes Closed', delay_minutes: '', lanes_open: '' },
    NEXUS_SENTRI_lanes: { update_time: 'At 11:00 pm MDT', operational_status: 'no delay', delay_minutes: '1', lanes_open: '3' },
    ready_lanes: { update_time: 'At 11:00 pm MDT', operational_status: 'no delay', delay_minutes: '1', lanes_open: '3' },
  },
  pedestrian_lanes: {
    maximum_lanes: '14',
    standard_lanes: { update_time: 'At 11:00 pm MDT', operational_status: 'no delay', delay_minutes: '1', lanes_open: '1' },
    ready_lanes: { update_time: 'At 11:00 pm MDT', operational_status: 'no delay', delay_minutes: '1', lanes_open: '1' },
  },
  construction_notice:
    'Ready Lanes are open at PDN.  See www.getyouhome.gov for more information. Tune in to AM 1620 for border crossing information.',
};

const ALEXANDRIA_BAY_PENDING: RawCbpPort = {
  port_number: '070801',
  border: 'Canadian Border',
  port_name: 'Alexandria Bay',
  crossing_name: 'Thousand Islands Bridge',
  hours: '24 hrs/day',
  date: '10/27/2026',
  time: '01:29:17',
  port_status: 'Open',
  passenger_vehicle_lanes: {
    maximum_lanes: '8',
    standard_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
    NEXUS_SENTRI_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
    ready_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
  },
  commercial_vehicle_lanes: {
    maximum_lanes: '5',
    standard_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
    FAST_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
  },
  pedestrian_lanes: {
    maximum_lanes: 'N/A',
    standard_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
    ready_lanes: { update_time: '', operational_status: 'Update Pending', delay_minutes: '', lanes_open: '' },
  },
  construction_notice: '',
};

describe('normalizeCbpPayload', () => {
  it('parses a fully reported port (Blaine, Pacific Highway)', () => {
    const [port] = normalizeCbpPayload([BLAINE_300401]);
    expect(port.portNumber).toBe('300401');
    expect(port.border).toBe('Canadian Border');
    expect(port.crossingName).toBe('Pacific Highway');
    const passenger = port.groups.find((g) => g.key === 'passenger');
    expect(passenger?.maximumLanes).toBe(7);
    const standard = passenger?.lanes.find((l) => l.key === 'standard');
    expect(standard).toMatchObject({
      status: 'no delay',
      delayMinutes: 0,
      lanesOpen: 1,
      updateTime: 'At 11:00 pm PDT',
    });
    const nexus = passenger?.lanes.find((l) => l.key === 'nexusSentri');
    expect(nexus?.status).toBe('Lanes Closed');
    // A closed lane publishes no numbers — they must stay null,
    // never be coerced into a zero wait.
    expect(nexus?.delayMinutes).toBeNull();
    expect(nexus?.lanesOpen).toBeNull();
    expect(nexus?.updateTime).toBeNull();
  });

  it('maps "N/A" maximum lanes to null but keeps the group', () => {
    const [port] = normalizeCbpPayload([BLAINE_300401]);
    const pedestrian = port.groups.find((g) => g.key === 'pedestrian');
    expect(pedestrian).toBeDefined();
    expect(pedestrian?.maximumLanes).toBeNull();
    expect(pedestrian?.lanes[0].status).toBe('N/A');
  });

  it('carries CBP\u2019s own inconsistencies verbatim (PDN SENTRI: "no delay", 1 minute)', () => {
    const [port] = normalizeCbpPayload([PDN_240202]);
    const passenger = port.groups.find((g) => g.key === 'passenger');
    const sentri = passenger?.lanes.find((l) => l.key === 'nexusSentri');
    expect(sentri).toMatchObject({ status: 'no delay', delayMinutes: 1, lanesOpen: 3 });
    const standard = passenger?.lanes.find((l) => l.key === 'standard');
    expect(standard?.status).toBe('Lanes Closed');
    expect(port.constructionNotice).toContain('Ready Lanes are open at PDN');
    const commercial = port.groups.find((g) => g.key === 'commercial');
    expect(commercial?.maximumLanes).toBeNull();
    expect(commercial?.lanes.map((l) => l.key)).toEqual(['standard', 'fast']);
  });

  it('never converts "Update Pending" into a zero wait', () => {
    const [port] = normalizeCbpPayload([ALEXANDRIA_BAY_PENDING]);
    for (const group of port.groups) {
      for (const lane of group.lanes) {
        expect(lane.status).toBe('Update Pending');
        expect(lane.delayMinutes).toBeNull();
        expect(lane.lanesOpen).toBeNull();
      }
    }
  });

  it('drops malformed records and dedupes port numbers', () => {
    const ports = normalizeCbpPayload([
      BLAINE_300401,
      BLAINE_300401,
      { port_name: 'No Number' },
      null,
      'junk',
      PDN_240202,
    ]);
    expect(ports.map((p) => p.portNumber)).toEqual(['300401', '240202']);
    expect(normalizeCbpPayload({ not: 'an array' })).toEqual([]);
    expect(normalizeCbpPayload(null)).toEqual([]);
  });
});

describe('getBorderWaitTimes cache behaviour', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetBorderCacheForTests();
  });

  function stubFetchOk(payload: unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })),
    );
  }

  it('serves parsed ports and reports fresh after a good fetch', async () => {
    stubFetchOk([BLAINE_300401, PDN_240202]);
    const result = await getBorderWaitTimes();
    expect(result.stale).toBe(false);
    expect(result.ports).toHaveLength(2);
    expect(result.byPortNumber.get('240202')?.crossingName).toBe('Paso Del Norte (PDN)');
    expect(result.fetchedAt).not.toBeNull();
  });

  it('serves an empty, stale set when the feed fails before any success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    const result = await getBorderWaitTimes();
    expect(result.ports).toEqual([]);
    expect(result.stale).toBe(true);
    expect(result.fetchedAt).toBeNull();
  });

  it('bridges a failed refresh with the last good set, flagged stale', async () => {
    stubFetchOk([BLAINE_300401]);
    const first = await getBorderWaitTimes(1_000_000);
    expect(first.stale).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const second = await getBorderWaitTimes(1_000_000 + 5 * 60_000);
    expect(second.ports).toHaveLength(1);
    expect(second.stale).toBe(true);
  });
});
