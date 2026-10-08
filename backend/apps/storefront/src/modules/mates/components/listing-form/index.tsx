"use client"

import {
  createMatesListing,
  ListingInput,
  MyMatesListing,
  PetType,
  updateMatesListing,
} from "@lib/data/mates"
import { GENDERS, PET_TYPES } from "@lib/util/mates-format"
import Input from "@modules/common/components/input"
import { Button, clx, Label, Text } from "@modules/common/components/ui"
import { FormEvent, ReactNode, useState } from "react"
import Notice from "../notice"
import PhotoUploader, { Photo } from "../photo-uploader"

const STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
]

const textareaClass =
  "block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium hover:bg-ui-bg-field-hover focus:outline-none focus:shadow-borders-interactive-with-active"
const selectClass =
  "h-11 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 txt-compact-medium focus:outline-none focus:shadow-borders-interactive-with-active"

function Chips<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string
  legend: string
  options: readonly { value: T; label: string }[]
  value: T | ""
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 txt-compact-medium-plus">
        {legend}
        <span className="text-rose-500">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              required={i === 0}
              className="peer sr-only"
            />
            <span className="inline-flex h-10 items-center rounded-full border border-petzy-border bg-white px-4 text-small-regular text-petzy-teal transition-colors peer-checked:border-petzy-teal peer-checked:bg-petzy-teal peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-petzy-coral">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const Section = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <section className="flex flex-col gap-4 rounded-large border border-petzy-border bg-white p-5 small:p-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
)

