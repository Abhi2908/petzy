import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Runs a subscriber's notification work and swallows any error (a record that has gone, a lookup that
 * fails): it is logged, never thrown back into the event bus. sendEmail() is already safe; this covers the
 * loading around it.
 */
export async function runNotification(container: MedusaContainer, label: string, work: () => Promise<void>) {
  try {
    await work()
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).error(`Notification failed (${label}): ${(error as Error)?.message ?? error}`)
  }
}

/** A customer's email address, or null (for example the placeholder seller of the sample listings). */
export async function customerEmail(container: MedusaContainer, customerId: string): Promise<string | null> {
  const [customer] = await container.resolve(Modules.CUSTOMER).listCustomers({ id: customerId }, { select: ["email"] })
  return customer?.email ?? null
}

/** Medusa totals can come back as BigNumber objects; emails need plain numbers. */
export function toNumber(value: unknown): number {
  if (value && typeof value === "object") {
    const v = value as { numeric?: unknown; value?: unknown }
    return Number(v.numeric ?? v.value ?? String(value))
  }
  return Number(value ?? 0)
}
