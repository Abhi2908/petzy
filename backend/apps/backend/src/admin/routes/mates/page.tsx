import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heart } from "@medusajs/icons"
import { Container, Heading, Tabs } from "@medusajs/ui"
import { useSearchParams } from "react-router-dom"
import { ListingsTab } from "../../components/mates/listings-tab"
import { OffersTab } from "../../components/mates/offers-tab"
import { ReportsTab } from "../../components/mates/reports-tab"

const TABS = ["listings", "reports", "offers"] as const
type Tab = (typeof TABS)[number]

const MatesPage = () => {
  // The selected tab lives in the URL (?tab=reports), and both the highlighted trigger and the content
  // read that one value, so they cannot drift apart. A reload or a shared link opens the same tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab") as Tab | null
  const tab: Tab = requested && TABS.includes(requested) ? requested : "listings"

  const selectTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  // No <Toaster /> here: the dashboard already renders one, and a second copy shows every toast twice.
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Mates</Heading>
      </div>
      <Tabs value={tab} onValueChange={selectTab}>
        <div className="px-6 pt-2">
          <Tabs.List>
            <Tabs.Trigger value="listings">Listings</Tabs.Trigger>
            <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
            <Tabs.Trigger value="offers">Offers</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="listings"><ListingsTab /></Tabs.Content>
        <Tabs.Content value="reports"><ReportsTab /></Tabs.Content>
        <Tabs.Content value="offers"><OffersTab /></Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Mates",
  icon: Heart,
})

export default MatesPage