const Check = ({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) => (
  <label className="flex items-center gap-3 text-ui-fg-base">
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      className="h-5 w-5 accent-petzy-teal"
    />
    {label}
  </label>
)

type ListingFormProps = { listing?: MyMatesListing }

// Post a new listing, or edit one (pass `listing`). Either way it goes to the review queue.
const ListingForm = ({ listing }: ListingFormProps) => {
  const [petType, setPetType] = useState<PetType | "">(listing?.pet_type ?? "")
  const [gender, setGender] = useState<"male" | "female" | "">(
    listing?.gender ?? ""
  )
  const [sellerType, setSellerType] = useState<"individual" | "breeder">(
    listing?.seller_type ?? "individual"
  )
  const [photos, setPhotos] = useState<Photo[]>(
    (listing?.image_urls ?? []).map((url) => ({ key: url, preview: url, url }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const uploading = photos.some((p) => !p.url && !p.error)
  const failedPhotos = photos.some((p) => p.error)
  const needsRegistration = petType === "dog"
  const showRegistration = needsRegistration || sellerType === "breeder"

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (uploading) {
      setError("Please wait for the photos to finish uploading.")
      return
    }
    if (failedPhotos) {
      setError("Remove the photos marked in red before sending.")
      return
    }
    const form = new FormData(e.currentTarget)
    const text = (key: string) => String(form.get(key) ?? "").trim()
    const optional = (key: string) => text(key) || null
    const input: ListingInput = {
      title: text("title"),
      pet_type: petType as PetType,
      breed: text("breed"),
      gender: gender as "male" | "female",
      age_months:
        Number(form.get("age_years") || 0) * 12 +
        Number(form.get("age_extra_months") || 0),
      color: optional("color"),
      vaccinated: form.has("vaccinated"),
      dewormed: form.has("dewormed"),
      has_papers: form.has("has_papers"),
      description: optional("description"),
      price: Number(form.get("price")),
      price_negotiable: form.has("price_negotiable"),
      city: text("city"),
      state: text("state"),
      pincode: text("pincode"),
      image_urls: photos.map((p) => p.url!),
      seller_type: sellerType,
      breeder_registration_no: showRegistration
        ? optional("breeder_registration_no")
        : null,
      seller_phone: text("seller_phone"),
    }

    setSubmitting(true)
    setError(null)
    const result = listing
      ? await updateMatesListing(listing.id, input)
      : await createMatesListing(input)
    setSubmitting(false)
    if (result.error !== undefined) {
      setError(result.error)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    setSent(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (sent) {
    return (
      <Notice
        tone="success"
        title="Sent for review"
        action={{ href: "/mates/my", label: "Go to My Mates" }}
      >
        Our team checks every listing before it goes live, usually within a day.
        You can follow its status in My Mates
        {listing ? "" : ", and we will show it to buyers once it is approved"}.
      </Notice>
    )
  }

  const age = listing?.age_months ?? 0

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6"
      data-testid="mates-listing-form"
    >
      {error && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-4"
          role="alert"
          data-testid="mates-listing-error"
        >
          <Text className="text-rose-700">{error}</Text>
        </div>
      )}

      <Section title="Photos">
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </Section>

      <Section title="The pet">
        <Input
          label="Title"
          name="title"
          defaultValue={listing?.title}
          minLength={3}
          maxLength={120}
          required
        />
        <Chips
          name="pet_type"
          legend="Pet type"
          options={PET_TYPES}
          value={petType}
          onChange={setPetType}
        />
        <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
          <Input
            label="Breed"
            name="breed"
            defaultValue={listing?.breed}
            maxLength={80}
            required
          />
          <Input
            label="Colour (optional)"
            name="color"
            defaultValue={listing?.color ?? ""}
            maxLength={60}
          />
        </div>
        <Chips
          name="gender"
          legend="Gender"
          options={GENDERS}
          value={gender}
          onChange={setGender}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 txt-compact-medium-plus">
            Age<span className="text-rose-500">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Years"
              name="age_years"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              defaultValue={Math.floor(age / 12)}
              required
            />
            <Input
              label="Months"
              name="age_extra_months"
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              defaultValue={age % 12}
              required
            />
          </div>
        </fieldset>
        <div className="flex flex-col gap-3">
          <Check
            name="vaccinated"
            label="Vaccinated"
            defaultChecked={listing?.vaccinated}
          />
          <Check
            name="dewormed"
            label="Dewormed"
            defaultChecked={listing?.dewormed}
          />
          <Check
            name="has_papers"
            label="Has papers (pedigree or registration)"
            defaultChecked={listing?.has_papers}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="mates-description"
            className="txt-compact-medium-plus"
          >
            Description (optional)
          </Label>
          <textarea
            id="mates-description"
            name="description"
            rows={5}
            maxLength={5000}
            defaultValue={listing?.description ?? ""}
            className={textareaClass}
          />
        </div>
      </Section>

      <Section title="Price and location">
        <Input
          label="Price in ₹"
          name="price"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          defaultValue={listing?.price}
          required
        />
        <Check
          name="price_negotiable"
          label="Open to offers (negotiable)"
          defaultChecked={listing ? listing.price_negotiable : true}
        />
        <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
          <Input
            label="City"
            name="city"
            defaultValue={listing?.city}
            maxLength={80}
            required
          />
          <label className="flex flex-col gap-1">
            <span className="sr-only">State</span>
            <select
              name="state"
              defaultValue={listing?.state ?? ""}
              required
              className={selectClass}
              aria-label="State"
            >
              <option value="" disabled>
                State
              </option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="PIN code"
            name="pincode"
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            title="A 6 digit PIN code"
            defaultValue={listing?.pincode}
            required
          />
        </div>
      </Section>

      <Section title="About you">
        <Chips
          name="seller_type"
          legend="You are"
          options={[
            { value: "individual", label: "An individual owner" },
            { value: "breeder", label: "A breeder" },
          ]}
          value={sellerType}
          onChange={setSellerType}
        />
        {showRegistration && (
          <div className="flex flex-col gap-1">
            <Input
              label={
                needsRegistration
                  ? "Breeder registration number"
                  : "Breeder registration number (optional)"
              }
              name="breeder_registration_no"
              defaultValue={listing?.breeder_registration_no ?? ""}
              maxLength={80}
              required={needsRegistration}
            />
            {needsRegistration && (
              <Text className="text-xs text-ui-fg-subtle">
                Required for every dog listing, for example your KCI
                registration.
              </Text>
            )}
          </div>
        )}
        <Input
          label="Your phone"
          name="seller_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          pattern="[+\d][\d\s\-]{6,18}"
          title="Enter a valid phone number"
          defaultValue={listing?.seller_phone}
          required
        />
        <Text className="-mt-2 text-xs text-ui-fg-subtle">
          Never shown on your listing. Only the buyer whose offer you accept
          will see it.
        </Text>
      </Section>

      <div className="flex flex-col xsmall:flex-row xsmall:items-center gap-3">
        <Button
          type="submit"
          size="large"
          isLoading={submitting}
          disabled={uploading}
          className="w-full xsmall:w-auto"
          data-testid="mates-listing-submit"
        >
          {listing ? "Save and send for review" : "Send for review"}
        </Button>
        <Text
          className={clx(
            "text-small-regular",
            uploading ? "text-[#B23A1E]" : "text-ui-fg-subtle"
          )}
        >
          {uploading
            ? "Waiting for photos to upload..."
            : "Our team checks every listing before it goes live."}
        </Text>
      </div>
    </form>
  )
}

export default ListingForm
