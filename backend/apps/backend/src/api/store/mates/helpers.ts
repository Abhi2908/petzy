import { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { MATES_MODULE } from "../../../modules/mates"
import MatesModuleService from "../../../modules/mates/service"
import { sideOf } from "../../../modules/mates/utils/rules"
import { offerForSide } from "../../../modules/mates/utils/serialize"

/** The logged-in customer's id. The authenticate middleware guarantees it is set. */
export function customerIdOf(req: AuthenticatedMedusaRequest): string {
  return req.auth_context.actor_id
}

/** One offer shaped for the customer asking. Customers who are not part of it get NOT_FOUND. */
export async function offerViewFor(scope: MedusaContainer, offerId: string, customerId: string) {
  const mates: MatesModuleService = scope.resolve(MATES_MODULE)
  const [offer] = await mates.listMatesOffers({ id: offerId }, { relations: ["listing"] })
  const side = offer ? sideOf(customerId, offer, offer.listing) : null
  if (!offer || !side) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Offer ${offerId} was not found`)
  }
  return offerForSide(offer, offer.listing, side)
}
