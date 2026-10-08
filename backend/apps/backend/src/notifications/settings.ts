// Notification settings, read from environment variables each time so a restart is the only step needed
// after changing them. See .env.template.

export const NOTIFICATION_GROUPS = ["vet", "mates", "insurance", "orders"] as const
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number]

const GROUP_ENV: Record<NotificationGroup, string> = {
  vet: "NOTIFY_VET",
  mates: "NOTIFY_MATES",
  insurance: "NOTIFY_INSURANCE",
  orders: "NOTIFY_ORDERS",
}

/** Each group is on unless its variable is set to "false", "0", "off" or "no". */
export function isGroupEnabled(group: NotificationGroup, env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env[GROUP_ENV[group]]?.trim().toLowerCase()
  return !value || !["false", "0", "off", "no"].includes(value)
}

/** The internal inbox for insurance leads. Without it, lead emails are skipped (and logged). */
export function adminNotifyEmail(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.ADMIN_NOTIFY_EMAIL?.trim() || null
}

/** The website address used in email links, including the country path, for example http://localhost:8000/in */
export function storefrontUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.STOREFRONT_URL?.trim() || "http://localhost:8000/in").replace(/\/+$/, "")
}
