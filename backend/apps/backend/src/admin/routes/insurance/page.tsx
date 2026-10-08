import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Container, Heading, Tabs, Text } from "@medusajs/ui"
import { useSearchParams } from "react-router-dom"
import { LeadsTab } from "../../components/insurance/leads-tab"
import { PartnersTab } from "../../components/insurance/partners-tab"
import { PlansTab } from "../../components/insurance/plans-tab"

const TABS = ["partners", "plans", "leads"] as const
type Tab = (typeof TABS)[number]

const InsurancePage = () => {
  // The selected tab lives in the URL (?tab=leads), so the highlight and the content read one value and a
  // reload keeps the tab. No <Toaster /> here: the dashboard already renders one.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab") as Tab | null
  const tab: Tab = requested && TABS.includes(requested) ? requested : "partners"

  const selectTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Insurance</Heading>
        <Text size="small" className="text-ui-fg-subtle">Partner plans we list, and the customers we refer to them.</Text>
      </div>
      <Tabs value={tab} onValueChange={selectTab}>
        <div className="px-6 pt-2">
          <Tabs.List>
            <Tabs.Trigger value="partners">Partners</Tabs.Trigger>
            <Tabs.Trigger value="plans">Plans</Tabs.Trigger>
            <Tabs.Trigger value="leads">Leads</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="partners"><PartnersTab /></Tabs.Content>
        <Tabs.Content value="plans"><PlansTab /></Tabs.Content>
        <Tabs.Content value="leads"><LeadsTab /></Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Insurance",
  icon: ShieldCheck,
})

export default InsurancePage
