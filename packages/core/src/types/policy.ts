export const FREQUENCIES = ['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

export interface Rider {
  code: string;
  name: string;
  description: string;
  ratePerMille: string;
  coverPct: string;
}

export interface PremiumOption {
  frequency: Frequency;
  modalFactor: string;
  instalmentsPerYear: number;
}

export interface PolicyType {
  code: string;
  name: string;
  description: string;
  minAge: number;
  maxAge: number;
  minTerm: number;
  maxTerm: number;
  minPremiumTerm: number;
  maxMaturityAge: number;
  minSumAssured: string;
  maxSumAssured: string;
  riders: Rider[];
  premiumOptions: PremiumOption[];
}

export interface AgeBandRate {
  minAge: number;
  maxAge: number;
  ratePerMille: string;
}

export interface SurrenderFactor {
  fromYear: number;
  factor: string;
}

export interface RateTable {
  policyTypeCode: string;
  version: string;
  premiumRates: AgeBandRate[];
  femaleAgeSetback: number;
  reversionaryBonusRate: string;
  terminalBonusRate: string;
  surrenderFactors: SurrenderFactor[];
}

export interface Product {
  policyType: PolicyType;
  rates: RateTable;
}
