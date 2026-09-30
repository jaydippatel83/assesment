import { describe, expect, it } from 'vitest';
import {
  calculatePremium,
  D,
  generateIllustration,
  InvalidIllustrationError,
  irr,
  RateNotFoundError,
  toIllustrationDTO,
  type IllustrationInput,
} from '../src/index.js';
import { AS_OF, endowment, sheetInput, validInput } from './fixtures.js';

const { policyType, rates } = endowment;
const run = (overrides: Partial<IllustrationInput> = {}, base = sheetInput) =>
  toIllustrationDTO(generateIllustration({ ...base, ...overrides }, policyType, rates, AS_OF));

describe('golden case: the Illustrations sheet (SA 12L, ₹80,000 yearly, PT 18, PPT 10)', () => {
  const result = run();

  it('has one row per year of the bonus schedule', () => {
    expect(result.rows).toHaveLength(20);
    expect(result.rows.map((r) => r.policyYear)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('matches every row of the sheet', () => {
    const sheet: [string, string, string, string, string, string][] = [
      ['80000.00', '0.00', '0.025', '30000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.03', '36000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.035', '42000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.035', '42000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.035', '42000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.035', '42000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.03', '36000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.03', '36000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.03', '36000.00', '0.00', '-80000.00'],
      ['80000.00', '0.00', '0.03', '36000.00', '0.00', '-80000.00'],
      ['0.00', '0.00', '0.03', '36000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.025', '30000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.03', '36000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.03', '36000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.025', '30000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.05', '60000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.04', '48000.00', '0.00', '0.00'],
      ['0.00', '1200000.00', '0.045', '54000.00', '2256000.00', '2256000.00'],
      ['0.00', '0.00', '0.04', '48000.00', '0.00', '0.00'],
      ['0.00', '0.00', '0.25', '300000.00', '0.00', '0.00'],
    ];
    expect(
      result.rows.map((r) => [r.premium, r.sumAssured, r.bonusRate, r.bonusAmount, r.totalBenefit, r.netCashflow]),
    ).toEqual(sheet);
  });

  it('gives the sheet’s IRR of 8.4%', () => {
    expect(result.summary.irr).toBe('0.084150');
    expect(new D(result.summary.irr!).times(100).toDecimalPlaces(1).toString()).toBe('8.4');
  });

  it('summary', () => {
    expect(result.summary).toEqual({
      totalPremiumPaid: '800000.00',
      totalBonus: '1056000.00',
      maturityBenefit: '2256000.00',
      maturityAge: 44,
      irr: '0.084150',
    });
    expect(result.premium).toEqual({
      entryAge: 26,
      modalPremium: '80000.00',
      instalmentsPerYear: 1,
      annualisedPremium: '80000.00',
    });
    expect(result.rateVersion).toBe('2026.2');
  });
});

describe('premium frequency', () => {
  it('annualises a half-yearly premium', () => {
    const result = run({ modalPremium: 20_000, frequency: 'SEMI_ANNUAL' }, validInput);
    expect(result.premium.annualisedPremium).toBe('40000.00');
    expect(result.rows[0]!.premium).toBe('40000.00');
    expect(result.summary.totalPremiumPaid).toBe('400000.00');
  });

  it('annualises a monthly premium', () => {
    const premium = calculatePremium({ ...validInput, modalPremium: 12_345, frequency: 'MONTHLY' }, policyType, AS_OF);
    expect(premium.instalmentsPerYear).toBe(12);
    expect(premium.annualisedPremium.toString()).toBe('148140');
  });
});

describe('maturity year follows the policy term', () => {
  it('pays the total benefit in the policy term year only', () => {
    const result = run({ policyTerm: 12, premiumTerm: 6 });
    const paid = result.rows.filter((r) => r.totalBenefit !== '0.00');
    expect(paid.map((r) => r.policyYear)).toEqual([12]);
    expect(result.rows[11]).toMatchObject({ sumAssured: '1200000.00', totalBenefit: '2256000.00' });
    expect(result.summary.maturityAge).toBe(26 + 12);
  });
});

describe('irr', () => {
  it('is null when the cash flows never change sign', () => {
    expect(irr([new D(-100), new D(-100)])).toBeNull();
    expect(irr([new D(0), new D(100)])).toBeNull();
  });

  it('solves a simple case exactly', () => {
    expect(irr([new D(-100), new D(110)])!.toDecimalPlaces(8).toString()).toBe('0.1');
  });
});

describe('failure modes', () => {
  it('throws when the bonus schedule is shorter than the policy term', () => {
    const short = { ...rates, bonusRates: rates.bonusRates.slice(0, 15) };
    expect(() => generateIllustration(sheetInput, policyType, short, AS_OF)).toThrow(RateNotFoundError);
  });

  it('refuses a premium term that is not shorter than the policy term', () => {
    expect(() => run({ premiumTerm: 18 })).toThrow(InvalidIllustrationError);
  });

  it('refuses mismatched product and input', () => {
    expect(() => run({ policyTypeCode: 'OTHER' })).toThrow(InvalidIllustrationError);
  });

  it('is deterministic: same input and date give the same output', () => {
    expect(run()).toEqual(run());
  });
});
