import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../send"
import { adminNotifyEmail, isGroupEnabled, storefrontUrl } from "../settings"

function fakeContainer(createNotifications: jest.Mock) {
  const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const container = {
    resolve: (key: string) => (key === ContainerRegistrationKeys.LOGGER ? logger : key === Modules.NOTIFICATION ? { createNotifications } : undefined),
  }
  return { container: container as never, logger }
}

const request = {
  group: "mates" as const,
  template: "mates.offer.received",
  to: "seller@example.com",
  email: { subject: "s", html: "<p>h</p>", text: "t" },
  resource: { type: "mates_offer", id: "mato_1" },
  idempotencyKey: "mates.offer.received:mato_1",
}

describe("notification settings", () => {
  it("keeps every group on unless switched off", () => {
    expect(isGroupEnabled("vet", {})).toBe(true)
    expect(isGroupEnabled("vet", { NOTIFY_VET: "true" })).toBe(true)
    for (const off of ["false", "FALSE", "0", "off", "no", " false "]) {
      expect(isGroupEnabled("vet", { NOTIFY_VET: off })).toBe(false)
    }
    expect(isGroupEnabled("orders", { NOTIFY_VET: "false" })).toBe(true)
  })

  it("reads the admin inbox and website address", () => {
    expect(adminNotifyEmail({})).toBeNull()
    expect(adminNotifyEmail({ ADMIN_NOTIFY_EMAIL: " ops@petzy.in " })).toBe("ops@petzy.in")
    expect(storefrontUrl({})).toBe("http://localhost:8000/in")
    expect(storefrontUrl({ STOREFRONT_URL: "https://petzy.in/in/" })).toBe("https://petzy.in/in")
  })
})

describe("sendEmail", () => {
  afterEach(() => {
    delete process.env.NOTIFY_MATES
  })

  it("hands the email to the notification module with ids only in the stored data", async () => {
    const create = jest.fn().mockResolvedValue([{}])
    const { container } = fakeContainer(create)
    expect(await sendEmail(container, request)).toBe(true)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "seller@example.com",
        channel: "email",
        template: "mates.offer.received",
        content: request.email,
        data: { resource_type: "mates_offer", resource_id: "mato_1" },
        idempotency_key: "mates.offer.received:mato_1",
      })
    )
  })

  it("never throws when the provider fails, and logs it", async () => {
    const { container, logger } = fakeContainer(jest.fn().mockRejectedValue(new Error("Resend refused the email (403)")))
    await expect(sendEmail(container, request)).resolves.toBe(false)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Resend refused the email (403)"))
  })

  it("skips without an address or when the group is switched off", async () => {
    const create = jest.fn()
    const { container, logger } = fakeContainer(create)
    expect(await sendEmail(container, { ...request, to: null })).toBe(false)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("no email address"))
    process.env.NOTIFY_MATES = "false"
    expect(await sendEmail(container, request)).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })
})
