import { parentPort } from 'node:worker_threads';
import {
  createIllustrationSchema,
  generateIllustration,
  SAMPLE_PRODUCTS,
  toMoneyString,
  type Product,
} from '@app/core';
import type { ChunkRequest, ChunkResult } from './protocol.js';

const products = new Map<string, Product>(SAMPLE_PRODUCTS.map((p) => [p.policyType.code, p]));
const schemaCache = new Map<string, ReturnType<typeof createIllustrationSchema>>();

function schemaFor(code: string, asOf: string) {
  const key = `${code}|${asOf}`;
  let schema = schemaCache.get(key);
  if (!schema) {
    schema = createIllustrationSchema(products.get(code)?.policyType, asOf);
    schemaCache.set(key, schema);
  }
  return schema;
}

const csv = (value: string | number) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

function processLine(line: string, asOf: string): { row: string; status: 'OK' | 'INVALID' | 'ERROR' } {
  const [id = '', policyTypeCode = '', dob = '', gender = '', sumAssured = '', policyTerm = '', premiumTerm = '', frequency = '', riders = ''] =
    line.split(',');
  try {
    const raw = {
      policyTypeCode,
      dob,
      gender,
      sumAssured: Number(sumAssured),
      policyTerm: Number(policyTerm),
      premiumTerm: Number(premiumTerm),
      frequency,
      riderCodes: riders ? riders.split('|') : [],
    };
    const parsed = schemaFor(policyTypeCode, asOf).safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { row: [id, 'INVALID', '', '', '', '', '', '', csv(errors)].join(','), status: 'INVALID' };
    }
    const product = products.get(policyTypeCode)!;
    const result = generateIllustration(parsed.data, product.policyType, product.rates, asOf);
    return {
      row: [
        id,
        'OK',
        result.premium.entryAge,
        toMoneyString(result.premium.modalPremium),
        toMoneyString(result.premium.annualisedPremium),
        toMoneyString(result.summary.totalPremiumPaid),
        toMoneyString(result.summary.maturityBenefit),
        result.rateVersion,
        '',
      ].join(','),
      status: 'OK',
    };
  } catch (err) {
    return { row: [id, 'ERROR', '', '', '', '', '', '', csv((err as Error).message)].join(','), status: 'ERROR' };
  }
}

parentPort!.on('message', (req: ChunkRequest) => {
  const out: string[] = [];
  const counts = { OK: 0, INVALID: 0, ERROR: 0 };
  for (const line of req.lines) {
    const { row, status } = processLine(line, req.asOf);
    out.push(row);
    counts[status]++;
  }
  const result: ChunkResult = {
    chunkId: req.chunkId,
    output: out.join('\n') + '\n',
    ok: counts.OK,
    invalid: counts.INVALID,
    errored: counts.ERROR,
  };
  parentPort!.postMessage(result);
});
