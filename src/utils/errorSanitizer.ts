/**
 * Error Message Sanitizer
 * Sanitizes error messages to remove internal system references
 */

/**
 * Patterns to replace in error messages
 * Format: [pattern, replacement]
 */
const ERROR_REPLACEMENTS: [RegExp, string][] = [
  [/Odoo\s+Session\s+Expired/gi, 'Session Expired'],
  [/Odoo\s+session\s+expired/gi, 'Session expired'],
  [/Odoo\s+error/gi, 'Server error'],
  [/Odoo\s+Error/gi, 'Server Error'],
  [/Odoo\s+JSON-RPC/gi, 'Server API'],
  [/from\s+Odoo/gi, 'from server'],
  [/in\s+Odoo/gi, 'in system'],
  [/Odoo\s+server/gi, 'ERP server'],
  [/Odoo\s+database/gi, 'database'],
  [/\bOdoo\s+URL/gi, 'ERP URL'],
  [/\bOdoo\b/gi, 'ERP'], // Generic fallback for any remaining "Odoo" references
]

/**
 * Sanitize an error message by replacing internal system references
 * with user-friendly terms
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return message

  let sanitized = message
  for (const [pattern, replacement] of ERROR_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement)
  }

  return sanitized
}

/**
 * Sanitize an error object, handling both string messages and error objects
 */
export function sanitizeError(error: unknown): string {
  if (typeof error === 'string') {
    return sanitizeErrorMessage(error)
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message)
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    if (typeof errorObj.message === 'string') {
      return sanitizeErrorMessage(errorObj.message)
    }
    if (typeof errorObj.error === 'string') {
      return sanitizeErrorMessage(errorObj.error)
    }
  }

  return 'An error occurred'
}

export default sanitizeErrorMessage
