import { button, detailsTable, esc, paragraph, render, RenderedEmail, rupees } from "./layout"

// Order confirmation, sent when Medusa emits order.placed.

export type OrderView = {
  id: string
  display_id: number | string
  email: string | null
  currency_code: string
  items: { title: string; variant_title?: string | null; quantity: number; total: number }[]
  subtotal: number
  shipping_total: number
  tax_total: number
  total: number
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
  } | null
}

const money = (amount: number, currency: string) =>
  currency.toLowerCase() === "inr" ? rupees(amount) : `${currency.toUpperCase()} ${amount.toFixed(2)}`

export function orderConfirmation(p: { order: OrderView; link: string }): RenderedEmail {
  const { order } = p
  const m = (n: number) => money(n, order.currency_code)
  const name = order.shipping_address?.first_name?.trim()
  const address = order.shipping_address
    ? [
        [order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(" "),
        order.shipping_address.address_1,
        order.shipping_address.address_2,
        [order.shipping_address.city, order.shipping_address.province, order.shipping_address.postal_code].filter(Boolean).join(", "),
      ]
        .filter((l) => l && String(l).trim())
        .join("\n")
    : ""

  const itemsBlock = {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${order.items
      .map(
        (i) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #E5E1DA;font-size:14px">${esc(i.title)}${i.variant_title ? ` <span style="color:#5F5F5F">(${esc(i.variant_title)})</span>` : ""} x ${esc(i.quantity)}</td>` +
          `<td align="right" style="padding:8px 0;border-bottom:1px solid #E5E1DA;font-size:14px;white-space:nowrap">${esc(m(i.total))}</td></tr>`
      )
      .join("")}</table>`,
    text: order.items.map((i) => `${i.title}${i.variant_title ? ` (${i.variant_title})` : ""} x ${i.quantity}: ${m(i.total)}`).join("\n"),
  }

  return render(
    `Order #${order.display_id} confirmed`,
    `Thank you for your order${name ? `, ${name}` : ""}!`,
    [
      paragraph(`We have received order #${order.display_id} and will let you know when it ships.`),
      itemsBlock,
      detailsTable([
        ["Subtotal", m(order.subtotal)],
        ["Shipping", m(order.shipping_total)],
        ["Tax", m(order.tax_total)],
        ["Total", m(order.total)],
      ]),
      ...(address
        ? [{ html: `<p style="margin:12px 0;font-size:14px;line-height:1.5;white-space:pre-line"><strong>Delivering to</strong><br>${esc(address)}</p>`, text: `Delivering to:\n${address}` }]
        : []),
      button("View your order", p.link),
    ]
  )
}
