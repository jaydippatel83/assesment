import { z } from 'zod';
import { ageLastBirthday, isValidIsoDate } from '../calc/age.js';
import { D } from '../calc/money.js';
import { FREQUENCIES, GENDERS, type PolicyType } from '../types/policy.js';

export const illustrationInputShape = z.object({
  policyTypeCode: z.string().min(1, 'Select a policy type'),
  dob: z.string().refine(isValidIsoDate, 'Enter a valid date of birth'),
  gender: z.enum(GENDERS, { error: 'Select a gender' }),
  sumAssured: z
    .number({ error: 'Enter the sum assured' })
    .int('Sum assured must be a whole number of rupees')
    .positive('Sum assured must be positive'),
  policyTerm: z.number({ error: 'Enter the policy term' }).int('Policy term must be whole years'),
  premiumTerm: z
    .number({ error: 'Enter the premium paying term' })
    .int('Premium paying term must be whole years'),
  frequency: z.enum(FREQUENCIES, { error: 'Select a premium frequency' }),
  riderCodes: z.array(z.string()).default([]),
});

export type IllustrationInput = z.output<typeof illustrationInputShape>;

type RuleField = keyof IllustrationInput;

export interface ValidationRule {
  id: string;
  field: RuleField;
  check: (input: IllustrationInput, policy: PolicyType, entryAge: number) => boolean;
  message: (policy: PolicyType) => string;
}

const inr = (value: string) => new Intl.NumberFormat('en-IN').format(Number(value));

export const ILLUSTRATION_RULES: readonly ValidationRule[] = [
  {
    id: 'ENTRY_AGE',
    field: 'dob',
    check: (_i, p, age) => age >= p.minAge && age <= p.maxAge,
    message: (p) => `Age at entry must be between ${p.minAge} and ${p.maxAge} years`,
  },
  {
    id: 'SUM_ASSURED_RANGE',
    field: 'sumAssured',
    check: (i, p) => {
      const sa = new D(i.sumAssured);
      return sa.gte(p.minSumAssured) && sa.lte(p.maxSumAssured);
    },
    message: (p) =>
      `Sum assured must be between ₹${inr(p.minSumAssured)} and ₹${inr(p.maxSumAssured)}`,
  },
  {
    id: 'POLICY_TERM_RANGE',
    field: 'policyTerm',
    check: (i, p) => i.policyTerm >= p.minTerm && i.policyTerm <= p.maxTerm,
    message: (p) => `Policy term must be between ${p.minTerm} and ${p.maxTerm} years`,
  },
  {
    id: 'PREMIUM_TERM_RANGE',
    field: 'premiumTerm',
    check: (i, p) => i.premiumTerm >= p.minPremiumTerm && i.premiumTerm <= i.policyTerm,
    message: (p) =>
      `Premium paying term must be at least ${p.minPremiumTerm} years and cannot exceed the policy term`,
  },
  {
    id: 'MATURITY_AGE',
    field: 'policyTerm',
    check: (i, p, age) => age + i.policyTerm <= p.maxMaturityAge,
    message: (p) => `Age at maturity (entry age + policy term) cannot exceed ${p.maxMaturityAge}`,
  },
];

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

function productIssues(input: IllustrationInput, policy: PolicyType): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!policy.premiumOptions.some((o) => o.frequency === input.frequency)) {
    issues.push({
      field: 'frequency',
      code: 'FREQUENCY_NOT_OFFERED',
      message: `${policy.name} cannot be paid ${input.frequency.toLowerCase().replace('_', '-')}`,
    });
  }
  const riderCodes = new Set(policy.riders.map((r) => r.code));
  const unknown = input.riderCodes.filter((c) => !riderCodes.has(c));
  if (unknown.length > 0) {
    issues.push({
      field: 'riderCodes',
      code: 'RIDER_NOT_OFFERED',
      message: `Rider not available on ${policy.name}: ${unknown.join(', ')}`,
    });
  }
  if (new Set(input.riderCodes).size !== input.riderCodes.length) {
    issues.push({ field: 'riderCodes', code: 'DUPLICATE_RIDER', message: 'A rider was selected twice' });
  }
  return issues;
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
  const ruleIssues = ILLUSTRATION_RULES.filter((r) => !r.check(input, policy, entryAge)).map(
    (r) => ({ field: r.field, code: r.id, message: r.message(policy) }),
  );
  return [...ruleIssues, ...productIssues(input, policy)];
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
