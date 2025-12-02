import { isValidRepoName, isValidRepoFullName, sanitizeInput } from '@/lib/security'

describe('Security Module', () => {
  describe('isValidRepoName', () => {
    it('should accept valid repo names', () => {
      expect(isValidRepoName('my-repo')).toBe(true)
      expect(isValidRepoName('my_repo')).toBe(true)
      expect(isValidRepoName('my.repo')).toBe(true)
      expect(isValidRepoName('MyRepo123')).toBe(true)
      expect(isValidRepoName('repo')).toBe(true)
    })

    it('should reject empty strings', () => {
      expect(isValidRepoName('')).toBe(false)
    })

    it('should reject names with spaces', () => {
      expect(isValidRepoName('my repo')).toBe(false)
    })

    it('should reject names with special characters', () => {
      expect(isValidRepoName('my/repo')).toBe(false)
      expect(isValidRepoName('my@repo')).toBe(false)
      expect(isValidRepoName('my!repo')).toBe(false)
      expect(isValidRepoName('my$repo')).toBe(false)
    })

    it('should reject names longer than 100 characters', () => {
      expect(isValidRepoName('a'.repeat(100))).toBe(true)
      expect(isValidRepoName('a'.repeat(101))).toBe(false)
    })

    it('should reject names with path traversal attempts', () => {
      expect(isValidRepoName('../secret')).toBe(false)
      expect(isValidRepoName('..%2Fsecret')).toBe(false)
    })
  })

  describe('isValidRepoFullName', () => {
    it('should accept valid full names', () => {
      expect(isValidRepoFullName('owner/repo')).toBe(true)
      expect(isValidRepoFullName('my-org/my-repo')).toBe(true)
      expect(isValidRepoFullName('user123/project_name')).toBe(true)
    })

    it('should reject names without slash', () => {
      expect(isValidRepoFullName('justarepo')).toBe(false)
    })

    it('should reject names with multiple slashes', () => {
      expect(isValidRepoFullName('owner/repo/extra')).toBe(false)
    })

    it('should reject invalid owner names', () => {
      expect(isValidRepoFullName('bad owner/repo')).toBe(false)
      expect(isValidRepoFullName('../hack/repo')).toBe(false)
    })

    it('should reject invalid repo names', () => {
      expect(isValidRepoFullName('owner/bad repo')).toBe(false)
      expect(isValidRepoFullName('owner/../etc')).toBe(false)
    })

    it('should reject empty parts', () => {
      expect(isValidRepoFullName('/repo')).toBe(false)
      expect(isValidRepoFullName('owner/')).toBe(false)
      expect(isValidRepoFullName('/')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello')
    })

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000)
      expect(sanitizeInput(longString).length).toBe(1000)
    })

    it('should use custom max length', () => {
      const input = 'a'.repeat(100)
      expect(sanitizeInput(input, 50).length).toBe(50)
    })

    it('should return empty string for non-strings', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('')
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
      expect(sanitizeInput(123 as unknown as string)).toBe('')
    })

    it('should preserve valid input', () => {
      expect(sanitizeInput('valid input')).toBe('valid input')
    })
  })
})
