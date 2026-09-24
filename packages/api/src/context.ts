import type { Logger } from 'pino';
import type { Config } from './config/env.js';
import { createFieldCipher, createLookupHasher, type FieldCipher } from './crypto/fieldCipher.js';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { Catalog } from './services/catalog.js';
import { createTokenService, type TokenService } from './services/tokens.js';

export interface AppContext {
  config: Config;
  prisma: PrismaClient;
  catalog: Catalog;
  logger: Logger;
  cipher: FieldCipher;
  lookupHash: (value: string) => string;
  tokens: TokenService;
}

export function createContext(deps: Pick<AppContext, 'config' | 'prisma' | 'catalog' | 'logger'>): AppContext {
  const { config } = deps;
  return {
    ...deps,
    cipher: createFieldCipher(config.PII_ENCRYPTION_KEYS, config.PII_ACTIVE_KEY_VERSION),
    lookupHash: createLookupHasher(Buffer.from(config.PII_HMAC_KEY, 'base64')),
    tokens: createTokenService(config),
  };
}

export async function audit(
  ctx: AppContext,
  entry: { action: string; userId?: string | null; ip?: string; metadata?: Record<string, unknown> },
) {
  try {
    await ctx.prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        ipHash: entry.ip ? ctx.lookupHash(`ip:${entry.ip}`) : null,
        metadata: (entry.metadata ?? {}) as object,
      },
    });
  } catch (err) {
    ctx.logger.error({ err, action: entry.action }, 'audit write failed');
  }
}
