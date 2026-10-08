"use client"

import {
  deleteMatesListing,
  ListingStatus,
  markMatesListingSold,
  releaseMatesListing,
} from "@lib/data/mates"
import { Button, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Action = "sold" | "release" | "delete"

const CONFIRM: Record<Action, { question: string; button: string }> = {
  sold: {
    question: "Mark as sold? Offers still waiting will be declined.",
    button: "Yes, mark sold",
  },
  release: {
    question:
      "Put it back on sale? The accepted offer is cancelled and you stop seeing each other's phone.",
    button: "Yes, put back on sale",
  },
  delete: {
    question:
      "Delete permanently? Its offers and messages are deleted too. This cannot be undone.",
    button: "Yes, delete",
  },
}

// Edit, mark sold, put back on sale (when reserved) and delete, each with a confirm step.
const MyListingActions = ({
  id,
  status,
}: {
  id: string
  status: ListingStatus
}) => {
  const router = useRouter()
  const [confirming, setConfirming] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: Action) => {
    setBusy(true)
    setError(null)
    const call = {
      sold: markMatesListingSold,
      release: releaseMatesListing,
      delete: deleteMatesListing,
    }[action]
    const result = await call(id)
    setBusy(false)
    setConfirming(null)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  const canEdit =
    status === "pending_review" || status === "active" || status === "rejected"
  const canSell = status === "active" || status === "reserved"

  if (confirming) {
    return (
      <div
        className="flex flex-col gap-2 rounded-rounded bg-petzy-canvas p-3"
        role="alertdialog"
        aria-label={CONFIRM[confirming].question}
      >
        <Text className="text-small-regular text-ui-fg-base">
          {CONFIRM[confirming].question}
        </Text>
        <div className="flex flex-wrap gap-2">
          <Button
            size="small"
            onClick={() => run(confirming)}
            isLoading={busy}
            className={
              confirming === "delete"
                ? "!bg-rose-600 !text-white hover:!bg-rose-700"
                : ""
            }
          >
            {CONFIRM[confirming].button}
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setConfirming(null)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <LocalizedClientLink href={`/mates/my/listings/${id}/edit`}>
            <Button size="small" variant="secondary">
              {status === "rejected" ? "Fix and resubmit" : "Edit"}
            </Button>
          </LocalizedClientLink>
        )}
        {canSell && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => setConfirming("sold")}
          >
            Mark sold
          </Button>
        )}
        {status === "reserved" && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => setConfirming("release")}
          >
            Put back on sale
          </Button>
        )}
        <Button
          size="small"
          variant="transparent"
          className="text-rose-700"
          onClick={() => setConfirming("delete")}
        >
          Delete
        </Button>
      </div>
      {error && (
        <Text className="text-small-regular text-rose-700" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}

export default MyListingActions
