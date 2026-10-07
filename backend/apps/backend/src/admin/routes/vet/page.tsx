import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
import { Container, Heading, Tabs, Toaster } from "@medusajs/ui"
import { AppointmentsTab } from "../../components/vet/appointments-tab"
import { ProvidersTab } from "../../components/vet/providers-tab"

const VetPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Vet Providers</Heading>
      </div>
      <Tabs defaultValue="providers">
        <div className="px-6 pt-2">
          <Tabs.List>
            <Tabs.Trigger value="providers">Providers</Tabs.Trigger>
            <Tabs.Trigger value="appointments">Appointments</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="providers"><ProvidersTab /></Tabs.Content>
        <Tabs.Content value="appointments"><AppointmentsTab /></Tabs.Content>
      </Tabs>
      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Vet Providers",
  icon: Buildings,
})

export default VetPage
