import { Module } from "@medusajs/framework/utils"
import InsuranceModuleService from "./service"

export const INSURANCE_MODULE = "insurance"

export default Module(INSURANCE_MODULE, {
  service: InsuranceModuleService,
})
