export const INPUT_COLUMNS = [
  'id',
  'policyTypeCode',
  'dob',
  'gender',
  'sumAssured',
  'policyTerm',
  'premiumTerm',
  'frequency',
  'riderCodes',
] as const;

export const OUTPUT_COLUMNS = [
  'id',
  'status',
  'entryAge',
  'modalPremium',
  'annualisedPremium',
  'totalPremiumPaid',
  'maturityBenefit',
  'rateVersion',
  'errors',
] as const;

export interface ChunkRequest {
  chunkId: number;
  asOf: string;
  lines: string[];
}

export interface ChunkResult {
  chunkId: number;
  output: string;
  ok: number;
  invalid: number;
  errored: number;
}
