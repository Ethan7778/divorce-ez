/**
 * Logger utility - Only logs in development mode
 * Prevents sensitive data exposure in production
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

type LogLevel = 'log' | 'warn' | 'error' | 'debug'

interface Logger {
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data
  
  const sensitiveKeys = ['ssn', 'ssnLast4', 'ssn_last_4', 'password', 'accessToken', 'refreshToken', 'token']
  const sanitized = Array.isArray(data) ? [...data] : { ...data }
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key])
    }
  }
  
  return sanitized
}

function createLogger(level: LogLevel): (...args: any[]) => void {
  if (!isDevelopment) {
    // In production, only log errors
    if (level === 'error') {
      return (...args: any[]) => {
        const sanitized = args.map(arg => sanitizeData(arg))
        console.error(...sanitized)
      }
    }
    return () => {} // No-op for non-error logs in production
  }
  
  // In development, log everything (but still sanitize sensitive data)
  return (...args: any[]) => {
    const sanitized = args.map(arg => sanitizeData(arg))
    console[level](...sanitized)
  }
}

export const logger: Logger = {
  log: createLogger('log'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
}
