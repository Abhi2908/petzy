import { Badge, Button, Label, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { formatDate, LISTING_STATUS_COLORS, LISTING_STATUS_LABELS, matesFetch, MatesReport } from "../../lib/mates-api"

export function ReportsTab() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("open")

  const params = new URLSearchParams({ limit: "100" })
  if (status !== "all") params.set("status", status)

  const { data, isLoading, error } = useQuery({
    queryKey: ["mates-reports", status],
    queryFn: () => matesFetch<{ reports: MatesReport[]; count: number }>(`/reports?${params.toString()}`),
  })
  const reports = data?.reports ?? []

  const update = useMutation({
    mutationFn: (input: { id: string; status: "open" | "resolved" }) =>
      matesFetch(`/reports/${input.id}`, { method: "POST", body: { status: input.status } }),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["mates-reports"] })
      queryClient.invalidateQueries({ queryKey: ["mates-listings"] })
      toast.success(input.status === "resolved" ? "Report resolved" : "Report reopened")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4">
        <div className="flex w-48 flex-col gap-y-1">
          <Label size="small" weight="plus">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="open">Open</Select.Item>
              <Select.Item value="resolved">Resolved</Select.Item>
              <Select.Item value="all">All</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <Text size="small" className="text-ui-fg-subtle">To act on a reported listing, open it in the Listings tab.</Text>
      </div>

      {error && <Text className="px-6 pb-4 text-ui-fg-error">{(error as Error).message}</Text>}
      {isLoading && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading...</Text>}
      {!isLoading && !reports.length && !error && <Text className="px-6 pb-6 text-ui-fg-subtle">No reports match this filter.</Text>}

      {reports.length > 0 && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Listing</Table.HeaderCell>
              <Table.HeaderCell>Reason</Table.HeaderCell>
              <Table.HeaderCell>Reported</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {reports.map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell>
                  <div>{r.listing?.title ?? "-"}</div>
                  {r.listing && (
                    <Badge size="2xsmall" color={LISTING_STATUS_COLORS[r.listing.status]}>{LISTING_STATUS_LABELS[r.listing.status]}</Badge>
                  )}
                </Table.Cell>
                <Table.Cell className="max-w-[360px] whitespace-normal">{r.reason}</Table.Cell>
                <Table.Cell>{formatDate(r.created_at)}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={r.status === "open" ? "orange" : "grey"}>{r.status === "open" ? "Open" : "Resolved"}</Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: r.id, status: r.status === "open" ? "resolved" : "open" })}
                  >
                    {r.status === "open" ? "Resolve" : "Reopen"}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}
