import { Badge, Button, FocusModal, Label, Select, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  downloadLeadsCsv,
  formatAge,
  formatWhen,
  insuranceFetch,
  InsuranceLead,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  LeadStatus,
} from "../../lib/insurance-api"

export function LeadsTab() {
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<InsuranceLead | null>(null)
  const [exporting, setExporting] = useState(false)

  const query = status === "all" ? "" : `status=${status}`
  const { data, isLoading, error } = useQuery({
    queryKey: ["insurance-leads", status],
    queryFn: () => insuranceFetch<{ leads: InsuranceLead[]; count: number }>(`/leads?limit=200${query ? `&${query}` : ""}`),
  })
  const leads = data?.leads ?? []

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadLeadsCsv(query)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4">
        <div className="flex w-56 flex-col gap-y-1">
          <Label size="small" weight="plus">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              {LEAD_STATUSES.map((s) => <Select.Item key={s} value={s}>{LEAD_STATUS_LABELS[s]}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center gap-x-3">
          {data && <Text size="small" className="text-ui-fg-subtle">{data.count} lead(s)</Text>}
          <Button size="small" variant="secondary" onClick={exportCsv} isLoading={exporting} disabled={!data?.count}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !leads.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No leads match this filter.</Text>}

      {leads.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Received (India time)</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Pet</Table.HeaderCell>
              <Table.HeaderCell>Plan</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {leads.map((l) => (
              <Table.Row key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                <Table.Cell>{formatWhen(l.created_at)}</Table.Cell>
                <Table.Cell>
                  <div>{l.customer_name}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{l.phone}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div>{l.pet_name ? `${l.pet_name} (${l.pet_type})` : l.pet_type}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{[l.breed, formatAge(l.pet_age_months)].filter(Boolean).join(", ")}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div>{l.plan?.name}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{l.plan?.partner?.name}</Text>
                </Table.Cell>
                <Table.Cell><Badge size="2xsmall" color={LEAD_STATUS_COLORS[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {selected && <LeadModal key={selected.id} lead={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function LeadModal({ lead, onClose }: { lead: InsuranceLead; onClose: () => void }) {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.internal_notes ?? "")

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["insurance-leads"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-partners"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-plans"] })
  }

  const save = useMutation({
    mutationFn: () => insuranceFetch(`/leads/${lead.id}`, { method: "POST", body: { status, internal_notes: notes.trim() || null } }),
    onSuccess: () => {
      refresh()
      toast.success("Lead updated")
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => insuranceFetch(`/leads/${lead.id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh()
      toast.success("Lead deleted permanently")
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmDelete = async () => {
    const ok = await prompt({
      title: `Delete the lead from ${lead.customer_name}?`,
      description: "This permanently removes the customer's details and your notes. It cannot be undone.",
      confirmText: "Delete permanently",
      cancelText: "Cancel",
    })
    if (ok) {
      remove.mutate()
    }
  }

  const details: [string, string][] = [
    ["Customer", lead.customer_name],
    ["Phone", lead.phone],
    ["Email", lead.email ?? "-"],
    ["Pet", `${lead.pet_name ?? "-"} (${lead.pet_type}${lead.breed ? `, ${lead.breed}` : ""})`],
    ["Pet age", formatAge(lead.pet_age_months)],
    ["Location", [lead.city, lead.pincode].filter(Boolean).join(" ") || "-"],
    ["Plan", `${lead.plan?.name} (${lead.plan?.partner?.name})`],
    ["Received", formatWhen(lead.created_at)],
  ]

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Lead from {lead.customer_name}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Insurance lead details</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[560px] flex-col gap-y-6">
            <div className="grid grid-cols-2 gap-4">
              {details.map(([label, value]) => (
                <div key={label}>
                  <Text size="xsmall" className="text-ui-fg-subtle">{label}</Text>
                  <Text size="small">{value}</Text>
                </div>
              ))}
            </div>
            {lead.message && (
              <div>
                <Text size="xsmall" className="text-ui-fg-subtle">Message from the customer</Text>
                <Text size="small" className="whitespace-pre-line">{lead.message}</Text>
              </div>
            )}
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {LEAD_STATUSES.map((s) => <Select.Item key={s} value={s}>{LEAD_STATUS_LABELS[s]}</Select.Item>)}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">Internal notes (never shown to the customer)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex w-full items-center justify-between gap-x-2">
            <Button variant="danger" onClick={confirmDelete} disabled={remove.isPending}>Delete</Button>
            <div className="flex gap-x-2">
              <FocusModal.Close asChild><Button variant="secondary">Close</Button></FocusModal.Close>
              <Button onClick={() => save.mutate()} isLoading={save.isPending}>Save</Button>
            </div>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
