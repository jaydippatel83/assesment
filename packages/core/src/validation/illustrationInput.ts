import { z } from 'zod';
import { ageLastBirthday, isValidIsoDate } from '../calc/age.js';
import { D, minOf, type Money } from '../calc/money.js';
import { FREQUENCIES, GENDERS, type PolicyType } from '../types/policy.js';

export const illustrationInputShape = z.object({
  policyTypeCode: z.string().min(1, 'Select a policy type'),
  dob: z.string().refine(isValidIsoDate, 'Enter a valid date of birth'),
  gender: z.enum(GENDERS, { error: 'Select a gender' }),
  sumAssured: z
    .number({ error: 'Enter the sum assured' })
    .int('Sum assured must be a whole number of rupees')
    .positive('Sum assured must be positive'),
  modalPremium: z
    .number({ error: 'Enter the premium' })
    .int('Premium must be a whole number of rupees')
    .positive('Premium must be positive'),
  policyTerm: z.number({ error: 'Enter the policy term' }).int('Policy term must be whole years'),
  premiumTerm: z
    .number({ error: 'Enter the premium paying term' })
    .int('Premium paying term must be whole years'),
  frequency: z.enum(FREQUENCIES, { error: 'Premium frequency must be Yearly, Half-Yearly or Monthly' }),
});

export type IllustrationInput = z.output<typeof illustrationInputShape>;

type RuleField = keyof IllustrationInput;

export interface ValidationRule {
  id: string;
  /** Which of the five rules on the product's Inputs sheet this check implements. */
  sheetRule: 1 | 2 | 3 | 4 | 5;
  field: RuleField;
  check: (input: IllustrationInput, policy: PolicyType, entryAge: number) => boolean;
  message: (policy: PolicyType) => string;
}

const inr = (value: string) => new Intl.NumberFormat('en-IN').format(Number(value));

export function instalmentsPerYear(policy: PolicyType, frequency: string): number | undefined {
  return policy.premiumOptions.find((o) => o.frequency === frequency)?.instalmentsPerYear;
}

/** Smallest sum assured allowed: 10 × the annual premium, but never more than the cap. */
export function minimumSumAssured(policy: PolicyType, annualPremium: Money): Money {
  return minOf(annualPremium.times(policy.sumAssuredMultiple), new D(policy.sumAssuredCap));
}

export const ILLUSTRATION_RULES: readonly ValidationRule[] = [
  {
    id: 'PREMIUM_TERM_RANGE',
    sheetRule: 1,
    field: 'premiumTerm',
    check: (i, p) => i.premiumTerm >= p.minPremiumTerm && i.premiumTerm <= p.maxPremiumTerm,
    message: (p) => `Premium paying term must be between ${p.minPremiumTerm} and ${p.maxPremiumTerm} years`,
  },
  {
    id: 'POLICY_TERM_RANGE',
    sheetRule: 1,
    field: 'policyTerm',
    check: (i, p) => i.policyTerm >= p.minTerm && i.policyTerm <= p.maxTerm,
    message: (p) => `Policy term must be between ${p.minTerm} and ${p.maxTerm} years`,
  },
  {
    id: 'PREMIUM_RANGE',
    sheetRule: 1,
    field: 'modalPremium',
    check: (i, p) => {
      const premium = new D(i.modalPremium);
      return premium.gte(p.minPremium) && premium.lte(p.maxPremium);
    },
    message: (p) => `Premium must be between ₹${inr(p.minPremium)} and ₹${inr(p.maxPremium)}`,
  },
  {
    id: 'TERM_ORDER',
    sheetRule: 2,
    field: 'policyTerm',
    check: (i) => i.policyTerm > i.premiumTerm,
    message: () => 'Policy term must be longer than the premium paying term',
  },
  {
    id: 'FREQUENCY',
    sheetRule: 3,
    field: 'frequency',
    check: (i, p) => instalmentsPerYear(p, i.frequency) !== undefined,
    message: (p) => `${p.name} cannot be paid at this frequency`,
  },
  {
    id: 'SUM_ASSURED_MIN',
    sheetRule: 4,
    field: 'sumAssured',
    check: (i, p) => {
      const perYear = instalmentsPerYear(p, i.frequency);
      if (perYear === undefined) return true;
      const annualPremium = new D(i.modalPremium).times(perYear);
      return new D(i.sumAssured).gte(minimumSumAssured(p, annualPremium));
    },
    message: (p) =>
      `Sum assured must be at least ${p.sumAssuredMultiple}× the annual premium, or ₹${inr(p.sumAssuredCap)} if that is lower`,
  },
  {
    id: 'ENTRY_AGE',
    sheetRule: 5,
    field: 'dob',
    check: (_i, p, age) => age >= p.minAge && age <= p.maxAge,
    message: (p) => `Age at entry must be between ${p.minAge} and ${p.maxAge} years`,
  },
];

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export function validateIllustration(
  input: IllustrationInput,
  policy: PolicyType,
  asOf: string,
): ValidationIssue[] {
  if (input.policyTypeCode !== policy.code) {
    return [{ field: 'policyTypeCode', code: 'POLICY_MISMATCH', message: 'Unknown policy type' }];
  }
  const entryAge = ageLastBirthday(input.dob, asOf);
  return ILLUSTRATION_RULES.filter((r) => !r.check(input, policy, entryAge)).map((r) => ({
    field: r.field,
    code: r.id,
    message: r.message(policy),
  }));
}

export function createIllustrationSchema(policy: PolicyType | undefined, asOf: string) {
  return illustrationInputShape.superRefine((input, ctx) => {
    if (!policy) {
      ctx.addIssue({ code: 'custom', path: ['policyTypeCode'], message: 'Unknown policy type' });
      return;
    }
    for (const issue of validateIllustration(input, policy, asOf)) {
      ctx.addIssue({
        code: 'custom',
        path: [issue.field],
        message: issue.message,
        params: { rule: issue.code },
      });
    }
  });
}
