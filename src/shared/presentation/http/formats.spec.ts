import { describe, expect, it } from 'bun:test';
import { FormatRegistry } from '@sinclair/typebox';
import './formats.js';

describe('formato iso-date-time', () => {
  const isIsoDateTime = (value: string) =>
    FormatRegistry.Get('iso-date-time')?.(value);

  it('aceita data e hora com fuso', () => {
    for (const value of [
      '2026-10-01T00:00:00Z',
      '2026-10-01T13:45:30.123Z',
      '2026-10-01T10:00:00-03:00',
    ]) {
      expect(isIsoDateTime(value)).toBe(true);
    }
  });

  it('recusa data curta, data sem hora, sem fuso e texto livre', () => {
    for (const value of [
      '01/10/2026',
      '2026-10-01',
      '2026-10-01T00:00:00',
      'Thu Oct 01 2026 00:00:00 GMT-0300',
      'ontem',
    ]) {
      expect(isIsoDateTime(value)).toBe(false);
    }
  });

  it('recusa data que não existe', () => {
    expect(isIsoDateTime('2026-13-01T00:00:00Z')).toBe(false);
  });
});
