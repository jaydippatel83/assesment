import { SAMPLE_PRODUCTS, type IllustrationInput, type Product } from '../src/index.js';

export const AS_OF = '2026-09-24';

export function product(code: string): Product {
  const found = SAMPLE_PRODUCTS.find((p) => p.policyType.code === code);
  if (!found) throw new Error(`No sample product ${code}`);
  return found;
}

export const endowment = product('ENDOWMENT');

export const sheetInput: IllustrationInput = {
  policyTypeCode: 'ENDOWMENT',
  dob: '1999-12-12',
  gender: 'MALE',
  sumAssured: 1_200_000,
  modalPremium: 80_000,
  policyTerm: 18,
  premiumTerm: 10,
  frequency: 'ANNUAL',
};

export const validInput: IllustrationInput = { ...sheetInput, modalPremium: 40_000 };
