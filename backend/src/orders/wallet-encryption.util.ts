import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const LEGACY_DEV_FALLBACK_KEYS = [
  'local-dev-wallet-key',
  'local-dev-wallet-key-secure-fallback',
];

function resolveSingleKey(rawKey: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  const asBase64 = Buffer.from(rawKey, 'base64');
  if (asBase64.length === 32) {
    return asBase64;
  }

  return createHash('sha256').update(rawKey).digest();
}

function resolveEncryptionKeyCandidates(): Buffer[] {
  const unique = new Map<string, Buffer>();
  const push = (rawKey: string | undefined | null) => {
    const value = String(rawKey || '').trim();
    if (!value) return;
    const key = resolveSingleKey(value);
    unique.set(key.toString('hex'), key);
  };

  push(process.env.WALLET_ENCRYPTION_KEY);
  push(process.env.WALLET_ENCRYPTION_LEGACY_KEY);

  for (const fallback of LEGACY_DEV_FALLBACK_KEYS) {
    push(fallback);
  }

  return [...unique.values()];
}

function resolveEncryptionKey(): Buffer {
  const rawKey = process.env.WALLET_ENCRYPTION_KEY;

  if (!rawKey) {
    console.warn(
      'WALLET_ENCRYPTION_KEY missing - using deterministic dev fallback',
    );
    return resolveSingleKey(LEGACY_DEV_FALLBACK_KEYS[0]);
  }

  return resolveSingleKey(rawKey);
}

export function encryptPrivateKey(privateKey: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptPrivateKey(encryptedValue: string): string {
  const value = String(encryptedValue || '').trim();

  if (!value) {
    throw new Error('Encrypted private key is missing');
  }

  if (!value.startsWith('v1:')) {
    const normalizedHex = value.replace(/^0x/i, '');
    if (/^[a-fA-F0-9]{64}$/.test(normalizedHex)) {
      // Backward compatibility: legacy rows may contain raw private key.
      return `0x${normalizedHex.toLowerCase()}`;
    }

    throw new Error('Unsupported encrypted private key format');
  }

  const [version, ivB64, tagB64, ciphertextB64] = value.split(':');

  if (!version || !ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted private key payload');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const keys = resolveEncryptionKeyCandidates();

  let lastError: unknown = null;
  for (const key of keys) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return plaintext.toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'wallet decryption failed';
  throw new Error(
    `Unable to decrypt wallet private key with configured keys: ${message}. ` +
      'Set WALLET_ENCRYPTION_KEY (and WALLET_ENCRYPTION_LEGACY_KEY if needed).',
  );
}
