export const INPUT_COLUMNS = [
  'id',
  'policyTypeCode',
  'dob',
  'gender',
  'sumAssured',
  'modalPremium',
  'policyTerm',
  'premiumTerm',
  'frequency',
] as const;

export const OUTPUT_COLUMNS = [
  'id',
  'status',
  'entryAge',
  'modalPremium',
  'annualisedPremium',
  'totalPremiumPaid',
  'maturityBenefit',
  'irr',
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
