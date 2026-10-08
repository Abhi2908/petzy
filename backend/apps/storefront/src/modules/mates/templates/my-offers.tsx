import { retrieveCustomer } from "@lib/data/customer"
import {
  listMyMatesOffers,
  listReceivedMatesOffers,
  MatesOffer,
  Result,
} from "@lib/data/mates"
import LoginPrompt from "@modules/mates/components/login-prompt"
import MyMatesNav from "@modules/mates/components/my-mates-nav"
import Notice from "@modules/mates/components/notice"
import OfferRow from "@modules/mates/components/offer-row"

// Offers needing an answer first, then live ones, then the rest, newest first within each group.
const rank = (o: MatesOffer) =>
  o.your_turn
    ? 0
    : o.status === "accepted"
    ? 1
    : o.status === "open" || o.status === "countered"
    ? 2
    : 3
const ordered = (offers: MatesOffer[]) =>
  [...offers].sort(
    (a, b) => rank(a) - rank(b) || b.updated_at.localeCompare(a.updated_at)
  )

const Group = ({
  title,
  result,
  empty,
}: {
  title: string
  result: Result<{ offers: MatesOffer[] }>
  empty: {
    title: string
    text: string
    action?: { href: string; label: string }
  }
}) => (
  <section className="flex flex-col gap-3" aria-label={title}>
    <h2 className="text-xl font-semibold">{title}</h2>
    {result.error !== undefined ? (
      <Notice tone="error" title="We could not load these offers." retry>
        {result.error}
      </Notice>
    ) : result.data.offers.length === 0 ? (
      <Notice tone="empty" title={empty.title} action={empty.action}>
        {empty.text}
      </Notice>
    ) : (
      <ul className="flex flex-col gap-3">
        {ordered(result.data.offers).map((o) => (
          <li key={o.id}>
            <OfferRow offer={o} />
          </li>
        ))}
      </ul>
    )}
  </section>
)

const MyOffersTemplate = async () => {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    return (
      <div className="content-container py-12 max-w-xl">
        <LoginPrompt title="Sign in to see your offers">
          Offers you made and offers on your listings appear here.
        </LoginPrompt>
      </div>
    )
  }

  const [received, made] = await Promise.all([
    listReceivedMatesOffers(),
    listMyMatesOffers(),
  ])
  const waiting = [
    ...(received.data?.offers ?? []),
    ...(made.data?.offers ?? []),
  ].filter((o) => o.your_turn).length

  return (
    <div
      className="content-container py-6 small:py-12"
      data-testid="mates-my-offers"
    >
      <MyMatesNav active="offers" waiting={waiting} />
      <div className="grid grid-cols-1 medium:grid-cols-2 gap-8">
        <Group
          title="Offers on your listings"
          result={received}
          empty={{
            title: "No offers yet.",
            text: "When buyers make offers on your listings they show up here.",
          }}
        />
        <Group
          title="Offers you made"
          result={made}
          empty={{
            title: "You have not made any offers.",
            text: "Find a pet and make the seller an offer.",
            action: { href: "/mates", label: "Browse Mates" },
          }}
        />
      </div>
    </div>
  )
}

export default MyOffersTemplate
