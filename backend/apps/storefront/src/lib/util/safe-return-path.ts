// Where to send a customer after they sign in or register. Only a path on this site is accepted
// ("/in/mates/abc?x=1"); anything that could point elsewhere ("https://...", "//host", "/\host",
// "javascript:...") is rejected, so the parameter cannot be used to bounce people to another site.

const BASE = "http://petzy.invalid"

export function safeReturnPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.length > 2000
  ) {
    return null
  }
  // "//host" and "/\host" are treated as other sites by browsers; control characters can hide them.
  if (value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return null
  }
  try {
    const url = new URL(value, BASE)
    if (url.origin !== BASE) {
      return null
    }
    // Returning to the sign-in page itself would loop.
    if (/^\/[a-z]{2}\/account\/?$/.test(url.pathname)) {
      return null
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
