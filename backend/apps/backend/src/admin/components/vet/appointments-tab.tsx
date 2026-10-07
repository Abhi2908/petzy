import { Badge, Button, FocusModal, Input, Label, Select, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
  formatWhen,
  STATUS_COLORS,
  STATUS_LABELS,
  vetFetch,
  VetAppointment,
  VetProvider,
} from "../../lib/vet-api"

export function AppointmentsTab() {
  const [providerId, setProviderId] = useState("all")
  const [status, setStatus] = useState("active")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selected, setSelected] = useState<VetAppointment | null>(null)

  const providers = useQuery({
    queryKey: ["vet-providers"],
    queryFn: () => vetFetch<{ providers: VetProvider[] }>("/providers"),
  })

  const params = new URLSearchParams({ limit: "100" })
  if (providerId !== "all") params.set("provider_id", providerId)
  if (status === "active") params.set("status", "booked,confirmed")
  else if (status !== "all") params.set("status", status)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { data, isLoading, error } = useQuery({
    queryKey: ["vet-appointments", providerId, status, from, to],
    queryFn: () => vetFetch<{ appointments: VetAppointment[]; count: number }>(`/appointments?${params.toString()}`),
  })
  const appointments = data?.appointments ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 px-6 py-4">
        <div className="flex w-56 flex-col gap-y-1">
          <Label size="small" weight="plus">Provider</Label>
          <Select value={providerId} onValueChange={setProviderId}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All providers</Select.Item>
              {(providers.data?.providers ?? []).map((p) => <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        <div className="flex w-48 flex-col gap-y-1">
          <Label size="small" weight="plus">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="active">Booked and confirmed</Select.Item>
              <Select.Item value="all">All</Select.Item>
              {APPOINTMENT_STATUSES.map((s) => <Select.Item key={s} value={s}>{STATUS_LABELS[s]}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">From</Label>
          <Input type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small" weight="plus">To</Label>
          <Input type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !appointments.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No appointments match these filters.</Text>}

      {appointments.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>When (India time)</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Pet</Table.HeaderCell>
              <Table.HeaderCell>Reason</Table.HeaderCell>
              <Table.HeaderCell>Vet</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {appointments.map((a) => (
              <Table.Row key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
                <Table.Cell>{formatWhen(a.starts_at)}</Table.Cell>
                <Table.Cell>
                  <div>{a.customer_name}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{a.customer_phone}</Text>
                </Table.Cell>
                <Table.Cell>{a.pet_name} ({a.pet_type})</Table.Cell>
                <Table.Cell>{a.reason ?? "-"}</Table.Cell>
                <Table.Cell>{a.provider?.name}</Table.Cell>
                <Table.Cell><Badge size="2xsmall" color={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {selected && <AppointmentModal key={selected.id} appointment={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function AppointmentModal({ appointment, onClose }: { appointment: VetAppointment; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status)
  const [notes, setNotes] = useState(appointment.notes ?? "")

  const save = useMutation({
    mutationFn: () => vetFetch(`/appointments/${appointment.id}`, { method: "POST", body: { status, notes: notes.trim() || null } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vet-appointments"] })
      queryClient.invalidateQueries({ queryKey: ["vet-providers"] })
      toast.success("Appointment updated")
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{appointment.pet_name}: {formatWhen(appointment.starts_at)}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Appointment details</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[560px] flex-col gap-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Customer" value={appointment.customer_name} />
              <Detail label="Phone" value={appointment.customer_phone} />
              <Detail label="Email" value={appointment.customer_email ?? "-"} />
              <Detail label="Vet" value={`${appointment.provider?.name} (${appointment.provider?.clinic_name})`} />
              <Detail label="Pet" value={`${appointment.pet_name} (${appointment.pet_type})`} />
              <Detail label="Reason" value={appointment.reason ?? "-"} />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {APPOINTMENT_STATUSES.map((s) => <Select.Item key={s} value={s}>{STATUS_LABELS[s]}</Select.Item>)}
                </Select.Content>
              </Select>
              <Text size="xsmall" className="text-ui-fg-subtle">Cancelling frees the slot so another customer can book it.</Text>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">Internal notes (never shown to customers)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild><Button variant="secondary">Close</Button></FocusModal.Close>
            <Button onClick={() => save.mutate()} isLoading={save.isPending}>Save</Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xsmall" className="text-ui-fg-subtle">{label}</Text>
      <Text size="small">{value}</Text>
    </div>
  )
}
