import 'dotenv/config';
import { SAMPLE_PRODUCTS } from '@app/core';
import { createPrisma } from '../src/db.js';
import type { Prisma } from '../src/generated/prisma/client.ts';

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = createPrisma(url);

  for (const { policyType, rates } of SAMPLE_PRODUCTS) {
    const { riders, premiumOptions, ...fields } = policyType;
    const row = await prisma.policyType.upsert({
      where: { code: policyType.code },
      update: fields,
      create: fields,
    });

    for (const rider of riders) {
      await prisma.rider.upsert({
        where: { policyTypeId_code: { policyTypeId: row.id, code: rider.code } },
        update: rider,
        create: { ...rider, policyTypeId: row.id },
      });
    }
    for (const option of premiumOptions) {
      await prisma.premiumOption.upsert({
        where: { policyTypeId_frequency: { policyTypeId: row.id, frequency: option.frequency } },
        update: option,
        create: { ...option, policyTypeId: row.id },
      });
    }

    const { policyTypeCode: _code, version, ...rest } = rates;
    const assumptions = rest as unknown as Prisma.InputJsonObject;
    await prisma.rateTable.updateMany({ where: { policyTypeId: row.id }, data: { isActive: false } });
    await prisma.rateTable.upsert({
      where: { policyTypeId_version: { policyTypeId: row.id, version } },
      update: { assumptions, isActive: true },
      create: {
        policyTypeId: row.id,
        version,
        effectiveFrom: new Date('2026-04-01T00:00:00Z'),
        isActive: true,
        assumptions,
      },
    });
    console.log(`seeded ${policyType.code} (rates ${version})`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
