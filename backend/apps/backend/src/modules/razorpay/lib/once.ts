// Razorpay can deliver the same webhook more than once (retries, or the same event on two webhooks). Each
// event is handled at most once: claim its id first, then process; if processing fails, release the claim
// so Razorpay's retry gets another go.

export type EventClaims = {
  /** Records the id. Resolves false when it was already recorded (a duplicate). */
  claim(eventId: string, event: string): Promise<boolean>
  release(eventId: string): Promise<void>
  finish(eventId: string, result: string): Promise<void>
}

export type OnceResult = { status: "processed"; result: string } | { status: "duplicate" }

export async function handleOnce(
  claims: EventClaims,
  eventId: string,
  event: string,
  handler: () => Promise<string>
): Promise<OnceResult> {
  if (!(await claims.claim(eventId, event))) {
    return { status: "duplicate" }
  }
  try {
    const result = await handler()
    await claims.finish(eventId, result)
    return { status: "processed", result }
  } catch (error) {
    await claims.release(eventId)
    throw error
  }
}
