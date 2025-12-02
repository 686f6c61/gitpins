import { encrypt, decrypt, isEncrypted, generateSecureToken } from '@/lib/crypto'

describe('Crypto Module', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const original = 'my-secret-token'
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should encrypt and decrypt a long string', () => {
      const original = 'ghp_' + 'a'.repeat(100) // Simulating a GitHub token
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should encrypt and decrypt special characters', () => {
      const original = 'token/with+special=chars&more!'
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
      const original = 'same-text'
      const encrypted1 = encrypt(original)
      const encrypted2 = encrypt(original)

      expect(encrypted1).not.toBe(encrypted2)
      expect(decrypt(encrypted1)).toBe(original)
      expect(decrypt(encrypted2)).toBe(original)
    })

    it('should throw error for invalid encrypted text format', () => {
      expect(() => decrypt('invalid-format')).toThrow()
    })

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt('test')
      const [iv, authTag, data] = encrypted.split(':')
      const tampered = `${iv}:${authTag}:${data.slice(0, -2)}00`

      expect(() => decrypt(tampered)).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('should return true for encrypted text', () => {
      const encrypted = encrypt('test')
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('should return false for plain text', () => {
      expect(isEncrypted('plain-text')).toBe(false)
    })

    it('should return false for invalid format', () => {
      expect(isEncrypted('a:b')).toBe(false)
      expect(isEncrypted('a:b:c:d')).toBe(false)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate a token of default length (32 bytes = 64 hex chars)', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(64)
    })

    it('should generate a token of specified length', () => {
      const token = generateSecureToken(16)
      expect(token).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      expect(token1).not.toBe(token2)
    })

    it('should only contain hex characters', () => {
      const token = generateSecureToken()
      expect(token).toMatch(/^[0-9a-f]+$/)
    })
  })
})
