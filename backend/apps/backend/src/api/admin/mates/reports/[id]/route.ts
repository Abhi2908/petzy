import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { updateMatesReportWorkflow } from "../../../../../workflows/update-mates-report"
import { UpdateMatesReportBody } from "../../validators"

export async function POST(req: MedusaRequest<UpdateMatesReportBody>, res: MedusaResponse) {
  await updateMatesReportWorkflow(req.scope).run({ input: { id: req.params.id, status: req.validatedBody.status } })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.json({ report: await mates.retrieveMatesReport(req.params.id, { relations: ["listing"] }) })
}
