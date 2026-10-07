/**
 * Marks active Mates listings whose 60 days have passed as expired, and rejects offers still waiting on them.
 *
 *   npm run expire:mates
 *
 * Safe to run as often as you like, for example once a day from cron. Listings past expires_at are
 * already hidden from the marketplace before this runs; this script makes their status match.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { expireMatesListingsWorkflow } from "../workflows/expire-mates-listings"

export default async function expireMatesListings({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { result } = await expireMatesListingsWorkflow(container).run({ input: {} })
  logger.info(result.length ? `Expired ${result.length} Mates listing(s): ${result.join(", ")}` : "No Mates listings to expire.")
}
