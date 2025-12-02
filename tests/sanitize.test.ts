import { sanitizeHTML, validateHTML } from '@/lib/sanitize'

describe('Sanitize Module', () => {
  describe('sanitizeHTML', () => {
    it('should allow <strong> tags', () => {
      const input = 'This is <strong>bold</strong> text'
      const result = sanitizeHTML(input)
      expect(result).toBe('This is <strong>bold</strong> text')
    })

    it('should allow <code> tags', () => {
      const input = 'Use <code>npm install</code> to install'
      const result = sanitizeHTML(input)
      expect(result).toBe('Use <code>npm install</code> to install')
    })

    it('should allow <em> tags', () => {
      const input = 'This is <em>emphasized</em>'
      const result = sanitizeHTML(input)
      expect(result).toBe('This is <em>emphasized</em>')
    })

    it('should allow <b> and <i> tags', () => {
      const input = '<b>Bold</b> and <i>italic</i>'
      const result = sanitizeHTML(input)
      expect(result).toBe('<b>Bold</b> and <i>italic</i>')
    })

    it('should allow <br> tags', () => {
      const input = 'Line 1<br>Line 2'
      const result = sanitizeHTML(input)
      expect(result).toBe('Line 1<br>Line 2')
    })

    it('should escape <script> tags', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeHTML(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('should escape <img> tags', () => {
      const input = '<img src="x" onerror="alert(1)">'
      const result = sanitizeHTML(input)
      expect(result).not.toContain('<img')
      expect(result).toContain('&lt;img')
    })

    it('should escape <a> tags (not in allowed list)', () => {
      const input = '<a href="javascript:alert(1)">Click</a>'
      const result = sanitizeHTML(input)
      expect(result).not.toContain('<a ')
      expect(result).toContain('&lt;a')
    })

    it('should escape event handlers by escaping the entire tag', () => {
      const input = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeHTML(input)
      // The entire div tag is escaped, including onclick
      expect(result).toContain('&lt;div')
      expect(result).not.toContain('<div') // No actual div tag
    })

    it('should handle nested allowed tags', () => {
      const input = '<strong><em>Bold and italic</em></strong>'
      const result = sanitizeHTML(input)
      expect(result).toBe('<strong><em>Bold and italic</em></strong>')
    })

    it('should escape ampersands and quotes', () => {
      const input = 'Tom & Jerry said "Hello"'
      const result = sanitizeHTML(input)
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;')
    })

    it('should handle mixed safe and unsafe content', () => {
      const input = '<strong>Safe</strong><script>unsafe</script><code>safe</code>'
      const result = sanitizeHTML(input)
      expect(result).toContain('<strong>Safe</strong>')
      expect(result).toContain('<code>safe</code>')
      expect(result).not.toContain('<script>')
    })
  })

  describe('validateHTML', () => {
    it('should return true for plain text', () => {
      expect(validateHTML('Hello world')).toBe(true)
    })

    it('should return true for allowed tags only', () => {
      expect(validateHTML('<strong>Bold</strong>')).toBe(true)
      expect(validateHTML('<code>code</code>')).toBe(true)
      expect(validateHTML('<em>em</em>')).toBe(true)
    })

    it('should return false for disallowed tags', () => {
      expect(validateHTML('<script>alert(1)</script>')).toBe(false)
      expect(validateHTML('<div>text</div>')).toBe(false)
      expect(validateHTML('<a href="#">link</a>')).toBe(false)
    })

    it('should return false for tags with attributes', () => {
      expect(validateHTML('<strong class="x">text</strong>')).toBe(false)
    })
  })
})
