import { Module } from "@medusajs/framework/utils"
import RazorpayWebhooksModuleService from "./service"

export const RAZORPAY_WEBHOOKS_MODULE = "razorpay_webhooks"

export default Module(RAZORPAY_WEBHOOKS_MODULE, {
  service: RazorpayWebhooksModuleService,
})
