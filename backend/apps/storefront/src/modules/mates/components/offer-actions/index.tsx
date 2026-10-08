"use client"

import { actOnMatesOffer, Side } from "@lib/data/mates"
import { formatRupees } from "@lib/util/mates-format"
import { Button, clx, Text } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

type Action = "accept" | "reject" | "withdraw" | "counter"

// Shown only when it is this customer's turn. The seller answers an open offer with accept, counter or
// reject; the buyer answers a counter with accept, counter or withdraw. On a firm-price listing there is
// no counter (`canCounter` false).
const OfferActions = ({
  offerId,
  side,
  amount,
  canCounter,
}: {
  offerId: string
  side: Side
  amount: number
  canCounter: boolean
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countering, setCountering] = useState(false)
  const [confirmAccept, setConfirmAccept] = useState(false)

  const run = async (action: Action, counterAmount?: number) => {
    setBusy(action)
    setError(null)
    const result = await actOnMatesOffer(offerId, action, counterAmount)
    setBusy(null)
    if (result.error !== undefined) {
      setError(result.error)
      router.refresh()
      return
    }
    setCountering(false)
    setConfirmAccept(false)
    router.refresh()
  }

  const submitCounter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    run("counter", Number(new FormData(e.currentTarget).get("amount")))
  }

  const closeAction: Action = side === "seller" ? "reject" : "withdraw"

  return (
    <div
      className="flex flex-col gap-3 rounded-large border-2 border-petzy-coral bg-white p-4"
      data-testid="mates-offer-actions"
    >
      <Text className="font-semibold text-ui-fg-base">
        Your turn: {side === "seller" ? "the buyer" : "the seller"} offered{" "}
        {formatRupees(amount)}.
      </Text>

      {confirmAccept ? (
        <div className="flex flex-col gap-2">
          <Text className="text-small-regular text-ui-fg-subtle">
            Accept {formatRupees(amount)}? The listing is reserved for this
            buyer, other offers are declined, and you both see each other&apos;s
            phone number.
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run("accept")} isLoading={busy === "accept"}>
              Yes, accept
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirmAccept(false)}
              disabled={!!busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : countering ? (
        <form onSubmit={submitCounter} className="flex flex-col gap-2">
          <label htmlFor="mates-counter" className="text-small-regular">
            Your counter offer in ₹
          </label>
          <div className="flex gap-2">
            <input
              id="mates-counter"
              name="amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              className="h-10 w-full min-w-0 rounded-md border border-ui-border-base bg-white px-3 focus:outline-none focus:ring-2 focus:ring-petzy-teal"
            />
            <Button type="submit" isLoading={busy === "counter"}>
              Send
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setCountering(false)}
            className="self-start text-small-regular text-ui-fg-subtle underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div
          className={clx(
            "grid grid-cols-1 gap-2",
            canCounter ? "xsmall:grid-cols-3" : "xsmall:grid-cols-2"
          )}
        >
          <Button
            onClick={() => setConfirmAccept(true)}
            disabled={!!busy}
            data-testid="mates-accept"
          >
            Accept
          </Button>
          {canCounter && (
            <Button
              variant="secondary"
              onClick={() => setCountering(true)}
              disabled={!!busy}
              data-testid="mates-counter"
            >
              Counter
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => run(closeAction)}
            isLoading={busy === closeAction}
            data-testid={`mates-${closeAction}`}
          >
            {side === "seller" ? "Reject" : "Withdraw"}
          </Button>
        </div>
      )}
      {error && (
        <Text className="text-small-regular text-rose-700" role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}

export default OfferActions
