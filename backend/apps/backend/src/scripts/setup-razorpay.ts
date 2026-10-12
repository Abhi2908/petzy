/**
 * Offers Razorpay ("Pay online") in every INR region, and takes Medusa's manual test provider
 * (pp_system_default) out of those regions so customers cannot place unpaid orders.
 *
 *   npm run setup:razorpay                    # Razorpay only in INR regions
 *   npm run setup:razorpay -- keep-manual     # Razorpay and the manual test provider (for development)
 *
 * It only changes regions when the Razorpay provider is actually loaded (RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET set and the backend restarted); otherwise removing the manual provider would leave
 * the region with no way to pay. Safe to re-run. Other regions are not touched.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { RAZORPAY_PROVIDER_ID } from "../modules/razorpay/lib/config"

const MANUAL = "pp_system_default"

export default async function setupRazorpay({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const keepManual = (args ?? []).includes("keep-manual")

  const [provider] = await container.resolve(Modules.PAYMENT).listPaymentProviders({ id: RAZORPAY_PROVIDER_ID })
  if (!provider?.is_enabled) {
    logger.error("Razorpay is not loaded. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env, restart the backend, then run this again. No region was changed.")
    return
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
    filters: { currency_code: "inr" },
  })
  if (!regions.length) {
    logger.error("There is no INR region yet. Run npm run seed:petzy first.")
    return
  }

  for (const region of regions) {
    const wanted = keepManual ? [RAZORPAY_PROVIDER_ID, MANUAL] : [RAZORPAY_PROVIDER_ID]
    const current = (region.payment_providers ?? []).map((p) => p?.id).filter(Boolean) as string[]
    // Keep any other providers already on the region; only the manual one is removed (unless kept).
    const next = [...new Set([...current.filter((id) => id !== MANUAL), ...wanted])]
    if (next.length === current.length && next.every((id) => current.includes(id))) {
      logger.info(`${region.name}: already set (${current.join(", ")}).`)
      continue
    }
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: region.id }, update: { payment_providers: next } },
    })
    logger.info(`${region.name}: payment providers are now ${next.join(", ")}.`)
  }
}
