import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + IV_BYTES + TAG_BYTES;

export interface FieldCipher {
  encrypt(plain: string, context: string): Uint8Array<ArrayBuffer>;
  decrypt(blob: Uint8Array, context: string): string;
  needsRotation(blob: Uint8Array): boolean;
}

export function createFieldCipher(keys: Map<number, Buffer>, activeVersion: number): FieldCipher {
  const activeKey = keys.get(activeVersion);
  if (!activeKey) throw new Error(`No encryption key for active version ${activeVersion}`);
  for (const [version, key] of keys) {
    if (key.length !== 32) throw new Error(`Encryption key version ${version} must be 32 bytes`);
  }

  return {
    encrypt(plain, context) {
      const iv = crypto.randomBytes(IV_BYTES);
      const cipher = crypto.createCipheriv(ALGO, activeKey, iv);
      cipher.setAAD(Buffer.from(context, 'utf8'));
      const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return new Uint8Array(Buffer.concat([Buffer.from([activeVersion]), iv, cipher.getAuthTag(), ciphertext]));
    },

    decrypt(blob, context) {
      const buf = Buffer.from(blob);
      if (buf.length < HEADER_BYTES) throw new Error('Ciphertext is too short');
      const version = buf[0]!;
      const key = keys.get(version);
      if (!key) throw new Error(`No decryption key for version ${version}`);
      const iv = buf.subarray(1, 1 + IV_BYTES);
      const tag = buf.subarray(1 + IV_BYTES, HEADER_BYTES);
      const decipher = crypto.createDecipheriv(ALGO, key, iv);
      decipher.setAAD(Buffer.from(context, 'utf8'));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(buf.subarray(HEADER_BYTES)), decipher.final()]).toString('utf8');
    },

    needsRotation(blob) {
      return blob[0] !== activeVersion;
    },
  };
}

export function createLookupHasher(key: Buffer) {
  return (value: string) => crypto.createHmac('sha256', key).update(value).digest('hex');
}
