import crypto from 'node:crypto';
import { SAMPLE_PRODUCTS } from '@app/core';
import { pino } from 'pino';
import { loadConfig } from '../src/config/env.js';
import { createContext } from '../src/context.js';
import type { PrismaClient } from '../src/generated/prisma/client.ts';
import { staticCatalog } from '../src/services/catalog.js';

const key = () => crypto.randomBytes(32).toString('base64');

export const testEnv = () => ({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: crypto.randomBytes(48).toString('base64'),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('base64'),
  PII_ENCRYPTION_KEYS: `1:${key()}`,
  PII_ACTIVE_KEY_VERSION: '1',
  PII_HMAC_KEY: key(),
});

export function testContext() {
  return createContext({
    config: loadConfig(testEnv()),
    prisma: new Proxy({}, {
      get: () => {
        throw new Error('Database is not available in this test');
      },
    }) as PrismaClient,
    catalog: staticCatalog(SAMPLE_PRODUCTS),
    logger: pino({ level: 'silent' }),
  });
}
