import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createFieldCipher, createLookupHasher } from '../src/crypto/fieldCipher.js';

const key1 = crypto.randomBytes(32);
const key2 = crypto.randomBytes(32);
const cipher = createFieldCipher(new Map([[1, key1]]), 1);

describe('field encryption (AES-256-GCM)', () => {
  it('round-trips', () => {
    for (const value of ['9876543210', 'Riya Sharma', '1996-01-15', 'नमस्ते', '']) {
      expect(cipher.decrypt(cipher.encrypt(value, 'user.name'), 'user.name')).toBe(value);
    }
  });

  it('does not contain the plaintext', () => {
    const blob = Buffer.from(cipher.encrypt('9876543210', 'user.mobile'));
    expect(blob.includes(Buffer.from('9876543210'))).toBe(false);
  });

  it('uses a fresh IV: the same value encrypts differently each time', () => {
    const a = Buffer.from(cipher.encrypt('9876543210', 'user.mobile'));
    const b = Buffer.from(cipher.encrypt('9876543210', 'user.mobile'));
    expect(a.equals(b)).toBe(false);
  });

  it('detects tampering', () => {
    const blob = cipher.encrypt('9876543210', 'user.mobile');
    blob[blob.length - 1]! ^= 0x01;
    expect(() => cipher.decrypt(blob, 'user.mobile')).toThrow();
  });

  it('will not decrypt a value moved to a different column', () => {
    const mobile = cipher.encrypt('9876543210', 'user.mobile');
    expect(() => cipher.decrypt(mobile, 'user.name')).toThrow();
  });

  it('will not decrypt with the wrong key', () => {
    const other = createFieldCipher(new Map([[1, key2]]), 1);
    expect(() => other.decrypt(cipher.encrypt('x', 'c'), 'c')).toThrow();
  });

  it('rejects a truncated blob', () => {
    expect(() => cipher.decrypt(new Uint8Array(10), 'c')).toThrow('too short');
  });

  describe('key rotation', () => {
    const rotated = createFieldCipher(new Map([[1, key1], [2, key2]]), 2);

    it('still reads data written with the old key', () => {
      const old = cipher.encrypt('9876543210', 'user.mobile');
      expect(rotated.decrypt(old, 'user.mobile')).toBe('9876543210');
      expect(rotated.needsRotation(old)).toBe(true);
    });

    it('writes new data with the new key', () => {
      const fresh = rotated.encrypt('9876543210', 'user.mobile');
      expect(fresh[0]).toBe(2);
      expect(rotated.needsRotation(fresh)).toBe(false);
    });

    it('cannot read data once its key is removed', () => {
      const newOnly = createFieldCipher(new Map([[2, key2]]), 2);
      expect(() => newOnly.decrypt(cipher.encrypt('x', 'c'), 'c')).toThrow('No decryption key for version 1');
    });
  });

  it('refuses to start without the active key', () => {
    expect(() => createFieldCipher(new Map([[1, key1]]), 2)).toThrow();
  });
});

describe('lookup hash', () => {
  const hash = createLookupHasher(key1);

  it('is deterministic, so it can be used as a unique index', () => {
    expect(hash('riya@example.com')).toBe(hash('riya@example.com'));
  });

  it('depends on the key, so a leaked database alone cannot be brute-forced', () => {
    expect(createLookupHasher(key2)('riya@example.com')).not.toBe(hash('riya@example.com'));
  });
});
