/**
 * Input validation utilities
 */

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate and sanitize user ID
 */
export function validateUserId(userId: unknown): string {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('User ID is required')
  }
  
  const trimmed = userId.trim()
  if (!isValidUUID(trimmed)) {
    throw new Error('Invalid user ID format')
  }
  
  return trimmed
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove potentially dangerous characters
  let sanitized = input.trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, maxLength)
  
  return sanitized
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate SSN format (last 4 digits)
 */
export function isValidSSNLast4(ssn: string): boolean {
  return /^\d{4}$/.test(ssn)
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  // Check if it's 10 digits (US format)
  return /^\d{10}$/.test(cleaned)
}
