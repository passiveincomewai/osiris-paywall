import { describe, expect, it } from 'vitest';
import { compassAbbr, compassLabel, parseCompassDirection } from './compass';

describe('parseCompassDirection', () => {
  it('parses the FAA-style full words in any casing or separation', () => {
    expect(parseCompassDirection('North')).toBe(0);
    expect(parseCompassDirection('NorthWest')).toBe(315);
    expect(parseCompassDirection('north-west')).toBe(315);
    expect(parseCompassDirection('North West')).toBe(315);
    expect(parseCompassDirection('South')).toBe(180);
    expect(parseCompassDirection('southeast')).toBe(135);
  });

  it('parses abbreviations and sixteen-point words', () => {
    expect(parseCompassDirection('NE')).toBe(45);
    expect(parseCompassDirection('nne')).toBe(22.5);
    expect(parseCompassDirection('North-Northeast')).toBe(22.5);
    expect(parseCompassDirection('WSW')).toBe(247.5);
  });

  it('accepts degrees given as a number or numeric string', () => {
    expect(parseCompassDirection(90)).toBe(90);
    expect(parseCompassDirection('270')).toBe(270);
    expect(parseCompassDirection(359.5)).toBe(359.5);
  });

  it('refuses anything that is not a direction', () => {
    expect(parseCompassDirection(null)).toBeNull();
    expect(parseCompassDirection(undefined)).toBeNull();
    expect(parseCompassDirection('')).toBeNull();
    expect(parseCompassDirection('Northbound')).toBeNull();
    expect(parseCompassDirection('NA')).toBeNull();
    expect(parseCompassDirection(360)).toBeNull();
    expect(parseCompassDirection(-10)).toBeNull();
  });
});

describe('compass labels', () => {
  it('names the sector a bearing falls in', () => {
    expect(compassLabel(0)).toBe('north');
    expect(compassLabel(315)).toBe('northwest');
    expect(compassLabel(44)).toBe('northeast');
    expect(compassLabel(180)).toBe('south');
    expect(compassAbbr(225)).toBe('SW');
    expect(compassAbbr(90)).toBe('E');
  });

  it('round-trips the source word for the readout', () => {
    expect(compassLabel(parseCompassDirection('NorthWest')!)).toBe('northwest');
    expect(compassLabel(parseCompassDirection('South')!)).toBe('south');
  });
});
