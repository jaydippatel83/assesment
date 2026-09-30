import { describe, expect, it } from 'vitest';
import {
  createIllustrationSchema,
  ILLUSTRATION_RULES,
  validateIllustration,
  type IllustrationInput,
  type PolicyType,
} from '../src/index.js';
import { AS_OF, endowment, sheetInput, validInput } from './fixtures.js';

const policy = endowment.policyType;

function codes(overrides: Partial<IllustrationInput>, on: PolicyType = policy) {
  return validateIllustration({ ...validInput, ...overrides }, on, AS_OF).map((i) => i.code);
}

function expectRule(overrides: Partial<IllustrationInput>, rule: string, fails: boolean) {
  const result = codes(overrides);
  if (fails) expect(result).toContain(rule);
  else expect(result).not.toContain(rule);
}

it('implements all five rules from the Inputs sheet', () => {
  expect([...new Set(ILLUSTRATION_RULES.map((r) => r.sheetRule))]).toEqual([1, 2, 3, 4, 5]);
});

it('accepts a valid input with no issues', () => {
  expect(codes({})).toEqual([]);
});

it('rejects the sheet’s own example, whose ₹80,000 premium is over the ₹50,000 maximum', () => {
  expect(validateIllustration(sheetInput, policy, AS_OF).map((i) => i.code)).toEqual(['PREMIUM_RANGE']);
});

describe('rule 1: PPT 5–10, PT 10–20, premium ₹10,000–₹50,000', () => {
  it.each([
    [5, false],
    [4, true],
    [10, false],
    [11, true],
  ])('PPT %d', (premiumTerm, fails) => {
    expectRule({ premiumTerm, policyTerm: 18 }, 'PREMIUM_TERM_RANGE', fails);
  });

  it.each([
    [10, false],
    [9, true],
    [20, false],
    [21, true],
  ])('PT %d', (policyTerm, fails) => {
    expectRule({ policyTerm, premiumTerm: 5 }, 'POLICY_TERM_RANGE', fails);
  });

  it.each([
    [10_000, false],
    [9_999, true],
    [50_000, false],
    [50_001, true],
  ])('premium %d', (modalPremium, fails) => {
    expectRule({ modalPremium }, 'PREMIUM_RANGE', fails);
  });

  it('checks the limit against the instalment, not the annual total', () => {
    expectRule({ modalPremium: 10_000, frequency: 'MONTHLY', sumAssured: 1_200_000 }, 'PREMIUM_RANGE', false);
  });
});

describe('rule 2: PT greater than PPT', () => {
  it.each([
    ['PT 11, PPT 10', 11, false],
    ['PT 10, PPT 10', 10, true],
  ])('%s', (_label, policyTerm, fails) => {
    expectRule({ policyTerm, premiumTerm: 10 }, 'TERM_ORDER', fails);
  });
});

describe('rule 3: premium frequency is Yearly, Half-Yearly or Monthly', () => {
  it('rejects quarterly before running the rules', () => {
    const result = createIllustrationSchema(policy, AS_OF).safeParse({ ...validInput, frequency: 'QUARTERLY' });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['frequency']);
  });

  it('rejects a frequency the plan does not offer', () => {
    const yearlyOnly = { ...policy, premiumOptions: policy.premiumOptions.slice(0, 1) };
    expect(codes({ frequency: 'MONTHLY' }, yearlyOnly)).toEqual(['FREQUENCY']);
  });
});

describe('rule 4: sum assured at least the lower of 10× annual premium and ₹50,00,000', () => {
  it.each([
    ['yearly ₹40,000 needs ₹4,00,000', 40_000, 'ANNUAL', 400_000, false],
    ['yearly ₹40,000, ₹1 short', 40_000, 'ANNUAL', 399_999, true],
    ['half-yearly ₹30,000 (₹60,000 a year) needs ₹6,00,000', 30_000, 'SEMI_ANNUAL', 600_000, false],
    ['half-yearly ₹30,000, ₹1 short', 30_000, 'SEMI_ANNUAL', 599_999, true],
    ['monthly ₹50,000 (₹6,00,000 a year) is capped at ₹50,00,000', 50_000, 'MONTHLY', 5_000_000, false],
    ['monthly ₹50,000, ₹1 under the cap', 50_000, 'MONTHLY', 4_999_999, true],
  ] as const)('%s', (_label, modalPremium, frequency, sumAssured, fails) => {
    expectRule({ modalPremium, frequency, sumAssured }, 'SUM_ASSURED_MIN', fails);
  });
});

describe('rule 5: entry age between 23 and 56', () => {
  it.each([
    ['exactly 23 today', '2003-09-24', false],
    ['one day short of 23', '2003-09-25', true],
    ['56, birthday today', '1970-09-24', false],
    ['57, birthday today', '1969-09-24', true],
  ])('%s', (_label, dob, fails) => {
    expectRule({ dob }, 'ENTRY_AGE', fails);
  });
});

it('reports every failing rule at once, not just the first', () => {
  expect(codes({ dob: '2010-01-01', modalPremium: 5_000, policyTerm: 25, premiumTerm: 12 })).toEqual([
    'PREMIUM_TERM_RANGE',
    'POLICY_TERM_RANGE',
    'PREMIUM_RANGE',
    'ENTRY_AGE',
  ]);
});

describe('createIllustrationSchema', () => {
  const schema = createIllustrationSchema(policy, AS_OF);

  it('parses a valid input', () => {
    expect(schema.safeParse(validInput).success).toBe(true);
  });

  it('maps rule failures onto the offending field', () => {
    const result = schema.safeParse({ ...validInput, premiumTerm: 12 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['premiumTerm']);
  });

  it('rejects wrong types before running business rules', () => {
    const result = schema.safeParse({ ...validInput, modalPremium: '40000', dob: '2000-02-30' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(['dob', 'modalPremium']);
  });

  it('rejects an unknown policy type', () => {
    const result = createIllustrationSchema(undefined, AS_OF).safeParse(validInput);
    expect(result.error?.issues[0]?.path).toEqual(['policyTypeCode']);
  });
});
