// Shared pieces for every Petzy email: one simple, mobile-friendly HTML layout with inline styles (email
// apps ignore stylesheets), the Petzy colours, escaping, and formatting helpers. Every template returns a
// subject, an HTML body and a plain-text body.

export type RenderedEmail = { subject: string; html: string; text: string }

export const COLORS = { coral: "#FF6B4A", teal: "#1F6F6B", canvas: "#FAF9F6", border: "#E5E1DA", text: "#1A1A1A", muted: "#5F5F5F" }

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }

/** Escapes text for HTML. Every value that comes from a customer, seller or staff member goes through this. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

/**
 * Replaces anything that looks like a phone number (7 or more digits, with optional spaces, dashes, dots,
 * brackets or a leading +) with "[number hidden]". Used on text people type into Mates (titles, messages,
 * reasons) so a phone number never reaches an email that must not carry one.
 */
export function maskPhones(text: string): string {
  return text.replace(/\+?\(?\d[\d\s().-]{5,}\d/g, (match) =>
    match.replace(/\D/g, "").length >= 7 ? "[number hidden]" : match
  )
}

export function rupees(amount: number): string {
  const fixed = Number.isInteger(amount) ? amount.toLocaleString("en-IN") : amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `Rs ${fixed}`
}

/** "Mon, 12 Oct 2026, 10:30 am IST" whatever the server's time zone. */
export function indiaDateTime(value: Date | string): string {
  const d = new Date(value)
  const date = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .formatToParts(d)
  const part = (t: string) => date.find((p) => p.type === t)?.value
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(d)
  return `${part("weekday")}, ${part("day")} ${part("month")} ${part("year")}, ${time} IST`
}

export function ageText(months: number): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`
  if (months < 12) {
    return plural(months, "month")
  }
  const rest = months % 12
  return `${plural(Math.floor(months / 12), "year")}${rest ? ` ${plural(rest, "month")}` : ""}`
}

export type Row = [label: string, value: string | number | null | undefined]

/** A two-column details table. Rows with empty values are left out. */
export function detailsTable(rows: Row[]): { html: string; text: string } {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${shown
      .map(
        ([label, value]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.muted};font-size:14px;width:40%;vertical-align:top">${esc(label)}</td>` +
          `<td style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:14px;vertical-align:top">${esc(value)}</td></tr>`
      )
      .join("")}</table>`,
    text: shown.map(([label, value]) => `${label}: ${value}`).join("\n"),
  }
}

/** A coral call-to-action button (and the plain link for the text version). */
export function button(label: string, href: string): { html: string; text: string } {
  return {
    html: `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:${COLORS.coral};color:${COLORS.text};text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${esc(label)}</a></p>`,
    text: `${label}: ${href}`,
  }
}

export function paragraph(text: string): { html: string; text: string } {
  return { html: `<p style="margin:12px 0;font-size:15px;line-height:1.5">${esc(text)}</p>`, text }
}

/** A highlighted box, used for "Pay Rs X at the clinic" and for contact details. */
export function callout(text: string): { html: string; text: string } {
  return {
    html: `<p style="margin:16px 0;padding:12px 16px;background:${COLORS.canvas};border:1px solid ${COLORS.border};border-radius:8px;color:${COLORS.teal};font-weight:bold;font-size:15px">${esc(text)}</p>`,
    text,
  }
}

export type Block = { html: string; text: string }

/** Wraps blocks in the Petzy layout: a teal heading, a white card on the canvas colour, and a short footer. */
export function render(subject: string, heading: string, blocks: Block[], footer = "You are receiving this email because of activity on your Petzy account or booking."): RenderedEmail {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.canvas};font-family:Inter,Arial,Helvetica,sans-serif;color:${COLORS.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:${COLORS.teal}">Petzy</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;padding:24px">
<h1 style="margin:0 0 8px;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${COLORS.teal}">${esc(heading)}</h1>
${blocks.map((b) => b.html).join("\n")}
</td></tr>
<tr><td style="padding:16px 4px;font-size:12px;color:${COLORS.muted}">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`
  const text = [heading, "", ...blocks.map((b) => b.text), "", "-- Petzy", footer].join("\n")
  return { subject, html, text }
}
