"use client"

import {
  InsuranceLeadReceipt,
  InsurancePlan,
  sendInsuranceLead,
} from "@lib/data/insurance"
import { INSURANCE_PET_TYPES } from "@lib/util/insurance-format"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Notice from "@modules/common/components/notice"
import { Button, Label, Text } from "@modules/common/components/ui"
import { FormEvent, useState } from "react"

const selectClass =
  "h-11 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 txt-compact-medium focus:outline-none focus:shadow-borders-interactive-with-active"
const textareaClass =
  "block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium hover:bg-ui-bg-field-hover focus:outline-none focus:shadow-borders-interactive-with-active"

/** Pre-fills pet type and age when the customer arrived from a filtered list. */
type Prefill = { petType?: string; ageMonths?: number }

// "Get a quote" for one plan. The form is uncontrolled on purpose: after an error (for example the age
// limit or the daily limit) everything the customer typed stays in place.
const QuoteForm = ({
  plan,
  prefill,
}: {
  plan: InsurancePlan
  prefill: Prefill
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentMissing, setConsentMissing] = useState(false)
  const [sent, setSent] = useState<{
    name: string
    receipt: InsuranceLeadReceipt
  } | null>(null)

  const types = INSURANCE_PET_TYPES.filter((t) =>
    plan.pet_types.includes(t.value)
  )
  const defaultType =
    prefill.petType && plan.pet_types.includes(prefill.petType)
      ? prefill.petType
      : types.length === 1
      ? types[0].value
      : ""

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    // The checkbox is `required`, so browsers stop here already; this covers any that do not.
    if (!form.has("consent")) {
      setConsentMissing(true)
      return
    }
    setConsentMissing(false)
    const text = (k: string) => String(form.get(k) ?? "").trim()
    const optional = (k: string) => text(k) || null

    setSubmitting(true)
    setError(null)
    const result = await sendInsuranceLead({
      plan_id: plan.id,
      customer_name: text("customer_name"),
      phone: text("phone"),
      email: optional("email"),
      pet_name: optional("pet_name"),
      pet_type: text("pet_type"),
      breed: optional("breed"),
      pet_age_months:
        Number(form.get("age_years") || 0) * 12 +
        Number(form.get("age_months") || 0),
      city: optional("city"),
      pincode: optional("pincode"),
      message: optional("message"),
    })
    setSubmitting(false)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    setSent({ name: text("customer_name"), receipt: result.data.lead })
  }

  if (sent) {
    return (
      <Notice
        tone="success"
        title={`Thank you, ${sent.name}. Your request is with ${sent.receipt.partner.name}.`}
        action={{ href: "/insurance", label: "See other plans" }}
      >
        {sent.receipt.partner.name} will contact you about{" "}
        {sent.receipt.plan.name} using the details you gave.
      </Notice>
    )
  }

  const age = prefill.ageMonths

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4"
      data-testid="insurance-quote-form"
    >
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <Input
          label="Your name"
          name="customer_name"
          autoComplete="name"
          maxLength={120}
          required
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          pattern="[+\d][\d\s\-]{6,18}"
          title="Enter a valid phone number"
          required
        />
        <Input
          label="Email (optional)"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={160}
        />
        <Input label="Pet name" name="pet_name" maxLength={80} required />
        <label className="flex flex-col gap-1">
          <span className="sr-only">Pet type</span>
          <select
            name="pet_type"
            defaultValue={defaultType}
            required
            className={selectClass}
            aria-label="Pet type"
          >
            <option value="" disabled>
              Pet type
            </option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <Input label="Breed (optional)" name="breed" maxLength={80} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 txt-compact-medium-plus">
          Pet age<span className="text-rose-500">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Years"
            name="age_years"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            defaultValue={age !== undefined ? Math.floor(age / 12) : undefined}
            required
          />
          <Input
            label="Months"
            name="age_months"
            type="number"
            inputMode="numeric"
            min={0}
            max={11}
            defaultValue={age !== undefined ? age % 12 : undefined}
            required
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <Input
          label="City"
          name="city"
          autoComplete="address-level2"
          maxLength={80}
          required
        />
        <Input
          label="PIN code (optional)"
          name="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[1-9][0-9]{5}"
          title="A 6 digit PIN code"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="insurance-message" className="txt-compact-medium-plus">
          Message (optional)
        </Label>
        <textarea
          id="insurance-message"
          name="message"
          rows={3}
          maxLength={1000}
          className={textareaClass}
        />
      </div>

      {/*
        LEGAL: placeholder consent wording. It needs review by a lawyer (India's DPDP Act: consent for sharing
        personal data with a third party) before launch, together with the Privacy Policy it links to.
      */}
      <label className="flex items-start gap-3 rounded-rounded border border-petzy-border bg-petzy-canvas p-3 text-small-regular text-ui-fg-base">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-5 w-5 shrink-0 accent-petzy-teal"
          onChange={(e) => e.target.checked && setConsentMissing(false)}
          data-testid="insurance-consent"
        />
        <span>
          I agree that Petzy may share these details with {plan.partner.name} so
          they can contact me about this plan. See our{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="text-petzy-teal underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </LocalizedClientLink>
          .
        </span>
      </label>
      {consentMissing && (
        <Text className="-mt-2 text-small-regular text-rose-700" role="alert">
          Please tick the box so we can pass your details to {plan.partner.name}
          .
        </Text>
      )}

      {error && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-4"
          role="alert"
          data-testid="insurance-quote-error"
        >
          <Text className="text-rose-700">{error}</Text>
        </div>
      )}

      <Button
        type="submit"
        size="large"
        isLoading={submitting}
        className="w-full xsmall:w-auto"
        data-testid="insurance-quote-submit"
      >
        Get a quote
      </Button>
    </form>
  )
}

export default QuoteForm
