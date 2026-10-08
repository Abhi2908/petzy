import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import LogNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [LogNotificationProviderService],
})
