import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { todayIn } from '../src/lib/dates.js';
import { maskDob, maskEmail, maskMobile, maskName } from '../src/services/mask.js';
import { testEnv } from './helpers.js';

describe('loadConfig (fail fast on boot)', () => {
  it('accepts a complete environment', () => {
    const config = loadConfig(testEnv());
    expect(config.PII_ENCRYPTION_KEYS.get(1)).toHaveLength(32);
    expect(config.PORT).toBe(4000);
  });

  it.each(['JWT_ACCESS_SECRET', 'PII_ENCRYPTION_KEYS', 'PII_HMAC_KEY', 'DATABASE_URL'])(
    'refuses to start without %s',
    (name) => {
      const env: Record<string, string> = testEnv();
      delete env[name];
      expect(() => loadConfig(env)).toThrow(name);
    },
  );

  it('rejects a short JWT secret', () => {
    expect(() => loadConfig({ ...testEnv(), JWT_ACCESS_SECRET: 'short' })).toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects reusing one secret for access and refresh tokens', () => {
    const env = testEnv();
    expect(() => loadConfig({ ...env, JWT_REFRESH_SECRET: env.JWT_ACCESS_SECRET })).toThrow('must differ');
  });

  it('rejects an encryption key that is not 32 bytes', () => {
    expect(() => loadConfig({ ...testEnv(), PII_ENCRYPTION_KEYS: '1:c2hvcnQ=' })).toThrow('PII_ENCRYPTION_KEYS');
  });

  it('treats a bare key as key version 1', () => {
    const bare = testEnv().PII_ENCRYPTION_KEYS.slice(2);
    expect(loadConfig({ ...testEnv(), PII_ENCRYPTION_KEYS: bare }).PII_ENCRYPTION_KEYS.get(1)).toHaveLength(32);
  });

  it('defaults to trusting one proxy hop', () => {
    expect(loadConfig(testEnv()).TRUST_PROXY).toBe(1);
    expect(loadConfig({ ...testEnv(), TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
  });

  it('rejects an active key version that has no key', () => {
    expect(() => loadConfig({ ...testEnv(), PII_ACTIVE_KEY_VERSION: '2' })).toThrow('PII_ACTIVE_KEY_VERSION');
  });

  it('never echoes a secret value in the error', () => {
    const env = { ...testEnv(), JWT_ACCESS_SECRET: 'tooshort-but-secret' };
    expect(() => loadConfig(env)).toThrow(expect.objectContaining({ message: expect.not.stringContaining('tooshort-but-secret') }));
  });
});

describe('masking', () => {
  it.each([
    [maskMobile('9876543210'), '••••••3210'],
    [maskName('Riya Sharma'), 'R••• S•••••'],
    [maskName('  Riya   K  Sharma '), 'R••• K S•••••'],
    [maskDob('1996-01-15'), '••/••/1996'],
    [maskEmail('riya@example.com'), 'r•••@example.com'],
    [maskEmail('a@b.co'), 'a•@b.co'],
  ])('%s', (masked, expected) => {
    expect(masked).toBe(expected);
  });
});

describe('todayIn', () => {
  it('uses the business timezone, not the server clock', () => {
    const now = new Date('2026-09-23T20:00:00Z');
    expect(todayIn('Asia/Kolkata', now)).toBe('2026-09-24');
    expect(todayIn('UTC', now)).toBe('2026-09-23');
  });
});
