import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

describe('Rate Limit Module', () => {
  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const identifier = `test-${Date.now()}-1`
      const config = { scope: 'test', windowMs: 60000, maxRequests: 5 }

      const result1 = await checkRateLimit(identifier, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)

      const result2 = await checkRateLimit(identifier, config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests over the limit', async () => {
      const identifier = `test-${Date.now()}-2`
      const config = { scope: 'test', windowMs: 60000, maxRequests: 2 }

      await checkRateLimit(identifier, config) // 1
      await checkRateLimit(identifier, config) // 2

      const result = await checkRateLimit(identifier, config) // 3 - should be blocked
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should return reset time', async () => {
      const identifier = `test-${Date.now()}-3`
      const config = { scope: 'test', windowMs: 60000, maxRequests: 5 }

      const result = await checkRateLimit(identifier, config)
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60000)
    })

    it('should track different identifiers separately', async () => {
      const config = { scope: 'test', windowMs: 60000, maxRequests: 1 }

      const id1 = `test-${Date.now()}-4a`
      const id2 = `test-${Date.now()}-4b`

      const result1 = await checkRateLimit(id1, config)
      expect(result1.success).toBe(true)

      const result2 = await checkRateLimit(id2, config)
      expect(result2.success).toBe(true)

      // First identifier should now be blocked
      const result3 = await checkRateLimit(id1, config)
      expect(result3.success).toBe(false)
    })
  })

  describe('rateLimits presets', () => {
    it('should have sync rate limit configured', () => {
      expect(rateLimits.sync).toBeDefined()
      expect(rateLimits.sync.scope).toBe('sync')
      expect(rateLimits.sync.windowMs).toBe(60 * 60 * 1000) // 1 hour
      expect(rateLimits.sync.maxRequests).toBe(10)
    })

    it('should have api rate limit configured', () => {
      expect(rateLimits.api).toBeDefined()
      expect(rateLimits.api.scope).toBe('api')
      expect(rateLimits.api.windowMs).toBe(60 * 1000) // 1 minute
      expect(rateLimits.api.maxRequests).toBe(100)
    })

    it('should have auth rate limit configured', () => {
      expect(rateLimits.auth).toBeDefined()
      expect(rateLimits.auth.scope).toBe('auth')
      expect(rateLimits.auth.windowMs).toBe(60 * 1000) // 1 minute
      expect(rateLimits.auth.maxRequests).toBe(10)
    })
  })
})
