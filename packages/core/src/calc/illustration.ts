import { ageLastBirthday } from './age.js';
import { D, ZERO, maxOf, roundMoney, toMoneyString, type Money } from './money.js';
import type { IllustrationInput } from '../validation/illustrationInput.js';
import type { PolicyType, PremiumOption, RateTable } from '../types/policy.js';

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
  basePremium: Money;
  riderPremium: Money;
  totalPremium: Money;
  cumulativePremium: Money;
  sumAssured: Money;
  bonus: Money;
  accruedBonus: Money;
  deathBenefit: Money;
  surrenderValue: Money;
  maturityBenefit: Money;
  netCashflow: Money;
}

export interface PremiumBreakdown {
  entryAge: number;
  ratingAge: number;
  ratePerMille: Money;
  annualBasePremium: Money;
  annualRiderPremium: Money;
  riderPremiums: { code: string; name: string; cover: Money; annualPremium: Money }[];
  modalFactor: Money;
  instalmentsPerYear: number;
  modalPremium: Money;
  annualisedPremium: Money;
}

export interface IllustrationSummary {
  totalPremiumPaid: Money;
  maturityBenefit: Money;
  maturityAge: number;
}

export interface IllustrationResult {
  rateVersion: string;
  premium: PremiumBreakdown;
  rows: IllustrationRow[];
  summary: IllustrationSummary;
}

export function lookupPremiumRate(rates: RateTable, age: number): Money {
  const band = rates.premiumRates.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!band) {
    throw new RateNotFoundError(
      `No premium rate for age ${age} in ${rates.policyTypeCode} rates ${rates.version}`,
    );
  }
  return new D(band.ratePerMille);
}

export function surrenderFactorFor(rates: RateTable, policyYear: number): Money {
  let factor = ZERO;
  for (const entry of rates.surrenderFactors) {
    if (entry.fromYear <= policyYear) factor = new D(entry.factor);
  }
  return factor;
}

function premiumOptionFor(policy: PolicyType, input: IllustrationInput): PremiumOption {
  const option = policy.premiumOptions.find((o) => o.frequency === input.frequency);
  if (!option) {
    throw new InvalidIllustrationError(`${policy.code} is not offered with ${input.frequency} premiums`);
  }
  return option;
}

