/**
 * Shared auth-header utilities.
 * Reads the JWT access token from localStorage / sessionStorage
 * and returns headers suitable for fetch().
 */

export function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function getAuthHeadersMultipart(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
