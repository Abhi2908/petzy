import { MedusaError } from "@medusajs/framework/utils"
import MatesModuleService from "../../modules/mates/service"
import { ListingStatus, OfferStatus, Side } from "../../modules/mates/utils/rules"

export { isUniqueViolation } from "./vet-helpers"

/** A listing by id, or NOT_FOUND. */
export async function getListing(mates: MatesModuleService, id: string) {
  const [listing] = await mates.listMatesListings({ id })
  if (!listing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Listing ${id} was not found`)
  }
  return listing
}

/** A listing owned by the customer. Someone else's listing answers NOT_FOUND, so ids cannot be probed. */
export async function getOwnListing(mates: MatesModuleService, id: string, customerId: string) {
  const [listing] = await mates.listMatesListings({ id, seller_customer_id: customerId })
  if (!listing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Listing ${id} was not found`)
  }
  return listing
}

/**
 * Moves a listing to a new status only if it is still in one of the expected statuses, so two requests
 * racing on the same listing cannot both win. Returns false when the listing had already moved on.
 */
export async function moveListing(
  mates: MatesModuleService,
  id: string,
  from: ListingStatus[],
  data: Record<string, unknown>
): Promise<boolean> {
  const updated = await mates.updateMatesListings({ selector: { id, status: from }, data })
  return updated.length > 0
}

/** Same idea for one offer. */
export async function moveOffer(
  mates: MatesModuleService,
  id: string,
  from: OfferStatus,
  data: Record<string, unknown>
): Promise<boolean> {
  const updated = await mates.updateMatesOffers({ selector: { id, status: from }, data })
  return updated.length > 0
}

export type OfferSnapshot = { id: string; status: OfferStatus; last_actor: Side }

/**
 * Closes offers on a listing: live ones become rejected and, when `includeAccepted` is set, an accepted
 * one becomes withdrawn. Returns what changed so a compensation can put it back.
 */
export async function closeOffers(
  mates: MatesModuleService,
  listingId: string,
  options: { exceptId?: string; includeAccepted?: boolean } = {}
): Promise<OfferSnapshot[]> {
  const statuses: OfferStatus[] = options.includeAccepted ? ["open", "countered", "accepted"] : ["open", "countered"]
  const offers = await mates.listMatesOffers({ listing_id: listingId, status: statuses })
  const toClose = offers.filter((o) => o.id !== options.exceptId)
  for (const offer of toClose) {
    await mates.updateMatesOffers({
      id: offer.id,
      status: offer.status === "accepted" ? "withdrawn" : "rejected",
      last_actor: "seller",
    })
  }
  return toClose.map((o) => ({ id: o.id, status: o.status as OfferStatus, last_actor: o.last_actor as Side }))
}

export async function restoreOffers(mates: MatesModuleService, snapshots: OfferSnapshot[]) {
  for (const s of snapshots) {
    await mates.updateMatesOffers(s)
  }
}

/** Permanently removes a listing with all of its offers, their messages and its reports. */
export async function hardDeleteListing(mates: MatesModuleService, id: string) {
  const offers = await mates.listMatesOffers({ listing_id: id }, { select: ["id"] })
  const offerIds = offers.map((o) => o.id)
  if (offerIds.length) {
    await mates.deleteMatesMessages({ offer_id: offerIds })
    await mates.deleteMatesOffers(offerIds)
  }
  await mates.deleteMatesReports({ listing_id: id })
  await mates.deleteMatesListings(id)
}
