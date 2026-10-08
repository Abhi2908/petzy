"use client"

import { Button, clx, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"

type NoticeProps = {
  tone?: "error" | "empty" | "success" | "info"
  title: string
  children?: ReactNode
  retry?: boolean
  action?: { href: string; label: string }
  className?: string
}

const TONES = {
  error: "border-rose-200 bg-rose-50",
  empty: "border-dashed border-petzy-border bg-white",
  success: "border-petzy-teal/30 bg-petzy-teal/5",
  info: "border-petzy-border bg-white",
}

// Error, empty and confirmation boxes used across the Mates pages. `retry` re-runs the page's data fetch.
const Notice = ({
  tone = "info",
  title,
  children,
  retry,
  action,
  className,
}: NoticeProps) => {
  const router = useRouter()
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={clx(
        "rounded-rounded border p-6 flex flex-col gap-3 items-start",
        TONES[tone],
        className
      )}
    >
      <Text
        className={clx(
          "font-semibold",
          tone === "error" ? "text-rose-700" : "text-ui-fg-base"
        )}
      >
        {title}
      </Text>
      {children && (
        <div className="text-ui-fg-subtle text-small-regular">{children}</div>
      )}
      {(retry || action) && (
        <div className="flex flex-wrap gap-2">
          {retry && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => router.refresh()}
            >
              Try again
            </Button>
          )}
          {action && (
            <LocalizedClientLink href={action.href}>
              <Button size="small">{action.label}</Button>
            </LocalizedClientLink>
          )}
        </div>
      )}
    </div>
  )
}

export default Notice
