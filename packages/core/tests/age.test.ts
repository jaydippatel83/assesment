import { describe, expect, it } from 'vitest';
import { ageLastBirthday, isValidIsoDate } from '../src/index.js';

describe('ageLastBirthday (age at last completed birthday)', () => {
  it.each([
    ['birthday is today', '1990-09-24', '2026-09-24', 36],
    ['birthday is tomorrow', '1990-09-25', '2026-09-24', 35],
    ['birthday was yesterday', '1990-09-23', '2026-09-24', 36],
    ['born 1 January, asked 31 December', '2000-01-01', '2025-12-31', 25],
    ['born 31 December, asked 1 January', '2000-12-31', '2026-01-01', 25],
    ['born today', '2026-09-24', '2026-09-24', 0],
  ])('%s', (_label, dob, asOf, expected) => {
    expect(ageLastBirthday(dob, asOf)).toBe(expected);
  });

  it('born 29 February, asked 28 February of a non-leap year: birthday not yet reached', () => {
    expect(ageLastBirthday('2000-02-29', '2025-02-28')).toBe(24);
  });

  it('born 29 February, asked 1 March of a non-leap year: birthday passed', () => {
    expect(ageLastBirthday('2000-02-29', '2025-03-01')).toBe(25);
  });

  it('born 29 February, asked 29 February of a leap year', () => {
    expect(ageLastBirthday('2000-02-29', '2024-02-29')).toBe(24);
  });

  it('rejects an impossible date', () => {
    expect(() => ageLastBirthday('2023-02-30', '2026-01-01')).toThrow(RangeError);
  });
});

describe('isValidIsoDate', () => {
  it.each([
    ['2024-02-29', true],
    ['2023-02-29', false],
    ['2023-13-01', false],
    ['2023-1-01', false],
    ['01/01/2000', false],
    ['', false],
  ])('%s → %s', (value, expected) => {
    expect(isValidIsoDate(value)).toBe(expected);
  });
});
