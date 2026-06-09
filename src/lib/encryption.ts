import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Derive a secure 32-byte key from the environment secret
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || 'scriptforge-fallback-secret-key-32bytes';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a plain text string using AES-256-CBC.
 * Returns the format `iv_hex:encrypted_hex`.
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a hex string formatted as `iv_hex:encrypted_hex`.
 * Returns the original plain text.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encryption format. Expected "iv:ciphertext".');
  }

  const [ivHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex!, 'hex');
  const ciphertext = Buffer.from(ciphertextHex!, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = decipher.update(ciphertext);
  
  let decryptedStr = decrypted.toString('utf8');
  decryptedStr += decipher.final('utf8');
  
  return decryptedStr;
}
