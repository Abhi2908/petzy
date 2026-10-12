// Medusa stores amounts in major units (rupees, possibly with decimals, as a number, a numeric string or a
// BigNumber). Razorpay wants whole paise. This file is the only place that converts between them, and it
// uses integer (BigInt) maths on the decimal string so 1499.95 never becomes 149994.99999.

import { MedusaError } from "@medusajs/framework/utils"

const invalid = (message: string) => new MedusaError(MedusaError.Types.INVALID_DATA, message)

type AmountLike =
  | number
  | string
  | bigint
  | { numeric?: unknown; raw?: { value?: unknown }; value?: unknown; valueOf?(): unknown; toString(): string }

/** The amount as a plain decimal string, from any of the shapes Medusa uses. */
function decimalString(amount: AmountLike): string {
  if (typeof amount === "bigint") {
    return amount.toString()
  }
  if (typeof amount === "number") {
    if (!Number.isFinite(amount)) {
      throw invalid(`Amount ${amount} is not a finite number`)
    }
    // toString() can give "1e-7"; toFixed(10) gives plain digits for any realistic rupee amount.
    return Math.abs(amount) < 1e15 ? amount.toFixed(10) : amount.toString()
  }
  if (typeof amount === "string") {
    return amount.trim()
  }
  // Medusa's BigNumber keeps the exact value in raw.value; a raw amount is { value, precision }.
  for (const candidate of [amount?.raw?.value, amount?.value, amount?.numeric, amount?.valueOf?.()]) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      return decimalString(candidate)
    }
  }
  return decimalString(amount.toString())
}

/**
 * Rupees to whole paise, rounding half up at the third decimal (1.005 -> 101, 1.004 -> 100).
 * Throws on anything that is not a plain decimal number.
 */
export function toPaise(amount: AmountLike): number {
  const text = decimalString(amount)
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match) {
    throw invalid(`"${text}" is not an amount in rupees`)
  }
  const [, minus, whole, fraction = ""] = match
  const firstTwo = BigInt((fraction + "00").slice(0, 2))
  const roundUp = fraction.length > 2 && Number(fraction[2]) >= 5 ? 1n : 0n
  const paise = BigInt(whole) * 100n + firstTwo + roundUp
  const value = minus ? -paise : paise
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw invalid(`Amount ${text} is too large`)
  }
  return Number(value)
}

/** Whole paise to rupees, as an exact decimal string ("1499.50") that Medusa accepts as an amount. */
export function fromPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw invalid(`${paise} is not a whole number of paise`)
  }
  const minus = paise < 0 ? "-" : ""
  const abs = Math.abs(paise)
  return `${minus}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}
