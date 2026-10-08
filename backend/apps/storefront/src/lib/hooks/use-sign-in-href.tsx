"use client"

import { usePathname, useSearchParams } from "next/navigation"

/**
 * The account page link for "sign in to continue" prompts, carrying the current page as `return_to` so
 * the customer comes back here after signing in or registering. Pass it to LocalizedClientLink.
 */
export function useSignInHref(): string {
  const pathname = usePathname()
  const params = useSearchParams()
  const here = params.size ? `${pathname}?${params}` : pathname
  return `/account?return_to=${encodeURIComponent(here)}`
}
