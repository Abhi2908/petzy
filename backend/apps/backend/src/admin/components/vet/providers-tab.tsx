import { Badge, Button, Table, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { formatRupees, summariseHours, vetFetch, VetProvider } from "../../lib/vet-api"
import { ProviderModal } from "./provider-modal"

export function ProvidersTab() {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [editing, setEditing] = useState<VetProvider | null>(null)
  const [adding, setAdding] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["vet-providers"],
    queryFn: () => vetFetch<{ providers: VetProvider[] }>("/providers"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => vetFetch(`/providers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vet-providers"] })
      queryClient.invalidateQueries({ queryKey: ["vet-appointments"] })
      toast.success("Provider deleted permanently")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmDelete = async (provider: VetProvider) => {
    const ok = await prompt({
      title: `Delete ${provider.name}?`,
      description: "This permanently removes the provider, their working hours and their appointment history from the database. It cannot be undone.",
      confirmText: "Delete permanently",
      cancelText: "Cancel",
    })
    if (ok) {
      remove.mutate(provider.id)
    }
  }

  const providers = data?.providers ?? []

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">Vets and clinics customers can book. Customers pay at the clinic.</Text>
        <Button size="small" onClick={() => setAdding(true)}>Add provider</Button>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !providers.length && !error && (
        <Text className="px-6 pb-6 text-ui-fg-subtle">No vet providers yet. Add the first one to open bookings.</Text>
      )}

      {providers.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Vet</Table.HeaderCell>
              <Table.HeaderCell>Clinic</Table.HeaderCell>
              <Table.HeaderCell>City</Table.HeaderCell>
              <Table.HeaderCell>Fee</Table.HeaderCell>
              <Table.HeaderCell>Open days</Table.HeaderCell>
              <Table.HeaderCell>Upcoming</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {providers.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>
                  <div>{p.name}</div>
                  {p.specialties && <Text size="xsmall" className="text-ui-fg-subtle">{p.specialties}</Text>}
                </Table.Cell>
                <Table.Cell>{p.clinic_name}</Table.Cell>
                <Table.Cell>{p.city}</Table.Cell>
                <Table.Cell>{formatRupees(p.consultation_fee)}</Table.Cell>
                <Table.Cell>{summariseHours(p.working_hours)}</Table.Cell>
                <Table.Cell>{p.upcoming_appointments ?? 0}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={p.status === "active" ? "green" : "grey"}>{p.status === "active" ? "Active" : "Inactive"}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-x-2">
                    <Button size="small" variant="secondary" onClick={() => setEditing(p)}>Edit</Button>
                    <Button size="small" variant="danger" onClick={() => confirmDelete(p)}>Delete</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {adding && <ProviderModal open onOpenChange={(o) => !o && setAdding(false)} />}
      {editing && <ProviderModal key={editing.id} open provider={editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  )
}
