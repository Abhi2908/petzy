import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"

export type UpdateMatesReportInput = { id: string; status: "open" | "resolved" }

const updateMatesReportStep = createStep(
  "update-mates-report",
  async (input: UpdateMatesReportInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const [before] = await mates.listMatesReports({ id: input.id })
    if (!before) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Report ${input.id} was not found`)
    }
    await mates.updateMatesReports(input)
    return new StepResponse(input.id, { id: before.id, status: before.status as "open" | "resolved" })
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.updateMatesReports(snapshot)
  }
)

export const updateMatesReportWorkflow = createWorkflow(
  "update-mates-report",
  (input: UpdateMatesReportInput) => {
    const id = updateMatesReportStep(input)
    return new WorkflowResponse(id)
  }
)
