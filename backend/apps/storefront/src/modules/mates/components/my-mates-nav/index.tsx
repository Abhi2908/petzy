import { Button, clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Header of the "My Mates" area: the two sections and a shortcut to post.
const MyMatesNav = ({
  active,
  waiting,
}: {
  active: "listings" | "offers"
  waiting?: number
}) => {
  const tab = (key: "listings" | "offers", href: string, label: string) => (
    <LocalizedClientLink
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={clx(
        "rounded-full px-4 py-2 text-small-regular border transition-colors",
        active === key
          ? "bg-petzy-teal border-petzy-teal text-white"
          : "bg-white border-petzy-border text-petzy-teal hover:border-petzy-coral"
      )}
    >
      {label}
    </LocalizedClientLink>
  )
  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">My Mates</h1>
        <LocalizedClientLink href="/mates/new">
          <Button>Post a listing</Button>
        </LocalizedClientLink>
      </div>
      <nav className="flex gap-2" aria-label="My Mates sections">
        {tab("listings", "/mates/my", "My listings")}
        {tab(
          "offers",
          "/mates/my/offers",
          waiting ? `Offers (${waiting} waiting for you)` : "Offers"
        )}
      </nav>
    </div>
  )
}

export default MyMatesNav
