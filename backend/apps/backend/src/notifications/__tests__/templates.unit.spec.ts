import {
  esc,
  indiaDateTime,
  insuranceLeadForAdmin,
  listingApproved,
  listingRejected,
  maskPhones,
  messageReceived,
  offerAccepted,
  offerCountered,
  offerReceived,
  offerRejected,
  orderConfirmation,
  RenderedEmail,
  vetBookedForCustomer,
  vetBookedForProvider,
  vetCancelledForCustomer,
} from "../templates"

const SELLER_PHONE = "+91 98111 22333"
const BUYER_PHONE = "+91 98222 44555"
const DIGITS = (phone: string) => phone.replace(/\D/g, "").slice(-10)
const all = (e: RenderedEmail) => `${e.subject}\n${e.html}\n${e.text}`

/** No form of the number (as typed, or just its digits) appears anywhere in the email. */
function expectNoPhone(email: RenderedEmail, phone: string) {
  const flat = all(email).replace(/[\s-]/g, "")
  expect(flat).not.toContain(phone.replace(/[\s-]/g, ""))
  expect(flat).not.toContain(DIGITS(phone))
}

const listing = { id: "matl_1", title: "Beagle puppy", price: 25000, city: "Pune", seller_phone: SELLER_PHONE }
const offer = { id: "mato_1", amount: 22000, buyer_phone: BUYER_PHONE }
const link = "https://petzy.example/in/mates/my/offers/mato_1"

