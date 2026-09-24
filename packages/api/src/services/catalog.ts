import type { PolicyType, Product } from '@app/core';
import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.ts';

const decimalString = z.string().regex(/^\d+(\.\d+)?$/);

const assumptionsSchema = z.object({
  premiumRates: z
    .array(z.object({ minAge: z.number().int(), maxAge: z.number().int(), ratePerMille: decimalString }))
    .min(1),
  femaleAgeSetback: z.number().int().min(0),
  reversionaryBonusRate: decimalString,
  terminalBonusRate: decimalString,
  surrenderFactors: z.array(z.object({ fromYear: z.number().int().min(1), factor: decimalString })),
});

export interface Catalog {
  list(): Promise<Product[]>;
  get(code: string): Promise<Product | undefined>;
  getVersion(code: string, version: string): Promise<Product | undefined>;
}

export function staticCatalog(products: Product[]): Catalog {
  return {
    list: async () => products,
    get: async (code) => products.find((p) => p.policyType.code === code),
    getVersion: async (code, version) =>
      products.find((p) => p.policyType.code === code && p.rates.version === version),
  };
}

type PolicyTypeRow = Awaited<ReturnType<typeof loadPolicyTypes>>[number];

function loadPolicyTypes(prisma: PrismaClient, where: { code?: string; rateVersion?: string }) {
  return prisma.policyType.findMany({
    where: { isActive: true, ...(where.code ? { code: where.code } : {}) },
    include: {
      riders: { orderBy: { code: 'asc' } },
      premiumOptions: { orderBy: { instalmentsPerYear: 'asc' } },
      rateTables: {
        where: where.rateVersion ? { version: where.rateVersion } : { isActive: true },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });
}

function toProduct(row: PolicyTypeRow): Product | undefined {
  const rateRow = row.rateTables[0];
  if (!rateRow) return undefined;
  const policyType: PolicyType = {
    code: row.code,
    name: row.name,
    description: row.description,
    minAge: row.minAge,
    maxAge: row.maxAge,
    minTerm: row.minTerm,
    maxTerm: row.maxTerm,
    minPremiumTerm: row.minPremiumTerm,
    maxMaturityAge: row.maxMaturityAge,
    minSumAssured: row.minSumAssured.toString(),
    maxSumAssured: row.maxSumAssured.toString(),
    riders: row.riders.map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description,
      ratePerMille: r.ratePerMille.toString(),
      coverPct: r.coverPct.toString(),
    })),
    premiumOptions: row.premiumOptions.map((o) => ({
      frequency: o.frequency,
      modalFactor: o.modalFactor.toString(),
      instalmentsPerYear: o.instalmentsPerYear,
    })),
  };
  const parsed = assumptionsSchema.safeParse(rateRow.assumptions);
  if (!parsed.success) {
    throw new Error(`Rate table ${row.code} ${rateRow.version} is malformed: ${parsed.error.message}`);
  }
  const assumptions = parsed.data;
  return { policyType, rates: { ...assumptions, policyTypeCode: row.code, version: rateRow.version } };
}

export function prismaCatalog(prisma: PrismaClient, ttlMs = 60_000): Catalog {
  let cache: { at: number; products: Product[] } | undefined;

  async function active(): Promise<Product[]> {
    if (!cache || Date.now() - cache.at > ttlMs) {
      const rows = await loadPolicyTypes(prisma, {});
      cache = { at: Date.now(), products: rows.map(toProduct).filter((p): p is Product => !!p) };
    }
    return cache.products;
  }

  return {
    list: active,
    get: async (code) => (await active()).find((p) => p.policyType.code === code),
    getVersion: async (code, version) => {
      const current = (await active()).find((p) => p.policyType.code === code);
      if (current?.rates.version === version) return current;
      const [row] = await loadPolicyTypes(prisma, { code, rateVersion: version });
      return row ? toProduct(row) : undefined;
    },
  };
}
