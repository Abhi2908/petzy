import { Badge, Button, FocusModal, Label, Select, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  formatAge,
  formatDate,
  formatRupees,
  LISTING_STATUS_COLORS,
  LISTING_STATUS_LABELS,
  LISTING_STATUSES,
  matesFetch,
  MatesListing,
  OFFER_STATUS_LABELS,
} from "../../lib/mates-api"

export function ListingsTab() {
  const [status, setStatus] = useState("pending_review")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const params = new URLSearchParams({ limit: "100" })
  if (status !== "all") params.set("status", status)

  const { data, isLoading, error } = useQuery({
    queryKey: ["mates-listings", status],
    queryFn: () => matesFetch<{ listings: MatesListing[]; count: number }>(`/listings?${params.toString()}`),
  })
  const listings = data?.listings ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4">
        <div className="flex w-56 flex-col gap-y-1">
          <Label size="small" weight="plus">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              {LISTING_STATUSES.map((s) => <Select.Item key={s} value={s}>{LISTING_STATUS_LABELS[s]}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        <Text size="small" className="text-ui-fg-subtle">New and edited listings wait here until you approve them.</Text>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !listings.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No listings match this filter.</Text>}

      {listings.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Listing</Table.HeaderCell>
              <Table.HeaderCell>Seller phone</Table.HeaderCell>
              <Table.HeaderCell>Location</Table.HeaderCell>
              <Table.HeaderCell>Price</Table.HeaderCell>
              <Table.HeaderCell>Posted</Table.HeaderCell>
              <Table.HeaderCell>Reports</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {listings.map((l) => (
              <Table.Row key={l.id} className="cursor-pointer" onClick={() => setSelectedId(l.id)}>
                <Table.Cell>
                  <div>{l.title}</div>
                  <Text size="xsmall" className="text-ui-fg-subtle">{l.breed} ({l.pet_type}), {l.seller_type}</Text>
                </Table.Cell>
                <Table.Cell>{l.seller_phone}</Table.Cell>
                <Table.Cell>{l.city}, {l.state}</Table.Cell>
                <Table.Cell>{formatRupees(l.price)}{l.price_negotiable ? " (negotiable)" : ""}</Table.Cell>
                <Table.Cell>{formatDate(l.created_at)}</Table.Cell>
                <Table.Cell>{l.open_reports ? <Badge size="2xsmall" color="red">{l.open_reports} open</Badge> : "-"}</Table.Cell>
                <Table.Cell><Badge size="2xsmall" color={LISTING_STATUS_COLORS[l.status]}>{LISTING_STATUS_LABELS[l.status]}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {selectedId && <ListingModal key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function ListingModal({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [reason, setReason] = useState("")

  const { data, error } = useQuery({
    queryKey: ["mates-listing", id],
    queryFn: () => matesFetch<{ listing: MatesListing }>(`/listings/${id}`),
  })
  const listing = data?.listing

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mates-listings"] })
    queryClient.invalidateQueries({ queryKey: ["mates-listing", id] })
    queryClient.invalidateQueries({ queryKey: ["mates-offers"] })
    queryClient.invalidateQueries({ queryKey: ["mates-reports"] })
  }

  const act = useMutation({
    mutationFn: (action: "approve" | "reject" | "remove" | "delete") =>
      action === "delete"
        ? matesFetch(`/listings/${id}`, { method: "DELETE" })
        : matesFetch(`/listings/${id}/${action}`, { method: "POST", body: action === "reject" ? { reason: reason.trim() } : {} }),
    onSuccess: (_, action) => {
      refresh()
      const done = { approve: "Listing approved", reject: "Listing rejected", remove: "Listing removed", delete: "Listing deleted permanently" }
      toast.success(done[action])
      if (action === "delete") {
        onClose()
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirm = async (action: "remove" | "delete") => {
    const ok = await prompt(
      action === "delete"
        ? {
            title: "Delete this listing permanently?",
            description: "This removes the listing, every offer on it, their messages and its reports from the database. It cannot be undone.",
            confirmText: "Delete permanently",
            cancelText: "Cancel",
          }
        : {
            title: "Remove this listing?",
            description: "It disappears from the marketplace and every offer on it is closed. The record is kept for your history.",
            confirmText: "Remove",
            cancelText: "Cancel",
          }
    )
    if (ok) {
      act.mutate(action)
    }
  }

  const pending = listing?.status === "pending_review"

  return (
    <FocusModal open onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{listing?.title ?? "Listing"}</FocusModal.Title>
          <FocusModal.Description className="sr-only">Listing details and moderation</FocusModal.Description>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[720px] flex-col gap-y-6">
            {error && <Text className="text-ui-fg-error">{(error as Error).message}</Text>}
            {!listing && !error && <Text className="text-ui-fg-subtle">Loading...</Text>}
            {listing && (
              <>
                <div className="flex items-center gap-x-2">
                  <Badge color={LISTING_STATUS_COLORS[listing.status]}>{LISTING_STATUS_LABELS[listing.status]}</Badge>
                  {listing.expires_at && listing.status === "active" && (
                    <Text size="small" className="text-ui-fg-subtle">Expires {formatDate(listing.expires_at)}</Text>
                  )}
                </div>
                {listing.rejection_reason && (
                  <Text size="small" className="text-ui-fg-error">Rejected: {listing.rejection_reason}</Text>
                )}

                {listing.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {listing.image_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="h-24 w-24 rounded-md border object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Detail label="Pet" value={`${listing.breed} (${listing.pet_type}), ${listing.gender}`} />
                  <Detail label="Age" value={formatAge(listing.age_months)} />
                  <Detail label="Color" value={listing.color ?? "-"} />
                  <Detail label="Price" value={`${formatRupees(listing.price)}${listing.price_negotiable ? ", negotiable" : ""}`} />
                  <Detail label="Location" value={`${listing.city}, ${listing.state} ${listing.pincode}`} />
                  <Detail label="Health" value={[listing.vaccinated && "Vaccinated", listing.dewormed && "Dewormed", listing.has_papers && "Has papers"].filter(Boolean).join(", ") || "-"} />
                  <Detail label="Seller" value={listing.seller_type === "breeder" ? "Breeder" : "Individual"} />
                  <Detail label="Breeder registration" value={listing.breeder_registration_no ?? "-"} />
                  <Detail label="Seller phone" value={listing.seller_phone} />
                </div>
                {listing.description && <Text size="small" className="whitespace-pre-line">{listing.description}</Text>}

                {pending && (
                  <div className="flex flex-col gap-y-1">
                    <Label size="small" weight="plus">Reason for rejecting (shown to the seller)</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                  </div>
                )}

                <div className="flex flex-col gap-y-2">
                  <Label size="small" weight="plus">Offers ({listing.offers?.length ?? 0})</Label>
                  {(listing.offers ?? []).map((o) => (
                    <Text key={o.id} size="small">{formatRupees(o.amount)}: {OFFER_STATUS_LABELS[o.status]}, buyer phone {o.buyer_phone}</Text>
                  ))}
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label size="small" weight="plus">Reports ({listing.reports?.length ?? 0})</Label>
                  {(listing.reports ?? []).map((r) => (
                    <Text key={r.id} size="small">{r.status === "open" ? "Open" : "Resolved"}: {r.reason}</Text>
                  ))}
                </div>
              </>
            )}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex w-full items-center justify-between gap-x-2">
            <div className="flex gap-x-2">
              {listing && listing.status !== "removed" && (
                <Button variant="secondary" onClick={() => confirm("remove")} disabled={act.isPending}>Remove</Button>
              )}
              {listing && <Button variant="danger" onClick={() => confirm("delete")} disabled={act.isPending}>Delete</Button>}
            </div>
            <div className="flex gap-x-2">
              <FocusModal.Close asChild><Button variant="secondary">Close</Button></FocusModal.Close>
              {pending && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => (reason.trim() ? act.mutate("reject") : toast.error("Write a reason so the seller knows what to fix."))}
                    disabled={act.isPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => act.mutate("approve")} isLoading={act.isPending}>Approve</Button>
                </>
              )}
            </div>
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
