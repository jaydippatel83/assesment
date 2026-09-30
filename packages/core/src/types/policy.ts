export const FREQUENCIES = ['ANNUAL', 'SEMI_ANNUAL', 'MONTHLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

export interface PremiumOption {
  frequency: Frequency;
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
  maxPremiumTerm: number;
  minPremium: string;
  maxPremium: string;
  sumAssuredMultiple: string;
  sumAssuredCap: string;
  premiumOptions: PremiumOption[];
}

export interface RateTable {
  policyTypeCode: string;
  version: string;
  bonusRates: string[];
}

export interface Product {
  policyType: PolicyType;
  rates: RateTable;
}
