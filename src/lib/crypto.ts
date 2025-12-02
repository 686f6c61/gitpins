/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Crypto Module
 * Handles encryption and decryption of sensitive data (GitHub tokens)
 * using AES-256-GCM authenticated encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Encryption algorithm: AES-256-GCM provides both confidentiality and authenticity
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16        // Initialization vector length in bytes
const AUTH_TAG_LENGTH = 16  // GCM authentication tag length in bytes
const SALT_LENGTH = 32      // Salt length for key derivation

/**
 * Derives a 32-byte encryption key from the ENCRYPTION_SECRET env variable.
 * Uses scrypt for secure key derivation.
 * @returns Buffer containing the derived encryption key
 * @throws Error if ENCRYPTION_SECRET is not set
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required')
  }
  // Derive a 32-byte key from the secret using scrypt (memory-hard KDF)
  return scryptSync(secret, 'gitpins-salt', 32)
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Each encryption generates a unique IV for security.
 * @param text - The plaintext string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH) // Unique IV for each encryption
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag() // GCM auth tag for integrity verification

  // Format: iv:authTag:encryptedData (all in hex for safe storage)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a ciphertext string encrypted with our encrypt() function.
 * Verifies the GCM authentication tag to ensure data integrity.
 * @param encryptedText - The encrypted string in format iv:authTag:ciphertext
 * @returns The original plaintext string
 * @throws Error if format is invalid or authentication fails
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const parts = encryptedText.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag) // Set auth tag for GCM verification

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8') // Will throw if auth tag doesn't match

  return decrypted
}

/**
 * Checks if a string appears to be encrypted with our encrypt() function.
 * Validates the format: iv:authTag:ciphertext with correct lengths.
 * @param text - The string to check
 * @returns true if the string matches our encrypted format
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(':')
  if (parts.length !== 3) return false

  const [ivHex, authTagHex] = parts
  // Check if the IV and auth tag are valid hex strings of the right length
  return ivHex.length === IV_LENGTH * 2 && authTagHex.length === AUTH_TAG_LENGTH * 2
}

/**
 * Generates a cryptographically secure random hex string.
 * Useful for generating secrets, tokens, and nonces.
 * @param length - Number of random bytes (default 32, produces 64 hex chars)
 * @returns Hex-encoded random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}
