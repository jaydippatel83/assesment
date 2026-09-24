import type { Product } from '../types/policy.js';

const standardPremiumOptions = [
  { frequency: 'ANNUAL', modalFactor: '1', instalmentsPerYear: 1 },
  { frequency: 'SEMI_ANNUAL', modalFactor: '0.51', instalmentsPerYear: 2 },
  { frequency: 'QUARTERLY', modalFactor: '0.26', instalmentsPerYear: 4 },
  { frequency: 'MONTHLY', modalFactor: '0.0875', instalmentsPerYear: 12 },
] as const;

const standardSurrenderFactors = [
  { fromYear: 1, factor: '0' },
  { fromYear: 2, factor: '0.30' },
  { fromYear: 3, factor: '0.35' },
  { fromYear: 4, factor: '0.50' },
  { fromYear: 8, factor: '0.60' },
  { fromYear: 12, factor: '0.70' },
  { fromYear: 16, factor: '0.80' },
  { fromYear: 20, factor: '0.90' },
];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    policyType: {
      code: 'ENDOWMENT',
      name: 'Secure Endowment Plan',
      description:
        'Participating savings plan. Pays the sum assured plus bonuses at maturity, or on earlier death.',
      minAge: 18,
      maxAge: 55,
      minTerm: 10,
      maxTerm: 30,
      minPremiumTerm: 5,
      maxMaturityAge: 75,
      minSumAssured: '100000',
      maxSumAssured: '10000000',
      premiumOptions: [...standardPremiumOptions],
      riders: [
        {
          code: 'ADB',
          name: 'Accidental Death Benefit',
          description: 'Pays an additional sum assured on death due to an accident.',
          ratePerMille: '0.50',
          coverPct: '1.00',
        },
        {
          code: 'CI',
          name: 'Critical Illness',
          description: 'Lump sum on diagnosis of any of 34 listed critical illnesses.',
          ratePerMille: '2.40',
          coverPct: '0.50',
        },
        {
          code: 'WOP',
          name: 'Waiver of Premium',
          description: 'Future premiums are waived on disability.',
          ratePerMille: '0.80',
          coverPct: '0.25',
        },
      ],
    },
    rates: {
      policyTypeCode: 'ENDOWMENT',
      version: '2026.1',
      femaleAgeSetback: 3,
      reversionaryBonusRate: '0.045',
      terminalBonusRate: '0.15',
      premiumRates: [
        { minAge: 0, maxAge: 25, ratePerMille: '38.50' },
        { minAge: 26, maxAge: 35, ratePerMille: '40.20' },
        { minAge: 36, maxAge: 45, ratePerMille: '43.80' },
        { minAge: 46, maxAge: 55, ratePerMille: '50.60' },
      ],
      surrenderFactors: standardSurrenderFactors,
    },
  },
  {
    policyType: {
      code: 'MONEYBACK',
      name: 'Assured Money Back Plan',
      description:
        'Participating plan for goal-based savings. Longer premium terms, lower entry age limit.',
      minAge: 18,
      maxAge: 50,
      minTerm: 12,
      maxTerm: 25,
      minPremiumTerm: 7,
      maxMaturityAge: 70,
      minSumAssured: '200000',
      maxSumAssured: '5000000',
      premiumOptions: standardPremiumOptions.filter((o) => o.frequency !== 'QUARTERLY'),
      riders: [
        {
          code: 'ADB',
          name: 'Accidental Death Benefit',
          description: 'Pays an additional sum assured on death due to an accident.',
          ratePerMille: '0.55',
          coverPct: '1.00',
        },
        {
          code: 'WOP',
          name: 'Waiver of Premium',
          description: 'Future premiums are waived on disability.',
          ratePerMille: '0.90',
          coverPct: '0.25',
        },
      ],
    },
    rates: {
      policyTypeCode: 'MONEYBACK',
      version: '2026.1',
      femaleAgeSetback: 3,
      reversionaryBonusRate: '0.040',
      terminalBonusRate: '0.10',
      premiumRates: [
        { minAge: 0, maxAge: 25, ratePerMille: '42.00' },
        { minAge: 26, maxAge: 35, ratePerMille: '44.10' },
        { minAge: 36, maxAge: 45, ratePerMille: '48.30' },
        { minAge: 46, maxAge: 50, ratePerMille: '55.70' },
      ],
      surrenderFactors: standardSurrenderFactors,
    },
  },
];
