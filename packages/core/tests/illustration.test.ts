import { describe, expect, it } from 'vitest';
import {
  calculatePremium,
  D,
  generateIllustration,
  InvalidIllustrationError,
  lookupPremiumRate,
  RateNotFoundError,
  toIllustrationDTO,
  type IllustrationInput,
} from '../src/index.js';
import { AS_OF, endowment, validInput } from './fixtures.js';

const { policyType, rates } = endowment;
const run = (overrides: Partial<IllustrationInput> = {}) =>
  toIllustrationDTO(generateIllustration({ ...validInput, ...overrides }, policyType, rates, AS_OF));

describe('golden case: ENDOWMENT, male 30, SA 10L, PT 20, PPT 10, annual', () => {
  const result = run();

  it('prices the premium', () => {
    expect(result.premium.entryAge).toBe(30);
    expect(result.premium.ratePerMille).toBe('40.2');
    expect(result.premium.modalPremium).toBe('80400.00');
    expect(result.premium.annualisedPremium).toBe('80400.00');
  });

  it('has one row per policy year, with ages from entry age', () => {
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0]).toMatchObject({ policyYear: 1, age: 30 });
    expect(result.rows[19]).toMatchObject({ policyYear: 20, age: 49 });
  });

  it('year 1', () => {
    expect(result.rows[0]).toMatchObject({
      totalPremium: '80400.00',
      cumulativePremium: '80400.00',
      bonus: '45000.00',
      accruedBonus: '45000.00',
      deathBenefit: '1045000.00',
      surrenderValue: '0.00',
      maturityBenefit: '0.00',
      netCashflow: '-80400.00',
    });
  });

  it('year 10, the last premium year', () => {
    expect(result.rows[9]).toMatchObject({
      totalPremium: '80400.00',
      cumulativePremium: '804000.00',
      accruedBonus: '450000.00',
      deathBenefit: '1450000.00',
      surrenderValue: '482400.00',
    });
  });

  it('year 11, premiums have stopped', () => {
    expect(result.rows[10]).toMatchObject({
      totalPremium: '0.00',
      cumulativePremium: '804000.00',
      netCashflow: '0.00',
    });
  });

  it('year 20, maturity', () => {
    expect(result.rows[19]).toMatchObject({
      accruedBonus: '900000.00',
      maturityBenefit: '2035000.00',
      surrenderValue: '0.00',
      netCashflow: '2035000.00',
    });
  });

  it('summary', () => {
    expect(result.summary).toEqual({
      totalPremiumPaid: '804000.00',
      maturityBenefit: '2035000.00',
      maturityAge: 50,
    });
    expect(result.rateVersion).toBe('2026.1');
  });
});

describe('premium calculation', () => {
  it('rates a female three years younger', () => {
    const premium = calculatePremium(
      { ...validInput, gender: 'FEMALE', dob: '1999-01-15' },
      policyType,
      rates,
      AS_OF,
    );
    expect(premium.entryAge).toBe(27);
    expect(premium.ratingAge).toBe(24);
    expect(premium.ratePerMille.toString()).toBe('38.5');
  });

  it('prices riders and a monthly frequency, rounding the instalment to paise', () => {
    const result = run({
      dob: '1986-01-15',
      sumAssured: 500_000,
      policyTerm: 15,
      premiumTerm: 15,
      frequency: 'MONTHLY',
      riderCodes: ['ADB', 'CI'],
    });
    expect(result.premium.annualBasePremium).toBe('21900.00');
    expect(result.premium.annualRiderPremium).toBe('850.00');
    expect(result.premium.modalPremium).toBe('1990.63');
    expect(result.premium.annualisedPremium).toBe('23887.56');
    expect(result.rows[0]).toMatchObject({
      basePremium: '22995.06',
      riderPremium: '892.50',
      totalPremium: '23887.56',
    });
  });

  it('adds premiums with no floating-point drift', () => {
    let floatSum = 0;
    for (let i = 0; i < 12; i++) floatSum += 1990.63;
    expect(floatSum).not.toBe(23887.56);

    const result = run({
      dob: '1986-01-15',
      sumAssured: 500_000,
      policyTerm: 15,
      premiumTerm: 15,
      frequency: 'MONTHLY',
      riderCodes: ['ADB', 'CI'],
    });
    expect(result.premium.annualisedPremium).toBe('23887.56');
    expect(result.summary.totalPremiumPaid).toBe('358313.40');
    expect(new D(result.summary.totalPremiumPaid).equals(new D('1990.63').times(12).times(15))).toBe(true);
  });
});

describe('failure modes', () => {
  it('throws on a missing rate instead of pricing at zero', () => {
    expect(() => lookupPremiumRate(rates, 70)).toThrow(RateNotFoundError);
  });

  it('refuses a premium term longer than the policy term', () => {
    expect(() => run({ premiumTerm: 21 })).toThrow(InvalidIllustrationError);
  });

  it('refuses mismatched product and input', () => {
    expect(() => run({ policyTypeCode: 'MONEYBACK' })).toThrow(InvalidIllustrationError);
  });

  it('is deterministic: same input and date give the same output', () => {
    expect(run()).toEqual(run());
  });
});
