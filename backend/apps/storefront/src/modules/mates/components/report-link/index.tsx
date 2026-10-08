"use client"

import { reportMatesListing } from "@lib/data/mates"
import { useSignInHref } from "@lib/hooks/use-sign-in-href"
import { Button, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FormEvent, useState } from "react"

const ReportLink = ({
  listingId,
  signedIn,
}: {
  listingId: string
  signedIn: boolean
}) => {
  const [open, setOpen] = useState(false)
  const signInHref = useSignInHref()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const reason = String(
      new FormData(e.currentTarget).get("reason") ?? ""
    ).trim()
    setSubmitting(true)
    setError(null)
    const result = await reportMatesListing(listingId, reason)
    setSubmitting(false)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <Text className="text-small-regular text-petzy-teal" role="status">
        Thanks for telling us. Our team will take a look.
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="self-start text-small-regular text-ui-fg-subtle underline underline-offset-2 hover:text-petzy-coral"
        data-testid="mates-report-link"
      >
        Report this listing
      </button>
      {open && !signedIn && (
        <Text className="text-small-regular text-ui-fg-subtle">
          Please{" "}
          <LocalizedClientLink
            href={signInHref}
            className="text-petzy-teal underline"
          >
            sign in
          </LocalizedClientLink>{" "}
          to report a listing.
        </Text>
      )}
      {open && signedIn && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor="mates-report-reason" className="text-small-regular">
            What is wrong with it?
          </label>
          <textarea
            id="mates-report-reason"
            name="reason"
            rows={3}
            minLength={3}
            maxLength={500}
            required
            className="block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium focus:outline-none focus:shadow-borders-interactive-with-active"
          />
          {error && (
            <Text className="text-small-regular text-rose-700" role="alert">
              {error}
            </Text>
          )}
          <Button
            type="submit"
            variant="secondary"
            size="small"
            className="self-start"
            isLoading={submitting}
          >
            Send report
          </Button>
        </form>
      )}
    </div>
  )
}

export default ReportLink
