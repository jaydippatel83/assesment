import { z } from 'zod';

const base64Key32 = z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
  message: 'must be 32 bytes, base64-encoded (openssl rand -base64 32)',
});

const keyring = z
  .string()
  .transform((raw, ctx) => {
    const keys = new Map<number, Buffer>();
    for (const entry of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [version, b64] = entry.includes(':') ? entry.split(':') : ['1', entry];
      const v = Number(version);
      const key = Buffer.from(b64 ?? '', 'base64');
      if (!Number.isInteger(v) || v < 1 || v > 255 || key.length !== 32) {
        ctx.addIssue({ code: 'custom', message: 'entries must be "version:base64key" with a 32-byte key and version 1-255' });
        return z.NEVER;
      }
      keys.set(v, key);
    }
    if (keys.size === 0) {
      ctx.addIssue({ code: 'custom', message: 'at least one key is required' });
      return z.NEVER;
    }
    return keys;
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    PII_ENCRYPTION_KEYS: keyring,
    PII_ACTIVE_KEY_VERSION: z.coerce.number().int().min(1).max(255),
    PII_HMAC_KEY: base64Key32,
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((e) => e.PII_ENCRYPTION_KEYS.has(e.PII_ACTIVE_KEY_VERSION), {
    message: 'PII_ACTIVE_KEY_VERSION must name a key in PII_ENCRYPTION_KEYS',
    path: ['PII_ACTIVE_KEY_VERSION'],
  });

export type Config = z.output<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return result.data;
}
