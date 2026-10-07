import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../../modules/mates"
import MatesModuleService from "../../../../../../modules/mates/service"
import { publicReport } from "../../../../../../modules/mates/utils/serialize"
import { createMatesReportWorkflow } from "../../../../../../workflows/create-mates-report"
import { customerIdOf } from "../../../helpers"
import { CreateMatesReportBody } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<CreateMatesReportBody>, res: MedusaResponse) {
  const { result: id } = await createMatesReportWorkflow(req.scope).run({
    input: { listing_id: req.params.id, reporter_customer_id: customerIdOf(req), reason: req.validatedBody.reason },
  })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.status(201).json({ report: publicReport(await mates.retrieveMatesReport(id)) })
}
