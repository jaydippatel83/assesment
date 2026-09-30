import { ageLastBirthday } from './age.js';
import { irr } from './irr.js';
import { D, ZERO, toMoneyString, type Money } from './money.js';
import { instalmentsPerYear, type IllustrationInput } from '../validation/illustrationInput.js';
import type { PolicyType, RateTable } from '../types/policy.js';

export class RateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateNotFoundError';
  }
}

export class InvalidIllustrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIllustrationError';
  }
}

export interface IllustrationRow {
  policyYear: number;
  age: number;
  premium: Money;
  cumulativePremium: Money;
  sumAssured: Money;
  bonusRate: Money;
  bonusAmount: Money;
  cumulativeBonus: Money;
  totalBenefit: Money;
  netCashflow: Money;
}

export interface PremiumBreakdown {
  entryAge: number;
  modalPremium: Money;
  instalmentsPerYear: number;
  annualisedPremium: Money;
}

export interface IllustrationSummary {
  totalPremiumPaid: Money;
  totalBonus: Money;
  maturityBenefit: Money;
  maturityAge: number;
  irr: Money | null;
}

export interface IllustrationResult {
  rateVersion: string;
  premium: PremiumBreakdown;
  rows: IllustrationRow[];
  summary: IllustrationSummary;
}

export function calculatePremium(input: IllustrationInput, policy: PolicyType, asOf: string): PremiumBreakdown {
  const perYear = instalmentsPerYear(policy, input.frequency);
  if (perYear === undefined) {
    throw new InvalidIllustrationError(`${policy.code} is not offered with ${input.frequency} premiums`);
  }
  const modalPremium = new D(input.modalPremium);
  return {
    entryAge: ageLastBirthday(input.dob, asOf),
    modalPremium,
    instalmentsPerYear: perYear,
    annualisedPremium: modalPremium.times(perYear),
  };
}

export function generateIllustration(
  input: IllustrationInput,
  policy: PolicyType,
  rates: RateTable,
  asOf: string,
): IllustrationResult {
  if (rates.policyTypeCode !== policy.code || input.policyTypeCode !== policy.code) {
    throw new InvalidIllustrationError('Input, policy type and rate table do not match');
  }
  if (input.premiumTerm < 1 || input.premiumTerm >= input.policyTerm) {
    throw new InvalidIllustrationError('Premium paying term must be at least 1 year and shorter than the policy term');
  }
  if (rates.bonusRates.length < input.policyTerm) {
    throw new RateNotFoundError(
      `No bonus rate for year ${rates.bonusRates.length + 1} in ${rates.policyTypeCode} rates ${rates.version}`,
    );
  }

  const premium = calculatePremium(input, policy, asOf);
  const sumAssured = new D(input.sumAssured);
  const bonusRates = rates.bonusRates.map((r) => new D(r));
  const totalBonus = bonusRates.reduce((sum, rate) => sum.plus(sumAssured.times(rate)), ZERO);
  const maturityBenefit = sumAssured.plus(totalBonus);

  const rows: IllustrationRow[] = [];
  let cumulativePremium = ZERO;
  let cumulativeBonus = ZERO;

  bonusRates.forEach((bonusRate, index) => {
    const year = index + 1;
    const isMaturity = year === input.policyTerm;
    const yearPremium = year <= input.premiumTerm ? premium.annualisedPremium : ZERO;
    const bonusAmount = sumAssured.times(bonusRate);
    const totalBenefit = isMaturity ? maturityBenefit : ZERO;
    cumulativePremium = cumulativePremium.plus(yearPremium);
    cumulativeBonus = cumulativeBonus.plus(bonusAmount);

    rows.push({
      policyYear: year,
      age: premium.entryAge + year - 1,
      premium: yearPremium,
      cumulativePremium,
      sumAssured: isMaturity ? sumAssured : ZERO,
      bonusRate,
      bonusAmount,
      cumulativeBonus,
      totalBenefit,
      netCashflow: totalBenefit.minus(yearPremium),
    });
  });

  return {
    rateVersion: rates.version,
    premium,
    rows,
    summary: {
      totalPremiumPaid: cumulativePremium,
      totalBonus,
      maturityBenefit,
      maturityAge: premium.entryAge + input.policyTerm,
      irr: irr(rows.map((r) => r.netCashflow)),
    },
  };
}

type Serialized<T> = {
  [K in keyof T]: T[K] extends Money
    ? string
    : T[K] extends Money | null
      ? string | null
      : T[K] extends (infer U)[]
        ? Serialized<U>[]
        : T[K] extends object
          ? Serialized<T[K]>
          : T[K];
};

export type IllustrationRowDTO = Serialized<IllustrationRow>;
export type IllustrationResultDTO = Serialized<IllustrationResult>;

const isMoney = (v: unknown): v is Money => v instanceof D;

function serialize<T>(value: T): Serialized<T> {
  if (isMoney(value)) return toMoneyString(value) as Serialized<T>;
  if (Array.isArray(value)) return value.map(serialize) as Serialized<T>;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serialize(v)]),
    ) as Serialized<T>;
  }
  return value as Serialized<T>;
}

export const toRateString = (rate: Money) => rate.toDecimalPlaces(6, D.ROUND_HALF_UP).toFixed(6);

export function toIllustrationDTO(result: IllustrationResult): IllustrationResultDTO {
  const dto = serialize(result);
  dto.rows.forEach((row, i) => (row.bonusRate = result.rows[i]!.bonusRate.toString()));
  dto.summary.irr = result.summary.irr && toRateString(result.summary.irr);
  return dto;
}

export type ColumnFormat = 'number' | 'money' | 'percent';

export const ILLUSTRATION_COLUMNS: { key: keyof IllustrationRow; label: string; format: ColumnFormat }[] = [
  { key: 'policyYear', label: 'Policy Year', format: 'number' },
  { key: 'premium', label: 'Premium', format: 'money' },
  { key: 'sumAssured', label: 'Sum Assured', format: 'money' },
  { key: 'bonusRate', label: 'Bonus Rate', format: 'percent' },
  { key: 'bonusAmount', label: 'Bonus Amount', format: 'money' },
  { key: 'totalBenefit', label: 'Total Benefit', format: 'money' },
  { key: 'netCashflow', label: 'Net Cashflows', format: 'money' },
];
