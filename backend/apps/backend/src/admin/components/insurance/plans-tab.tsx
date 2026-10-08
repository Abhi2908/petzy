import { Badge, Button, Checkbox, FocusModal, Input, Label, Select, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  formatAge,
  formatRupees,
  insuranceFetch,
  InsurancePartner,
  InsurancePlan,
  PET_TYPES,
  petTypesLabel,
} from "../../lib/insurance-api"
import { Field } from "./partners-tab"

export function PlansTab() {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [partnerId, setPartnerId] = useState("all")
  const [editing, setEditing] = useState<InsurancePlan | null>(null)
  const [adding, setAdding] = useState(false)

  const partners = useQuery({
    queryKey: ["insurance-partners"],
    queryFn: () => insuranceFetch<{ partners: InsurancePartner[] }>("/partners"),
  })
  const { data, isLoading, error } = useQuery({
    queryKey: ["insurance-plans", partnerId],
    queryFn: () => insuranceFetch<{ plans: InsurancePlan[] }>(`/plans${partnerId === "all" ? "" : `?partner_id=${partnerId}`}`),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["insurance-plans"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-partners"] })
    queryClient.invalidateQueries({ queryKey: ["insurance-leads"] })
  }

  const toggle = useMutation({
    mutationFn: (p: InsurancePlan) =>
      insuranceFetch(`/plans/${p.id}`, { method: "POST", body: { status: p.status === "active" ? "inactive" : "active" } }),
    onSuccess: (_, p) => {
      refresh()
      toast.success(p.status === "active" ? `${p.name} deactivated` : `${p.name} activated`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => insuranceFetch<{ leads_deleted: number }>(`/plans/${id}`, { method: "DELETE" }),
    onSuccess: (r) => {
      refresh()
      toast.success(`Plan deleted permanently, with ${r.leads_deleted} lead(s)`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmDelete = async (p: InsurancePlan) => {
    const ok = await prompt({
      title: `Delete ${p.name}?`,
      description: `This permanently deletes the plan and the ${p.lead_count ?? 0} customer lead(s) sent for it. It cannot be undone. To hide it but keep its leads, deactivate it instead.`,
      confirmText: "Delete plan and leads",
      cancelText: "Cancel",
    })
    if (ok) {
      remove.mutate(p.id)
    }
  }

  const plans = data?.plans ?? []
  const partnerList = partners.data?.partners ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4">
        <div className="flex w-64 flex-col gap-y-1">
          <Label size="small" weight="plus">Partner</Label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All partners</Select.Item>
              {partnerList.map((p) => <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        <Button size="small" onClick={() => setAdding(true)} disabled={!partnerList.length}>Add plan</Button>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !plans.length && !error && (
        <Text className="px-6 pb-6 text-ui-fg-subtle">{partnerList.length ? "No plans yet." : "Add a partner first, then its plans."}</Text>
      )}

      {plans.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Plan</Table.HeaderCell>
              <Table.HeaderCell>Pets and ages</Table.HeaderCell>
              <Table.HeaderCell>From / cover</Table.HeaderCell>
              <Table.HeaderCell>Leads</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {plans.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>{p.sort_order}</Table.Cell>
                <Table.Cell>
                  <div>{p.name}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{p.partner?.name}{p.partner?.status === "inactive" ? " (partner inactive)" : ""}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div>{petTypesLabel(p.pet_types)}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{formatAge(p.min_age_months)} to {formatAge(p.max_age_months)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div>{formatRupees(p.annual_premium_from)} / year</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">Cover {formatRupees(p.cover_amount)}</Text>
                </Table.Cell>
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
        <PlanModal
          key={editing?.id ?? "new"}
          plan={editing ?? undefined}
          partners={partnerList}
          defaultPartnerId={partnerId === "all" ? partnerList[0]?.id : partnerId}
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

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean)

function PlanModal({
  plan,
  partners,
  defaultPartnerId,
  onClose,
  onSaved,
}: {
  plan?: InsurancePlan
  partners: InsurancePartner[]
  defaultPartnerId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    partner_id: plan?.partner?.id ?? defaultPartnerId ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    min_age_months: String(plan?.min_age_months ?? 2),
    max_age_months: String(plan?.max_age_months ?? 120),
    annual_premium_from: String(plan?.annual_premium_from ?? ""),
    cover_amount: String(plan?.cover_amount ?? ""),
    highlights: (plan?.highlights ?? []).join("\n"),
    exclusions: (plan?.exclusions ?? []).join("\n"),
    status: plan?.status ?? "active",
    sort_order: String(plan?.sort_order ?? 0),
  })
  const [petTypes, setPetTypes] = useState<string[]>(plan?.pet_types ?? ["dog", "cat"])
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const save = useMutation({
    mutationFn: () => {
      const body = {
        partner_id: form.partner_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        pet_types: petTypes,
        min_age_months: Number(form.min_age_months),
        max_age_months: Number(form.max_age_months),
        annual_premium_from: Number(form.annual_premium_from),
        cover_amount: Number(form.cover_amount),
        highlights: lines(form.highlights),
        exclusions: lines(form.exclusions),
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      }
      return insuranceFetch(plan ? `/plans/${plan.id}` : "/plans", { method: "POST", body })
    },
    onSuccess: () => {
      onSaved()
      toast.success(plan ? "Plan updated" : "Plan added")
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const canSave = form.partner_id && form.name.trim() && form.annual_premium_from !== "" && form.cover_amount !== ""

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{plan ? "Edit plan" : "Add plan"}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Insurance plan details</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="grid w-full max-w-[680px] grid-cols-2 gap-4">
            <Field label="Partner *">
              <Select value={form.partner_id} onValueChange={set("partner_id")}>
                <Select.Trigger><Select.Value placeholder="Choose a partner" /></Select.Trigger>
                <Select.Content>
                  {partners.map((p) => <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>)}
                </Select.Content>
              </Select>
            </Field>
            <Field label="Plan name *"><Input value={form.name} onChange={(e) => set("name")(e.target.value)} /></Field>
            <div className="col-span-2">
              <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set("description")(e.target.value)} /></Field>
            </div>
            <div className="col-span-2 flex flex-col gap-y-2">
              <Label size="small" weight="plus">Pets covered *</Label>
              <div className="flex flex-wrap gap-4">
                {PET_TYPES.map((t) => (
                  <label key={t.value} className="flex items-center gap-x-2">
                    <Checkbox
                      checked={petTypes.includes(t.value)}
                      onCheckedChange={(checked) =>
                        setPetTypes((current) => (checked ? [...current, t.value] : current.filter((v) => v !== t.value)))
                      }
                    />
                    <Text size="small">{t.label}</Text>
                  </label>
                ))}
              </div>
            </div>
            <Field label={`Youngest age, months (${formatAge(Number(form.min_age_months) || 0)})`}>
              <Input type="number" min={0} max={360} value={form.min_age_months} onChange={(e) => set("min_age_months")(e.target.value)} />
            </Field>
            <Field label={`Oldest age, months (${formatAge(Number(form.max_age_months) || 0)})`}>
              <Input type="number" min={0} max={360} value={form.max_age_months} onChange={(e) => set("max_age_months")(e.target.value)} />
            </Field>
            <Field label="Yearly premium from (₹) *">
              <Input type="number" min={0} value={form.annual_premium_from} onChange={(e) => set("annual_premium_from")(e.target.value)} />
            </Field>
            <Field label="Cover amount (₹) *">
              <Input type="number" min={0} value={form.cover_amount} onChange={(e) => set("cover_amount")(e.target.value)} />
            </Field>
            <Field label="Highlights (one per line, up to 10)">
              <Textarea rows={4} value={form.highlights} onChange={(e) => set("highlights")(e.target.value)} />
            </Field>
            <Field label="Exclusions (one per line, up to 10)">
              <Textarea rows={4} value={form.exclusions} onChange={(e) => set("exclusions")(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={set("status")}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="active">Active (shown to customers)</Select.Item>
                  <Select.Item value="inactive">Inactive (hidden)</Select.Item>
                </Select.Content>
              </Select>
            </Field>
            <Field label="Order on the page (lower first)">
              <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order")(e.target.value)} />
            </Field>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild><Button variant="secondary">Cancel</Button></FocusModal.Close>
            <Button onClick={() => save.mutate()} disabled={!canSave} isLoading={save.isPending}>Save</Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