export function calculatePremium(
  input: IllustrationInput,
  policy: PolicyType,
  rates: RateTable,
  asOf: string,
): PremiumBreakdown {
  const entryAge = ageLastBirthday(input.dob, asOf);
  const ratingAge = input.gender === 'FEMALE' ? Math.max(entryAge - rates.femaleAgeSetback, 0) : entryAge;
  const ratePerMille = lookupPremiumRate(rates, ratingAge);
  const sumAssured = new D(input.sumAssured);

  const annualBasePremium = sumAssured
    .div(1000)
    .times(ratePerMille)
    .times(input.policyTerm)
    .div(input.premiumTerm);

  const riderPremiums = input.riderCodes.map((code) => {
    const rider = policy.riders.find((r) => r.code === code);
    if (!rider) throw new InvalidIllustrationError(`Rider ${code} is not offered on ${policy.code}`);
    const cover = sumAssured.times(rider.coverPct);
    return {
      code: rider.code,
      name: rider.name,
      cover,
      annualPremium: cover.div(1000).times(rider.ratePerMille),
    };
  });
  const annualRiderPremium = riderPremiums.reduce((sum, r) => sum.plus(r.annualPremium), ZERO);

  const option = premiumOptionFor(policy, input);
  const modalFactor = new D(option.modalFactor);
  const modalPremium = roundMoney(annualBasePremium.plus(annualRiderPremium).times(modalFactor));

  return {
    entryAge,
    ratingAge,
    ratePerMille,
    annualBasePremium,
    annualRiderPremium,
    riderPremiums,
    modalFactor,
    instalmentsPerYear: option.instalmentsPerYear,
    modalPremium,
    annualisedPremium: modalPremium.times(option.instalmentsPerYear),
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
  if (input.premiumTerm < 1 || input.premiumTerm > input.policyTerm) {
    throw new InvalidIllustrationError('Premium paying term must be between 1 and the policy term');
  }

  const premium = calculatePremium(input, policy, rates, asOf);
  const sumAssured = new D(input.sumAssured);
  const bonusRate = new D(rates.reversionaryBonusRate);
  const terminalBonusRate = new D(rates.terminalBonusRate);

  const grossAnnual = premium.annualBasePremium.plus(premium.annualRiderPremium);
  const baseShare = grossAnnual.isZero() ? ZERO : premium.annualBasePremium.div(grossAnnual);
  const annualisedBase = roundMoney(premium.annualisedPremium.times(baseShare));
  const annualisedRider = premium.annualisedPremium.minus(annualisedBase);

  const rows: IllustrationRow[] = [];
  let cumulativePremium = ZERO;
  let cumulativeBasePremium = ZERO;
  let accruedBonus = ZERO;

  for (let year = 1; year <= input.policyTerm; year++) {
    const paying = year <= input.premiumTerm;
    const basePremium = paying ? annualisedBase : ZERO;
    const riderPremium = paying ? annualisedRider : ZERO;
    const totalPremium = basePremium.plus(riderPremium);

    cumulativePremium = cumulativePremium.plus(totalPremium);
    cumulativeBasePremium = cumulativeBasePremium.plus(basePremium);

    const bonus = sumAssured.times(bonusRate);
    accruedBonus = accruedBonus.plus(bonus);

    const deathBenefit = maxOf(
      sumAssured,
      annualisedBase.times(10),
      cumulativeBasePremium.times('1.05'),
    ).plus(accruedBonus);

    const isMaturity = year === input.policyTerm;
    const maturityBenefit = isMaturity
      ? sumAssured.plus(accruedBonus).plus(accruedBonus.times(terminalBonusRate))
      : ZERO;

    rows.push({
      policyYear: year,
      age: premium.entryAge + year - 1,
      basePremium,
      riderPremium,
      totalPremium,
      cumulativePremium,
      sumAssured,
      bonus,
      accruedBonus,
      deathBenefit,
      surrenderValue: isMaturity ? ZERO : cumulativeBasePremium.times(surrenderFactorFor(rates, year)),
      maturityBenefit,
      netCashflow: maturityBenefit.minus(totalPremium),
    });
  }

  const last = rows[rows.length - 1]!;
  return {
    rateVersion: rates.version,
    premium,
    rows,
    summary: {
      totalPremiumPaid: cumulativePremium,
      maturityBenefit: last.maturityBenefit,
      maturityAge: premium.entryAge + input.policyTerm,
    },
  };
}

type Serialized<T> = {
  [K in keyof T]: T[K] extends Money
    ? string
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

export function toIllustrationDTO(result: IllustrationResult): IllustrationResultDTO {
  const dto = serialize(result);
  dto.premium.ratePerMille = result.premium.ratePerMille.toString();
  dto.premium.modalFactor = result.premium.modalFactor.toString();
  return dto;
}

export const ILLUSTRATION_COLUMNS: { key: keyof IllustrationRow; label: string; money: boolean }[] = [
  { key: 'policyYear', label: 'Policy Year', money: false },
  { key: 'age', label: 'Age', money: false },
  { key: 'basePremium', label: 'Base Premium', money: true },
  { key: 'riderPremium', label: 'Rider Premium', money: true },
  { key: 'totalPremium', label: 'Total Premium', money: true },
  { key: 'cumulativePremium', label: 'Cumulative Premium', money: true },
  { key: 'sumAssured', label: 'Sum Assured', money: true },
  { key: 'bonus', label: 'Bonus', money: true },
  { key: 'accruedBonus', label: 'Accrued Bonus', money: true },
  { key: 'deathBenefit', label: 'Death Benefit', money: true },
  { key: 'surrenderValue', label: 'Surrender Value', money: true },
  { key: 'maturityBenefit', label: 'Maturity Benefit', money: true },
  { key: 'netCashflow', label: 'Net Cash Flow', money: true },
];
