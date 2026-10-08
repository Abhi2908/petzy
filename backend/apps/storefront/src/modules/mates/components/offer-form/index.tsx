"use client"

import { makeMatesOffer, MatesOffer } from "@lib/data/mates"
import { formatRupees } from "@lib/util/mates-format"
import Input from "@modules/common/components/input"
import { Button, Label, Text } from "@modules/common/components/ui"
import { FormEvent, useState } from "react"
import Notice from "../notice"

// The buyer types the phone here on purpose: the seller only ever sees this number, and only after
// accepting. Nothing is taken from the customer profile.
//
// On a firm-price listing (`firm`) the only possible offer is the asking price, so the form drops the
// amount field and becomes "Buy at ₹X": just a phone number and an optional message.
const OfferForm = ({
  listingId,
  price,
  firm = false,
}: {
  listingId: string
  price: number
  firm?: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{
    offer: MatesOffer
    messageError?: string
  } | null>(null)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    const result = await makeMatesOffer(listingId, {
      amount: firm ? price : Number(form.get("amount")),
      buyer_phone: String(form.get("buyer_phone") ?? "").trim(),
      message: String(form.get("message") ?? ""),
    })
    setSubmitting(false)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    setSent(result.data)
  }

  if (sent) {
    return (
      <Notice
        tone="success"
        title={
          firm
            ? `Request to buy at ${formatRupees(sent.offer.amount)} sent`
            : `Offer of ${formatRupees(sent.offer.amount)} sent`
        }
        action={{
          href: `/mates/my/offers/${sent.offer.id}`,
          label: "View your offer",
        }}
      >
        {firm
          ? "The seller will accept or decline it."
          : "The seller will accept, counter or decline it."}{" "}
        You will see their phone number once they accept.
        {sent.messageError && (
          <span className="block mt-2 text-rose-700">
            Your message was not sent: {sent.messageError}
          </span>
        )}
      </Notice>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4"
      data-testid="mates-offer-form"
    >
      {firm ? (
        <Text className="text-ui-fg-subtle">
          The price is fixed at {formatRupees(price)}. Leave your phone number
          and the seller can accept your request.
        </Text>
      ) : (
        <Input
          label={`Your offer in ₹ (asking ${formatRupees(price)})`}
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
        />
      )}
      <Input
        label="Your phone"
        name="buyer_phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        pattern="[+\d][\d\s\-]{6,18}"
        title="Enter a valid phone number"
        required
      />
      <Text className="-mt-2 text-xs text-ui-fg-subtle">
        Only shared with the seller if they accept your offer.
      </Text>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="mates-offer-message"
          className="txt-compact-medium-plus"
        >
          Message to the seller (optional)
        </Label>
        <textarea
          id="mates-offer-message"
          name="message"
          rows={3}
          maxLength={1000}
          className="block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium hover:bg-ui-bg-field-hover focus:outline-none focus:shadow-borders-interactive-with-active"
        />
      </div>
      {error && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-3"
          role="alert"
          data-testid="mates-offer-error"
        >
          <Text className="text-rose-700">{error}</Text>
        </div>
      )}
      <Button
        type="submit"
        size="large"
        isLoading={submitting}
        data-testid="mates-offer-submit"
      >
        {firm ? `Buy at ${formatRupees(price)}` : "Make an offer"}
      </Button>
    </form>
  )
}

export default OfferForm
