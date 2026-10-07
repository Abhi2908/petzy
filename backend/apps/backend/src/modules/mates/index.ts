import { Module } from "@medusajs/framework/utils"
import MatesModuleService from "./service"

export const MATES_MODULE = "mates"

export default Module(MATES_MODULE, {
  service: MatesModuleService,
})
