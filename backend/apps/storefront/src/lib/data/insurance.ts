"use server"

import { sdk } from "@lib/config"

export type InsurancePlan = {
  id: string
  name: string
  description: string | null
  pet_types: string[]
  min_age_months: number
  max_age_months: number
  annual_premium_from: number
  cover_amount: number
  highlights: string[]
  exclusions: string[]
  partner: {
    id: string
    name: string
    logo_url: string | null
    website_url: string | null
  }
}

export type InsuranceLeadInput = {
  plan_id: string
  customer_name: string
  phone: string
  email: string | null
  pet_name: string | null
  pet_type: string
  breed: string | null
  pet_age_months: number
  city: string | null
  pincode: string | null
  message: string | null
}

export type InsuranceLeadReceipt = {
  id: string
  status: string
  plan: { id: string; name: string }
  partner: { name: string }
}

// Results are returned rather than thrown so the API's own messages (age limits, the daily limit) reach the
// page in production too. `status` lets pages tell "not found" apart from other failures.
export type Result<T> =
  | { data: T; error?: never; status?: never }
  | { data?: never; error: string; status?: number }

async function call<T>(
  path: string,
  options: {
    method?: "GET" | "POST"
    body?: Record<string, unknown>
    query?: Record<string, string>
  } = {}
): Promise<Result<T>> {
  try {
    const data = await sdk.client.fetch<T>(path, {
      method: options.method ?? "GET",
      body: options.body,
      query: options.query,
      cache: "no-store",
    })
    return { data }
  } catch (error) {
    const e = error as { message?: string; status?: number }
    return {
      error: e?.message || "Something went wrong. Please try again.",
      status: typeof e?.status === "number" ? e.status : undefined,
    }
  }
}

/** Active plans, filtered by pet_type, pet_age_months and max_premium (all optional). */
export const listInsurancePlans = async (query: Record<string, string>) =>
  call<{ plans: InsurancePlan[]; count: number }>("/store/insurance/plans", {
    query,
  })

export const getInsurancePlan = async (id: string) =>
  call<{ plan: InsurancePlan }>(`/store/insurance/plans/${id}`)

/** Guests can send these; no account needed. */
export const sendInsuranceLead = async (input: InsuranceLeadInput) =>
  call<{ lead: InsuranceLeadReceipt }>("/store/insurance/leads", {
    method: "POST",
    body: input,
  })
