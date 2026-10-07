import { Button, FocusModal, Input, Label, Select, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { vetFetch, VetProvider, WEEKDAYS, WorkingHour } from "../../lib/vet-api"

const SLOT_OPTIONS = [15, 20, 30, 45, 60]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: VetProvider // omit to add a new provider
}

export function ProviderModal({ open, onOpenChange, provider }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(provider?.name ?? "")
  const [clinic, setClinic] = useState(provider?.clinic_name ?? "")
  const [city, setCity] = useState(provider?.city ?? "")
  const [phone, setPhone] = useState(provider?.phone ?? "")
  const [email, setEmail] = useState(provider?.email ?? "")
  const [specialties, setSpecialties] = useState(provider?.specialties ?? "")
  const [fee, setFee] = useState(String(provider?.consultation_fee ?? 0))
  const [slotMinutes, setSlotMinutes] = useState(String(provider?.slot_minutes ?? 30))
  const [status, setStatus] = useState<"active" | "inactive">(provider?.status ?? "active")
  const [hours, setHours] = useState<WorkingHour[]>(
    (provider?.working_hours ?? []).map((h) => ({ weekday: h.weekday, start_time: h.start_time, end_time: h.end_time }))
  )

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        clinic_name: clinic.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        specialties: specialties.trim() || null,
        consultation_fee: Number(fee) || 0,
        slot_minutes: Number(slotMinutes),
        status,
        working_hours: hours,
      }
      return provider
        ? vetFetch(`/providers/${provider.id}`, { method: "POST", body })
        : vetFetch("/providers", { method: "POST", body })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vet-providers"] })
      toast.success(provider ? "Provider updated" : "Provider added")
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateHour = (index: number, patch: Partial<WorkingHour>) =>
    setHours((current) => current.map((h, i) => (i === index ? { ...h, ...patch } : h)))

  const canSave = name.trim() && clinic.trim() && city.trim() && !save.isPending

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{provider ? "Edit vet provider" : "Add vet provider"}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Provider details and weekly working hours</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[680px] flex-col gap-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vet name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Meera Iyer" /></Field>
              <Field label="Clinic *"><Input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Paws & Care Clinic" /></Field>
              <Field label="City *"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Pune" /></Field>
              <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></Field>
              <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="clinic@example.com" /></Field>
              <Field label="Treats (comma separated)"><Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Dogs, Cats" /></Field>
              <Field label="Consultation fee (₹, paid at clinic)"><Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
              <Field label="Appointment length">
                <Select value={slotMinutes} onValueChange={setSlotMinutes}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    {SLOT_OPTIONS.map((m) => <Select.Item key={m} value={String(m)}>{m} minutes</Select.Item>)}
                  </Select.Content>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="active">Active (customers can book)</Select.Item>
                    <Select.Item value="inactive">Inactive (hidden from customers)</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
            </div>

            <div className="flex flex-col gap-y-3">
              <div>
                <Text weight="plus" size="small">Weekly working hours (India time)</Text>
                <Text size="small" className="text-ui-fg-subtle">Customers can book {slotMinutes} minute slots inside these hours. A day with no hours is closed.</Text>
              </div>
              {WEEKDAYS.map((day) => {
                const rows = hours.map((h, index) => ({ h, index })).filter(({ h }) => h.weekday === day.value)
                return (
                  <div key={day.value} className="flex items-start gap-x-4 border-t border-ui-border-base pt-3">
                    <Text size="small" weight="plus" className="w-24 pt-2">{day.label}</Text>
                    <div className="flex flex-1 flex-col gap-y-2">
                      {rows.length === 0 && <Text size="small" className="pt-2 text-ui-fg-muted">Closed</Text>}
                      {rows.map(({ h, index }) => (
                        <div key={index} className="flex items-center gap-x-2">
                          <Input type="time" size="small" value={h.start_time} onChange={(e) => updateHour(index, { start_time: e.target.value })} className="w-32" />
                          <Text size="small">to</Text>
                          <Input type="time" size="small" value={h.end_time} onChange={(e) => updateHour(index, { end_time: e.target.value })} className="w-32" />
                          <Button size="small" variant="transparent" onClick={() => setHours((c) => c.filter((_, i) => i !== index))}>Remove</Button>
                        </div>
                      ))}
                    </div>
                    <Button size="small" variant="secondary" onClick={() => setHours((c) => [...c, { weekday: day.value, start_time: "09:00", end_time: "17:00" }])}>
                      Add hours
                    </Button>
                  </div>
                )
              })}
            </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-y-1">
      <Label size="small" weight="plus">{label}</Label>
      {children}
    </div>
  )
}
