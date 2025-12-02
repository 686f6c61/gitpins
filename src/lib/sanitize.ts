/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Sanitize Module
 * Provides HTML sanitization for trusted content (translations).
 * Only allows a whitelist of safe tags to prevent XSS attacks.
 */

// Whitelist of allowed HTML tags (no attributes allowed)
const ALLOWED_TAGS = ['strong', 'code', 'em', 'b', 'i', 'br']

/**
 * Sanitizes HTML by escaping all content and then restoring only allowed tags.
 * This is designed for trusted content like translations, not user input.
 *
 * Security approach:
 * 1. Escape ALL HTML entities first (nuclear option)
 * 2. Selectively restore only whitelisted tags without attributes
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML with only allowed tags
 */
export function sanitizeHTML(html: string): string {
  // First, escape everything (prevents any XSS)
  let result = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Then, restore only allowed tags (without attributes)
  for (const tag of ALLOWED_TAGS) {
    // Opening tags (only exact matches, no attributes)
    const openRegex = new RegExp(`&lt;${tag}&gt;`, 'gi')
    result = result.replace(openRegex, `<${tag}>`)

    // Closing tags
    const closeRegex = new RegExp(`&lt;/${tag}&gt;`, 'gi')
    result = result.replace(closeRegex, `</${tag}>`)
  }

  return result
}

/**
 * Validates that a string contains only allowed HTML tags.
 * Useful for checking if content is safe before rendering.
 *
 * @param html - The HTML string to validate
 * @returns true if the string contains only allowed tags (or no tags)
 */
export function validateHTML(html: string): boolean {
  // Remove allowed tags
  let cleaned = html
  for (const tag of ALLOWED_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}>`, 'gi'), '')
    cleaned = cleaned.replace(new RegExp(`</${tag}>`, 'gi'), '')
  }

  // Check if any other tags remain (anything that looks like <...>)
  return !/<[^>]+>/.test(cleaned)
}
