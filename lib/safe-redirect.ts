/**
 * Validates a redirect path to prevent open redirect attacks.
 * Only allows relative paths starting with / and no protocol schemes.
 */
export function getSafeRedirectPath(next: string | null | undefined): string {
  if (!next) return '/'

  // Must start with single / (not // which browsers interpret as protocol-relative)
  if (!next.startsWith('/') || next.startsWith('//')) return '/'

  // Block any protocol schemes
  if (/^\/[a-z]+:/i.test(next)) return '/'

  // Only allow path characters
  try {
    const url = new URL(next, 'http://localhost')
    // Ensure the pathname matches what was passed (no host change)
    if (url.hostname !== 'localhost') return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}
