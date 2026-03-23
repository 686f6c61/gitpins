import { NextResponse } from 'next/server'
import {
  addSecurityHeaders,
  checkAPIRateLimit,
  isValidRepoName,
  isValidRepoFullName,
  sanitizeInput,
  sanitizePlainText,
  stripControlCharacters,
  validateOrigin,
} from '@/lib/security'

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

  describe('stripControlCharacters', () => {
    it('should remove ASCII control characters', () => {
      expect(stripControlCharacters('hello\u0000\tworld\u007f')).toBe('helloworld')
    })

    it('should return empty string for invalid input', () => {
      expect(stripControlCharacters(null as unknown as string)).toBe('')
    })
  })

  describe('sanitizePlainText', () => {
    it('should remove control characters, trim and truncate', () => {
      const input = `  hello\u0000world${'x'.repeat(20)}  `
      expect(sanitizePlainText(input, 10)).toBe('helloworld')
    })
  })

  describe('validateOrigin', () => {
    it('should allow GET requests without origin headers', () => {
      const request = {
        method: 'GET',
        headers: new Headers(),
      }

      expect(validateOrigin(request as never)).toBe(true)
    })

    it('should reject mutating requests without origin or referer', () => {
      const request = {
        method: 'POST',
        headers: new Headers(),
      }

      expect(validateOrigin(request as never)).toBe(false)
    })

    it('should allow the configured app origin', () => {
      const request = {
        method: 'POST',
        headers: new Headers({
          origin: 'http://localhost:3000',
        }),
      }

      expect(validateOrigin(request as never)).toBe(true)
    })

    it('should reject unknown origins', () => {
      const request = {
        method: 'POST',
        headers: new Headers({
          origin: 'https://evil.example.com',
        }),
      }

      expect(validateOrigin(request as never)).toBe(false)
    })
  })

  describe('addSecurityHeaders', () => {
    it('should append defensive headers to API responses', () => {
      const response = addSecurityHeaders(NextResponse.json({ ok: true }))

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('checkAPIRateLimit', () => {
    it('should allow requests below the API limit', () => {
      const request = {
        headers: new Headers({
          'x-real-ip': `test-ip-${Date.now()}`,
        }),
      }

      const result = checkAPIRateLimit(request as never)
      expect(result.allowed).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it('should block requests above the API limit', () => {
      const identifier = `test-user-${Date.now()}`
      const request = {
        headers: new Headers(),
      }

      let result = checkAPIRateLimit(request as never, identifier)
      expect(result.allowed).toBe(true)

      for (let index = 0; index < 100; index++) {
        result = checkAPIRateLimit(request as never, identifier)
      }

      expect(result.allowed).toBe(false)
      expect(result.response?.status).toBe(429)
    })
  })
})
