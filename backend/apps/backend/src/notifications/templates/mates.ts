import { button, callout, detailsTable, esc, maskPhones, paragraph, render, RenderedEmail, rupees } from "./layout"

// Mates emails. Phone rule: only the "offer accepted" email carries a phone number, and only the other
// person's. Everything else leaves phones out, and text people typed themselves (listing titles, messages,
// rejection reasons) goes through maskPhones() so a number typed into it is hidden too. The templates take
// the full records, phones included, so the unit tests can prove the numbers do not leak.

export type MatesListingRecord = {
  id: string
  title: string
  price: number
  city: string
  seller_phone: string
}

export type MatesOfferRecord = {
  id: string
  amount: number
  buyer_phone: string
}

const clean = (text: string) => maskPhones(text)
const FOOTER = "You are receiving this email because of your Mates activity on Petzy."

export function offerReceived(p: { listing: MatesListingRecord; offer: MatesOfferRecord; link: string }): RenderedEmail {
  const title = clean(p.listing.title)
  return render(
    `New offer of ${rupees(p.offer.amount)} for ${title}`,
    "You have a new offer",
    [
      paragraph(`A buyer offered ${rupees(p.offer.amount)} for "${title}" (your price: ${rupees(p.listing.price)}).`),
      paragraph("You can accept, counter or reject it on Petzy. Phone numbers are shared only once an offer is accepted."),
      button("View the offer", p.link),
    ],
    FOOTER
  )
}

export function offerCountered(p: { listing: MatesListingRecord; offer: MatesOfferRecord; link: string }): RenderedEmail {
  const title = clean(p.listing.title)
  return render(
    `The seller countered with ${rupees(p.offer.amount)}`,
    "The seller made a counter offer",
    [
      paragraph(`The seller of "${title}" replied to your offer with ${rupees(p.offer.amount)}.`),
      paragraph("You can accept it, make another counter offer or withdraw."),
      button("Reply to the seller", p.link),
    ],
    FOOTER
  )
}

export function offerRejected(p: {
  listing: MatesListingRecord
  offer: MatesOfferRecord
  link: string
  /** "seller": the seller turned it down. "another_offer": the seller accepted someone else's offer. */
  why: "seller" | "another_offer"
}): RenderedEmail {
  const title = clean(p.listing.title)
  const text =
    p.why === "another_offer"
      ? `The seller of "${title}" accepted another buyer's offer, so your offer of ${rupees(p.offer.amount)} has closed.`
      : `The seller of "${title}" declined your offer of ${rupees(p.offer.amount)}.`
  return render(
    `Your offer for ${title} was not accepted`,
    "Your offer was not accepted",
    [paragraph(text), paragraph("There are more pets looking for a home on Petzy Mates."), button("Browse Mates", p.link)],
    FOOTER
  )
}

/** Sent to both sides. `to` decides whose phone is shown: always the other person's. */
export function offerAccepted(p: {
  listing: MatesListingRecord
  offer: MatesOfferRecord
  to: "buyer" | "seller"
  link: string
}): RenderedEmail {
  const title = clean(p.listing.title)
  const other = p.to === "buyer" ? "seller" : "buyer"
  const otherPhone = p.to === "buyer" ? p.listing.seller_phone : p.offer.buyer_phone
  return render(
    `Offer accepted: ${title} for ${rupees(p.offer.amount)}`,
    "Offer accepted",
    [
      paragraph(
        p.to === "buyer"
          ? `Good news: your offer of ${rupees(p.offer.amount)} for "${title}" was accepted. The listing is now reserved for you.`
          : `You accepted ${rupees(p.offer.amount)} for "${title}". The listing is now reserved for this buyer.`
      ),
      callout(`Call the ${other} to arrange the handover: ${otherPhone}`),
      paragraph("Meet the pet in person and check its papers before paying."),
      button("View the offer", p.link),
    ],
    FOOTER
  )
}

export function messageReceived(p: { listing: MatesListingRecord; body: string; link: string }): RenderedEmail {
  const title = clean(p.listing.title)
  const preview = clean(p.body.length > 300 ? `${p.body.slice(0, 300)}...` : p.body)
  return render(
    `New message about ${title}`,
    "You have a new message",
    [
      paragraph(`A buyer wrote about "${title}":`),
      {
        html: `<blockquote style="margin:12px 0;padding:8px 16px;border-left:4px solid #FF6B4A;font-size:15px;line-height:1.5;white-space:pre-line">${esc(preview)}</blockquote>`,
        text: `"${preview}"`,
      },
      button("Reply on Petzy", p.link),
    ],
    FOOTER
  )
}

export function listingApproved(p: { listing: MatesListingRecord; link: string }): RenderedEmail {
  const title = clean(p.listing.title)
  return render(
    `Your listing is live: ${title}`,
    "Your listing is live",
    [
      paragraph(`"${title}" was approved and buyers can see it now. It stays up for 60 days.`),
      detailsTable([
        ["Price", rupees(p.listing.price)],
        ["City", p.listing.city],
      ]),
      button("See your listing", p.link),
    ],
    FOOTER
  )
}

export function listingRejected(p: { listing: MatesListingRecord; reason: string | null; link: string }): RenderedEmail {
  const title = clean(p.listing.title)
  return render(
    `Your listing needs changes: ${title}`,
    "Your listing was not approved",
    [
      paragraph(`Our team did not approve "${title}" yet.`),
      callout(`Reason: ${clean(p.reason?.trim() || "No reason was given.")}`),
      paragraph("Fix it and resubmit from My Mates, and we will check it again."),
      button("Go to My Mates", p.link),
    ],
    FOOTER
  )
}
