import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../../../modules/mates"
import MatesModuleService from "../../../../../../../modules/mates/service"
import { ownListing } from "../../../../../../../modules/mates/utils/serialize"
import { releaseMatesReservationWorkflow } from "../../../../../../../workflows/release-mates-reservation"
import { getOwnListing } from "../../../../../../../workflows/steps/mates-helpers"
import { customerIdOf } from "../../../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = customerIdOf(req)
  await releaseMatesReservationWorkflow(req.scope).run({ input: { id: req.params.id, customer_id: customerId } })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.json({ listing: ownListing(await getOwnListing(mates, req.params.id, customerId)) })
}
