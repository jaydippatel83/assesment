import type { Product } from '../types/policy.js';

export const SAMPLE_PRODUCTS: Product[] = [
  {
    policyType: {
      code: 'ENDOWMENT',
      name: 'Secure Endowment Plan',
      description:
        'Participating savings plan. Pays the sum assured plus bonuses at the end of the policy term.',
      minAge: 23,
      maxAge: 56,
      minTerm: 10,
      maxTerm: 20,
      minPremiumTerm: 5,
      maxPremiumTerm: 10,
      minPremium: '10000',
      maxPremium: '50000',
      sumAssuredMultiple: '10',
      sumAssuredCap: '5000000',
      premiumOptions: [
        { frequency: 'ANNUAL', instalmentsPerYear: 1 },
        { frequency: 'SEMI_ANNUAL', instalmentsPerYear: 2 },
        { frequency: 'MONTHLY', instalmentsPerYear: 12 },
      ],
    },
    rates: {
      policyTypeCode: 'ENDOWMENT',
      version: '2026.2',
      bonusRates: [
        '0.025', '0.03', '0.035', '0.035', '0.035', '0.035', '0.03', '0.03', '0.03', '0.03',
        '0.03', '0.025', '0.03', '0.03', '0.025', '0.05', '0.04', '0.045', '0.04', '0.25',
      ],
    },
  },
];
