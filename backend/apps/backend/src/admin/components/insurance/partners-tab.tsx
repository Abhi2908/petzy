import { Badge, Button, FocusModal, Input, Label, Select, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { insuranceFetch, InsurancePartner } from "../../lib/insurance-api"

export function PartnersTab() {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [editing, setEditing] = useState<InsurancePartner | null>(null)
  const [adding, setAdding] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["insurance-partners"],
    queryFn: () => insuranceFetch<{ partners: InsurancePartner[] }>("/partners"),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["insurance-partners"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-plans"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-leads"] })
  }

  const toggle = useMutation({
    mutationFn: (p: InsurancePartner) =>
      insuranceFetch(`/partners/${p.id}`, { method: "POST", body: { status: p.status === "active" ? "inactive" : "active" } }),
    onSuccess: (_, p) => {
      refresh()
      toast.success(p.status === "active" ? `${p.name} deactivated: its plans are hidden from customers` : `${p.name} activated`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => insuranceFetch<{ plans_deleted: number; leads_deleted: number }>(`/partners/${id}`, { method: "DELETE" }),
    onSuccess: (r) => {
      refresh()
      toast.success(`Partner deleted permanently, with ${r.plans_deleted} plan(s) and ${r.leads_deleted} lead(s)`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmDelete = async (p: InsurancePartner) => {
    const ok = await prompt({
      title: `Delete ${p.name}?`,
      description: `This permanently deletes the partner, its ${p.plan_count ?? 0} plan(s) and the ${p.lead_count ?? 0} customer lead(s) sent for those plans. It cannot be undone. To hide the partner but keep its leads, deactivate it instead.`,
      confirmText: "Delete partner, plans and leads",
      cancelText: "Cancel",
    })
    if (ok) {
      remove.mutate(p.id)
    }
  }

  const partners = data?.partners ?? []

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">Insurers we refer customers to. Petzy does not sell insurance itself.</Text>
        <Button size="small" onClick={() => setAdding(true)}>Add partner</Button>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !partners.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No partners yet. Add one, then add its plans.</Text>}

      {partners.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Partner</Table.HeaderCell>
              <Table.HeaderCell>Contact</Table.HeaderCell>
              <Table.HeaderCell>Plans</Table.HeaderCell>
              <Table.HeaderCell>Leads</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {partners.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>
                  <div className="flex items-center gap-x-3">
                    {p.logo_url && <img src={p.logo_url} alt="" className="h-8 w-8 rounded object-contain" />}
                    <div>
                      <div>{p.name}</div>
                      {p.website_url && <Text size="xsmall" className="text-ui-fg-subtle">{p.website_url}</Text>}
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div>{p.contact_email ?? "-"}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{p.contact_phone ?? ""}</Text>
                </Table.Cell>
                <Table.Cell>{p.plan_count ?? 0}</Table.Cell>
                <Table.Cell>{p.lead_count ?? 0}</Table.Cell>
                <Table.Cell><Badge size="2xsmall" color={p.status === "active" ? "green" : "grey"}>{p.status === "active" ? "Active" : "Inactive"}</Badge></Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-x-2">
                    <Button size="small" variant="secondary" onClick={() => setEditing(p)}>Edit</Button>
                    <Button size="small" variant="secondary" onClick={() => toggle.mutate(p)} disabled={toggle.isPending}>
                      {p.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="small" variant="danger" onClick={() => confirmDelete(p)} disabled={remove.isPending}>Delete</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {(adding || editing) && (
        <PartnerModal
          key={editing?.id ?? "new"}
          partner={editing ?? undefined}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function PartnerModal({ partner, onClose, onSaved }: { partner?: InsurancePartner; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: partner?.name ?? "",
    logo_url: partner?.logo_url ?? "",
    website_url: partner?.website_url ?? "",
    contact_email: partner?.contact_email ?? "",
    contact_phone: partner?.contact_phone ?? "",
    notes: partner?.notes ?? "",
    status: partner?.status ?? "active",
  })
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || null,
        website_url: form.website_url.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      }
      return insuranceFetch(partner ? `/partners/${partner.id}` : "/partners", { method: "POST", body })
    },
    onSuccess: () => {
      onSaved()
      toast.success(partner ? "Partner updated" : "Partner added")
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{partner ? "Edit partner" : "Add partner"}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Insurance partner details</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="grid w-full max-w-[680px] grid-cols-2 gap-4">
            <Field label="Name *"><Input value={form.name} onChange={(e) => set("name")(e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={set("status")}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="active">Active (its active plans are shown)</Select.Item>
                  <Select.Item value="inactive">Inactive (all its plans hidden)</Select.Item>
                </Select.Content>
              </Select>
            </Field>
            <Field label="Website (https://...)"><Input value={form.website_url} onChange={(e) => set("website_url")(e.target.value)} /></Field>
            <Field label="Logo image link (https://...)"><Input value={form.logo_url} onChange={(e) => set("logo_url")(e.target.value)} /></Field>
            <Field label="Contact email (staff only)"><Input value={form.contact_email} onChange={(e) => set("contact_email")(e.target.value)} /></Field>
            <Field label="Contact phone (staff only)"><Input value={form.contact_phone} onChange={(e) => set("contact_phone")(e.target.value)} /></Field>
            <div className="col-span-2">
              <Field label="Notes (staff only)"><Textarea rows={4} value={form.notes} onChange={(e) => set("notes")(e.target.value)} /></Field>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild><Button variant="secondary">Cancel</Button></FocusModal.Close>
            <Button onClick={() => save.mutate()} disabled={!form.name.trim()} isLoading={save.isPending}>Save</Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-y-1">
      <Label size="small" weight="plus">{label}</Label>
      {children}
    </div>
  )
}
