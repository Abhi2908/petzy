"use client"

import { MatesMessage, postMatesMessage, Side } from "@lib/data/mates"
import { formatDateTime } from "@lib/util/mates-format"
import { Button, clx, Text } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

type MessageThreadProps = {
  offerId: string
  side: Side
  messages: MatesMessage[] | null
  loadError?: string
  canPost: boolean
}

const MessageThread = ({
  offerId,
  side,
  messages,
  loadError,
  canPost,
}: MessageThreadProps) => {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const other = side === "buyer" ? "Seller" : "Buyer"

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const body = String(new FormData(form).get("body") ?? "").trim()
    if (!body) {
      return
    }
    setSending(true)
    setError(null)
    const result = await postMatesMessage(offerId, body)
    setSending(false)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    form.reset()
    router.refresh()
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-large border border-petzy-border bg-white p-4 small:p-5"
      aria-label="Messages"
      data-testid="mates-thread"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Messages</h2>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-small-regular text-petzy-teal underline underline-offset-2"
        >
          Refresh
        </button>
      </div>

      {loadError ? (
        <Text className="text-small-regular text-rose-700" role="alert">
          We could not load the messages. {loadError}
        </Text>
      ) : !messages?.length ? (
        <Text className="text-small-regular text-ui-fg-subtle">
          No messages yet. Ask a question or arrange a visit.
        </Text>
      ) : (
        <ol className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.sender === side
            return (
              <li
                key={m.id}
                className={clx(
                  "flex flex-col max-w-[85%]",
                  mine ? "self-end items-end" : "self-start items-start"
                )}
              >
                <span className="text-xs text-ui-fg-subtle">
                  {mine ? "You" : other}, {formatDateTime(m.created_at)}
                </span>
                <p
                  className={clx(
                    "mt-1 whitespace-pre-line rounded-large px-3 py-2 text-small-regular",
                    mine
                      ? "bg-petzy-teal text-white"
                      : "bg-petzy-canvas text-ui-fg-base border border-petzy-border"
                  )}
                >
                  {m.body}
                </p>
              </li>
            )
          })}
        </ol>
      )}

      {canPost ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="mates-message" className="sr-only">
            Write a message
          </label>
          <textarea
            id="mates-message"
            name="body"
            rows={2}
            maxLength={1000}
            required
            placeholder="Write a message"
            className="block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium focus:outline-none focus:shadow-borders-interactive-with-active"
          />
          {error && (
            <Text className="text-small-regular text-rose-700" role="alert">
              {error}
            </Text>
          )}
          <Button
            type="submit"
            size="small"
            className="self-end"
            isLoading={sending}
          >
            Send
          </Button>
        </form>
      ) : (
        <Text className="text-small-regular text-ui-fg-subtle">
          This offer is closed, so the conversation is read only.
        </Text>
      )}
    </section>
  )
}

export default MessageThread
