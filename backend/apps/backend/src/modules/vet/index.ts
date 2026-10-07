import { Module } from "@medusajs/framework/utils"
import VetModuleService from "./service"

export const VET_MODULE = "vet"

export default Module(VET_MODULE, {
  service: VetModuleService,
})
