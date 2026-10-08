"use client"

import { actOnMatesOffer, Side } from "@lib/data/mates"
import { Button, Text } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"

// "Withdraw offer" while the offer waits on the other side: the buyer can take back an offer the seller
// has not answered, and the seller can end a negotiation the buyer has not answered. Asks to confirm.
const WithdrawLink = ({ offerId, side }: { offerId: string; side: Side }) => {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withdraw = async () => {
    setBusy(true)
    setError(null)
    const result = await actOnMatesOffer(offerId, "withdraw")
    setBusy(false)
    setConfirming(false)
    if (result.error !== undefined) {
      setError(result.error)
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div
          className="flex flex-col gap-2 rounded-rounded bg-petzy-canvas p-3"
          role="alertdialog"
          aria-label="Withdraw this offer?"
        >
          <Text className="text-small-regular text-ui-fg-base">
            {side === "buyer"
              ? "Withdraw your offer? The seller will no longer be able to accept it."
              : "Withdraw from this offer? It ends the negotiation with this buyer."}
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              size="small"
              onClick={withdraw}
              isLoading={busy}
              data-testid="mates-withdraw-confirm"
            >
              Yes, withdraw
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-small-regular text-ui-fg-subtle underline underline-offset-2 hover:text-petzy-coral"
          data-testid="mates-withdraw-link"
        >
          Withdraw offer
        </button>
      )}
      {error && (
        <Text className="text-small-regular text-rose-700" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}

export default WithdrawLink
