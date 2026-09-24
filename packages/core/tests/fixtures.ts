import { SAMPLE_PRODUCTS, type IllustrationInput, type Product } from '../src/index.js';

export const AS_OF = '2026-09-24';

export function product(code: string): Product {
  const found = SAMPLE_PRODUCTS.find((p) => p.policyType.code === code);
  if (!found) throw new Error(`No sample product ${code}`);
  return found;
}

export const endowment = product('ENDOWMENT');
export const moneyBack = product('MONEYBACK');

export const validInput: IllustrationInput = {
  policyTypeCode: 'ENDOWMENT',
  dob: '1996-01-15',
  gender: 'MALE',
  sumAssured: 1_000_000,
  policyTerm: 20,
  premiumTerm: 10,
  frequency: 'ANNUAL',
  riderCodes: [],
};
