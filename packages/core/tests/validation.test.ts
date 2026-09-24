import { describe, expect, it } from 'vitest';
import {
  createIllustrationSchema,
  ILLUSTRATION_RULES,
  validateIllustration,
  type IllustrationInput,
} from '../src/index.js';
import { AS_OF, endowment, moneyBack, validInput } from './fixtures.js';

const policy = endowment.policyType;

function codes(overrides: Partial<IllustrationInput>) {
  return validateIllustration({ ...validInput, ...overrides }, policy, AS_OF).map((i) => i.code);
}

function expectRule(overrides: Partial<IllustrationInput>, rule: string, fails: boolean) {
  const result = codes(overrides);
  if (fails) expect(result).toContain(rule);
  else expect(result).not.toContain(rule);
}

it('defines exactly five business rules', () => {
  expect(ILLUSTRATION_RULES).toHaveLength(5);
});

it('accepts a valid input with no issues', () => {
  expect(codes({})).toEqual([]);
});

describe('rule 1: entry age between 18 and 55', () => {
  it.each([
    ['exactly 18 today', '2008-09-24', false],
    ['one day short of 18', '2008-09-25', true],
    ['55, birthday today', '1971-09-24', false],
    ['56, birthday today', '1970-09-24', true],
  ])('%s', (_label, dob, fails) => {
    expectRule({ dob, policyTerm: 10, premiumTerm: 10 }, 'ENTRY_AGE', fails);
  });
});

describe('rule 2: sum assured between 1,00,000 and 1,00,00,000', () => {
  it.each([
    [100_000, false],
    [99_999, true],
    [10_000_000, false],
    [10_000_001, true],
  ])('%d', (sumAssured, fails) => {
    expectRule({ sumAssured }, 'SUM_ASSURED_RANGE', fails);
  });
});

describe('rule 3: policy term between 10 and 30 years', () => {
  it.each([
    [10, false],
    [9, true],
    [30, false],
    [31, true],
  ])('%d years', (policyTerm, fails) => {
    expectRule({ policyTerm, premiumTerm: 5 }, 'POLICY_TERM_RANGE', fails);
  });
});

describe('rule 4: premium term at least 5 and not more than the policy term', () => {
  it.each([
    ['PPT 5', 5, false],
    ['PPT 4', 4, true],
    ['PPT equal to PT', 20, false],
    ['PPT one more than PT', 21, true],
  ])('%s (PT 20)', (_label, premiumTerm, fails) => {
    expectRule({ policyTerm: 20, premiumTerm }, 'PREMIUM_TERM_RANGE', fails);
  });
});

describe('rule 5: age at maturity at most 75 (cross-field)', () => {
  it.each([
    ['50 + 25 = 75', 25, false],
    ['50 + 26 = 76', 26, true],
  ])('%s', (_label, policyTerm, fails) => {
    expectRule({ dob: '1976-09-24', policyTerm, premiumTerm: 10 }, 'MATURITY_AGE', fails);
  });
});

it('reports every failing rule at once, not just the first', () => {
  expect(
    codes({ dob: '2010-01-01', sumAssured: 50_000, policyTerm: 40, premiumTerm: 41 }),
  ).toEqual(['ENTRY_AGE', 'SUM_ASSURED_RANGE', 'POLICY_TERM_RANGE', 'PREMIUM_TERM_RANGE']);
});

describe('product checks', () => {
  it('rejects a frequency the product does not offer', () => {
    const input = { ...validInput, policyTypeCode: 'MONEYBACK', sumAssured: 500_000, policyTerm: 15, premiumTerm: 10, frequency: 'QUARTERLY' as const };
    const result = validateIllustration(input, moneyBack.policyType, AS_OF).map((i) => i.code);
    expect(result).toEqual(['FREQUENCY_NOT_OFFERED']);
  });

  it('rejects a rider the product does not offer', () => {
    expect(codes({ riderCodes: ['ADB', 'XYZ'] })).toEqual(['RIDER_NOT_OFFERED']);
  });

  it('rejects a duplicated rider', () => {
    expect(codes({ riderCodes: ['ADB', 'ADB'] })).toEqual(['DUPLICATE_RIDER']);
  });
});

describe('createIllustrationSchema', () => {
  const schema = createIllustrationSchema(policy, AS_OF);

  it('parses a valid input', () => {
    expect(schema.safeParse(validInput).success).toBe(true);
  });

  it('maps rule failures onto the offending field', () => {
    const result = schema.safeParse({ ...validInput, premiumTerm: 25 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['premiumTerm']);
  });

  it('rejects wrong types before running business rules', () => {
    const result = schema.safeParse({ ...validInput, sumAssured: '100000', dob: '2000-02-30' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(['dob', 'sumAssured']);
  });

  it('rejects an unknown policy type', () => {
    const result = createIllustrationSchema(undefined, AS_OF).safeParse(validInput);
    expect(result.error?.issues[0]?.path).toEqual(['policyTypeCode']);
  });
});
