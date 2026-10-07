import { Badge, Button, FocusModal, Label, Select, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  formatDate,
  formatRupees,
  matesFetch,
  MatesOffer,
  OFFER_STATUS_COLORS,
  OFFER_STATUS_LABELS,
  OFFER_STATUSES,
} from "../../lib/mates-api"

// Read-only: offers are negotiated by customers. Admin can look, including both phone numbers.
export function OffersTab() {
  const [status, setStatus] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const params = new URLSearchParams({ limit: "100" })
  if (status !== "all") params.set("status", status)

  const { data, isLoading, error } = useQuery({
    queryKey: ["mates-offers", status],
    queryFn: () => matesFetch<{ offers: MatesOffer[]; count: number }>(`/offers?${params.toString()}`),
  })
  const offers = data?.offers ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 px-6 py-4">
        <div className="flex w-56 flex-col gap-y-1">
          <Label size="small" weight="plus">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              {OFFER_STATUSES.map((s) => <Select.Item key={s} value={s}>{OFFER_STATUS_LABELS[s]}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !offers.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No offers match this filter.</Text>}

      {offers.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Listing</Table.HeaderCell>
              <Table.HeaderCell>Offer</Table.HeaderCell>
              <Table.HeaderCell>Buyer phone</Table.HeaderCell>
              <Table.HeaderCell>Seller phone</Table.HeaderCell>
              <Table.HeaderCell>Last move</Table.HeaderCell>
              <Table.HeaderCell>Updated</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {offers.map((o) => (
              <Table.Row key={o.id} className="cursor-pointer" onClick={() => setSelectedId(o.id)}>
                <Table.Cell>
                  <div>{o.listing?.title ?? "-"}</div>
                  {o.listing && <Text size="xsmall" className="text-ui-fg-subtle">Asking {formatRupees(o.listing.price)}</Text>}
                </Table.Cell>
                <Table.Cell>{formatRupees(o.amount)}</Table.Cell>
                <Table.Cell>{o.buyer_phone}</Table.Cell>
                <Table.Cell>{o.listing?.seller_phone ?? "-"}</Table.Cell>
                <Table.Cell>{o.last_actor === "buyer" ? "Buyer" : "Seller"}</Table.Cell>
                <Table.Cell>{formatDate(o.updated_at)}</Table.Cell>
                <Table.Cell><Badge size="2xsmall" color={OFFER_STATUS_COLORS[o.status]}>{OFFER_STATUS_LABELS[o.status]}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {selectedId && <OfferModal key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function OfferModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error } = useQuery({
    queryKey: ["mates-offer", id],
    queryFn: () => matesFetch<{ offer: MatesOffer }>(`/offers/${id}`),
  })
  const offer = data?.offer
  const messages = [...(offer?.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{offer ? `${formatRupees(offer.amount)} for ${offer.listing?.title ?? "listing"}` : "Offer"}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Offer details and messages</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[560px] flex-col gap-y-4">
            {error && <Text className="text-ui-fg-error">{(error as Error).message}</Text>}
            {offer && (
              <>
                <Badge className="self-start" color={OFFER_STATUS_COLORS[offer.status]}>{OFFER_STATUS_LABELS[offer.status]}</Badge>
                <Text size="small">Buyer phone: {offer.buyer_phone}. Seller phone: {offer.listing?.seller_phone ?? "-"}</Text>
                <Label size="small" weight="plus">Messages ({messages.length})</Label>
                {!messages.length && <Text size="small" className="text-ui-fg-subtle">No messages yet.</Text>}
                {messages.map((m) => (
                  <div key={m.id} className={m.sender === "buyer" ? "self-start" : "self-end text-right"}>
                    <Text size="xsmall" className="text-ui-fg-subtle">{m.sender === "buyer" ? "Buyer" : "Seller"}, {formatDate(m.created_at)}</Text>
                    <Text size="small" className="bg-ui-bg-subtle rounded-md px-3 py-2">{m.body}</Text>
                  </div>
                ))}
              </>
            )}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <FocusModal.Close asChild><Button variant="secondary">Close</Button></FocusModal.Close>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
