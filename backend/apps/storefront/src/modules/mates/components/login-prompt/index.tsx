"use client"

import { useSignInHref } from "@lib/hooks/use-sign-in-href"
import { Button, clx, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Asks the visitor to sign in, then brings them back to this page.
const LoginPrompt = ({
  title,
  children,
  bare,
}: {
  title: string
  children?: React.ReactNode
  /** Leave out the card frame when the prompt already sits inside a card. */
  bare?: boolean
}) => {
  const signInHref = useSignInHref()
  return (
    <div
      className={clx(
        "flex flex-col gap-3 items-start",
        !bare && "rounded-large border border-petzy-border bg-white p-6"
      )}
      data-testid="mates-login-prompt"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <Text className="text-ui-fg-subtle">{children}</Text>}
      <LocalizedClientLink href={signInHref}>
        <Button>Sign in or create an account</Button>
      </LocalizedClientLink>
    </div>
  )
}

export default LoginPrompt
