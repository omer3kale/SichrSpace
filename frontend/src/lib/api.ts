/**
 * Resolves an API path against the backend base URL.
 *
 * In development: NEXT_PUBLIC_API_URL = http://localhost:8080
 * In production:  NEXT_PUBLIC_API_URL = https://api.sichrplace.com  (or whatever your VPS is)
 *
 * If the variable is unset the path is used as-is (same-origin fetch).
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? ''
  return `${base}${path}`
}