describe("email layout helpers", () => {
  it("escapes HTML", () => {
    expect(esc(`<script>alert("x")</script> & 'y'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;")
  })

  it("hides phone-like numbers but keeps prices, PIN codes and short numbers", () => {
    expect(maskPhones("Call me on +91 98111 22333 or 9811122333!")).toBe("Call me on [number hidden] or [number hidden]!")
    expect(maskPhones("ring 098-111-22333 / (022) 2345 6789")).toBe("ring [number hidden] / [number hidden]")
    expect(maskPhones("Rs 35,000, PIN 411001, 3 months, 12 pups")).toBe("Rs 35,000, PIN 411001, 3 months, 12 pups")
  })

  it("shows India time whatever the server time zone", () => {
    expect(indiaDateTime("2026-10-12T05:00:00.000Z")).toBe("Mon, 12 Oct 2026, 10:30 am IST")
  })
})

describe("vet emails", () => {
  const appointment = {
    id: "vetapt_1",
    customer_name: "Asha <Rao>",
    customer_phone: "+91 98765 43210",
    customer_email: "asha@example.com",
    pet_name: "Bruno",
    pet_type: "dog",
    reason: "Limping",
    starts_at: "2026-10-12T05:00:00.000Z",
    provider: { name: "Dr. Anita Verma", clinic_name: "Paws & Care", city: "Pune", phone: "+91 90000 00001", consultation_fee: 500 },
  }

  it("tells the customer the vet, clinic, IST time and what to pay", () => {
    const email = vetBookedForCustomer(appointment)
    expect(email.subject).toBe("Vet appointment booked: Mon, 12 Oct 2026, 10:30 am IST")
    for (const part of ["Dr. Anita Verma", "Paws &amp; Care, Pune", "Mon, 12 Oct 2026, 10:30 am IST", "Pay Rs 500 at the clinic", "Asha &lt;Rao&gt;"]) {
      expect(email.html).toContain(part)
    }
    expect(email.text).toContain("Pay Rs 500 at the clinic")
    expect(email.html).toContain("#1F6F6B")
    expect(email.html).toContain('name="viewport"')
  })

  it("gives the clinic the customer's details", () => {
    const email = vetBookedForProvider(appointment)
    expect(email.text).toContain("Phone: +91 98765 43210")
    expect(email.text).toContain("Reason: Limping")
  })

  it("has a cancellation email", () => {
    expect(vetCancelledForCustomer(appointment).subject).toBe("Vet appointment cancelled: Mon, 12 Oct 2026, 10:30 am IST")
  })
})

describe("mates emails and phone numbers", () => {
  // Titles and messages that people typed with a phone number in them.
  const chattyListing = { ...listing, title: `Beagle, call ${SELLER_PHONE}` }

  const withoutPhones: [string, RenderedEmail][] = [
    ["offer received", offerReceived({ listing: chattyListing, offer, link })],
    ["offer countered", offerCountered({ listing: chattyListing, offer, link })],
    ["offer rejected", offerRejected({ listing: chattyListing, offer, link, why: "seller" })],
    ["offer closed", offerRejected({ listing: chattyListing, offer, link, why: "another_offer" })],
    ["message", messageReceived({ listing: chattyListing, body: `Hi! My number is ${BUYER_PHONE}, or 98222-44555.`, link })],
    ["listing approved", listingApproved({ listing: chattyListing, link })],
    ["listing rejected", listingRejected({ listing: chattyListing, reason: `Do not put ${SELLER_PHONE} in the title`, link })],
  ]

  it.each(withoutPhones)("leaves every phone number out of the %s email", (_, email) => {
    expectNoPhone(email, SELLER_PHONE)
    expectNoPhone(email, BUYER_PHONE)
  })

  it("shows the hidden-number marker where a typed number was removed", () => {
    expect(messageReceived({ listing, body: `Call ${BUYER_PHONE}`, link }).text).toContain("Call [number hidden]")
  })

  it("shows each side only the other side's phone when an offer is accepted", () => {
    const toBuyer = offerAccepted({ listing, offer, to: "buyer", link })
    expect(all(toBuyer)).toContain(`Call the seller to arrange the handover: ${SELLER_PHONE}`)
    expectNoPhone(toBuyer, BUYER_PHONE)

    const toSeller = offerAccepted({ listing, offer, to: "seller", link })
    expect(all(toSeller)).toContain(`Call the buyer to arrange the handover: ${BUYER_PHONE}`)
    expectNoPhone(toSeller, SELLER_PHONE)
  })

  it("says what happened, with amounts and the reason", () => {
    expect(offerReceived({ listing, offer, link }).subject).toBe("New offer of Rs 22,000 for Beagle puppy")
    expect(offerCountered({ listing, offer, link }).text).toContain("replied to your offer with Rs 22,000")
    expect(offerRejected({ listing, offer, link, why: "another_offer" }).text).toContain("accepted another buyer's offer")
    expect(listingRejected({ listing, reason: "Blurry photos", link }).text).toContain("Reason: Blurry photos")
    expect(listingRejected({ listing, reason: null, link }).text).toContain("Reason: No reason was given.")
    expect(offerReceived({ listing, offer, link }).html).toContain(`href="${link}"`)
  })

  it("escapes what sellers and buyers type", () => {
    const email = messageReceived({ listing: { ...listing, title: "<img src=x onerror=alert(1)>" }, body: "<script>x</script>", link })
    expect(email.html).not.toContain("<script>")
    expect(email.html).not.toContain("<img src=x")
    expect(email.html).toContain("&lt;script&gt;")
  })
})

describe("insurance and order emails", () => {
  it("gives staff the lead's details, escaped", () => {
    const email = insuranceLeadForAdmin({
      lead: {
        id: "insl_1",
        customer_name: "Ravi",
        phone: "+91 98000 11111",
        email: null,
        pet_name: "Kitty",
        pet_type: "cat",
        breed: null,
        pet_age_months: 30,
        city: "Pune",
        pincode: "411001",
        message: "<b>call after 6</b>",
        created_at: "2026-10-12T05:00:00.000Z",
        plan: { name: "Complete Care", annual_premium_from: 5499, partner: { name: "Example Co." } },
      },
      adminLink: "http://localhost:9000/app/insurance?tab=leads",
      receivedAt: "Mon, 12 Oct 2026, 10:30 am IST",
    })
    expect(email.subject).toBe("New insurance lead: Ravi for Complete Care")
    expect(email.text).toContain("Phone: +91 98000 11111")
    expect(email.text).toContain("Pet age: 2 years 6 months")
    expect(email.html).toContain("&lt;b&gt;call after 6&lt;/b&gt;")
    expect(email.text).not.toContain("Email:")
  })

  it("lists the order's items and totals in rupees", () => {
    const email = orderConfirmation({
      order: {
        id: "order_1",
        display_id: 1042,
        email: "asha@example.com",
        currency_code: "inr",
        items: [{ title: "Chicken Kibble", variant_title: "5 kg", quantity: 2, total: 2998 }],
        subtotal: 2998,
        shipping_total: 50,
        tax_total: 0,
        total: 3048,
        shipping_address: { first_name: "Asha", last_name: "Rao", address_1: "12 MG Road", city: "Pune", postal_code: "411001" },
      },
      link: "https://petzy.example/in/account/orders/details/order_1",
    })
    expect(email.subject).toBe("Order #1042 confirmed")
    expect(email.text).toContain("Chicken Kibble (5 kg) x 2: Rs 2,998")
    expect(email.text).toContain("Total: Rs 3,048")
    expect(email.text).toContain("12 MG Road")
    expect(email.html).toContain("#FF6B4A")
  })
})
