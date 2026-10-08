import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runNotification, toNumber } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { storefrontUrl } from "../notifications/settings"
import { orderConfirmation, TEMPLATES } from "../notifications/templates"

// Medusa emits order.placed when checkout completes. Email the customer an order confirmation.
export default async function orderPlaced({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await runNotification(container, `order ${data.id}`, async () => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "subtotal",
        "shipping_total",
        "tax_total",
        "total",
        "items.title",
        "items.variant_title",
        "items.quantity",
        "items.total",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
      ],
      filters: { id: data.id },
    })
    if (!order) {
      return
    }
    const view = {
      id: order.id,
      display_id: order.display_id ?? order.id,
      email: order.email ?? null,
      currency_code: order.currency_code,
      items: (order.items ?? []).filter(Boolean).map((i) => ({
        title: i!.title,
        variant_title: i!.variant_title,
        quantity: toNumber(i!.quantity),
        total: toNumber(i!.total),
      })),
      subtotal: toNumber(order.subtotal),
      shipping_total: toNumber(order.shipping_total),
      tax_total: toNumber(order.tax_total),
      total: toNumber(order.total),
      shipping_address: order.shipping_address ?? null,
    }
    await sendEmail(container, {
      group: "orders",
      template: TEMPLATES.ORDER_CONFIRMATION,
      to: view.email,
      email: orderConfirmation({ order: view, link: `${storefrontUrl()}/account/orders/details/${order.id}` }),
      resource: { type: "order", id: order.id },
      idempotencyKey: `${TEMPLATES.ORDER_CONFIRMATION}:${order.id}`,
    })
  })
}

export const config: SubscriberConfig = { event: "order.placed" }
