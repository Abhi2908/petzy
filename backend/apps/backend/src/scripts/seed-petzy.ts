/**
 * Petzy base setup: India (INR) region, tax region, shipping, the 8 shop categories from the
 * wireframes (incl. Grooming) and a few sample products priced in INR.
 *
 *   npm run seed:petzy
 *
 * Run it while the backend is running (or after it has booted at least once). Safe to re-run:
 * anything that already exists is skipped.
 * Also soft-deletes Medusa's demo clothing products (t-shirt, sweatshirt, sweatpants, shorts) and
 * demo categories (Shirts, Sweatshirts, Pants, Merch).
 *
 * PLACEHOLDERS to replace with real values later: warehouse name/address, the Rs 50 flat shipping
 * price, and GST rates (no tax rates are created here - confirm them with your CA first).
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const CATEGORIES = [
  { name: "Food & Nutrition", handle: "food-nutrition" },
  { name: "Toys & Accessories", handle: "toys-accessories" },
  { name: "Grooming", handle: "grooming" },
  { name: "Clothing", handle: "clothing" },
  { name: "Health & Wellness", handle: "health-wellness" },
  { name: "Pet Tech", handle: "pet-tech" },
  { name: "Fish & Aquatics", handle: "fish-aquatics" },
  { name: "Starter Kits", handle: "starter-kits" },
]

// Names, SKUs, prices and stock mirror the Admin wireframes. Prices are in rupees (major units).
const PRODUCTS = [
  { title: "Grain-Free Chicken Kibble 3kg", handle: "grain-free-chicken-kibble-3kg", sku: "SKU-1042", price: 899, stock: 142, category: "food-nutrition", description: "Grain-free dry food with real chicken for adult dogs." },
  { title: "Adjustable Nylon Leash", handle: "adjustable-nylon-leash", sku: "SKU-2087", price: 399, stock: 6, category: "toys-accessories", description: "Durable adjustable nylon leash with a padded handle." },
  { title: "Feather Wand Cat Toy", handle: "feather-wand-cat-toy", sku: "SKU-1190", price: 249, stock: 58, category: "toys-accessories", description: "Interactive feather wand for cats. (Price is a placeholder.)" },
  { title: "Oatmeal Shampoo 250ml", handle: "oatmeal-shampoo-250ml", sku: "SKU-5102", price: 329, stock: 34, category: "grooming", description: "Gentle oatmeal shampoo for dogs with sensitive skin." },
  { title: "Aquarium Water Conditioner", handle: "aquarium-water-conditioner", sku: "SKU-3310", price: 450, stock: 0, category: "fish-aquatics", description: "Makes tap water safe for fish." },
  { title: "Puppy Starter Kit Bundle", handle: "puppy-starter-kit-bundle", sku: "SKU-4021", price: 1499, stock: 23, category: "starter-kits", description: "Everything for a new puppy: bowl, leash, toy and grooming basics." },
]

export default async function seedPetzy({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillment = container.resolve(ModuleRegistrationName.FULFILLMENT)

  // The web store lists products from a search index that is only activated the first time the
  // backend boots. Without it, creating products fails half way, so stop early with a clear message.
  const productIndex = (await container.resolve(Modules.SEARCH).listIndexes()).find((i) => i.name === "product")
  if (productIndex?.status !== "ready") {
    logger.error('The product search index is not ready yet. Start the backend once ("npm run dev"), wait for "Server is ready", then run this script again in a second terminal.')
    return
  }

  // ---- Store: INR becomes the default currency --------------------------------
  const { data: stores } = await query.graph({ entity: "store", fields: ["id", "supported_currencies.*"] })
  const store: any = stores[0]
  const hasInr = store.supported_currencies?.some((c: any) => c.currency_code === "inr")
  if (!hasInr) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            { currency_code: "inr", is_default: true },
            ...store.supported_currencies.map((c: any) => ({ currency_code: c.currency_code, is_default: false })),
          ],
        },
      },
    })
    logger.info("Store: INR added as default currency.")
  }

  // ---- India region ------------------------------------------------------------
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "name"], filters: { name: "India" } })
  let indiaRegion: any = regions[0]
  if (!indiaRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "India", currency_code: "inr", countries: ["in"], payment_providers: ["pp_system_default"] }] },
    })
    indiaRegion = result[0]
    logger.info("Region: India (INR) created.")
  }

  // ---- Tax region (no rates yet - confirm GST rates with your CA) --------------
  const { data: taxRegions } = await query.graph({ entity: "tax_region", fields: ["id"], filters: { country_code: "in" } })
  if (!taxRegions.length) {
    await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "in", provider_id: "tp_system" }] })
    logger.info("Tax region: India created (no rates set).")
  }

  // ---- Warehouse, delivery zone and shipping option ----------------------------
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const salesChannel: any = channels.find((c: any) => c.name === "Default Sales Channel") ?? channels[0]
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const shippingProfile: any = profiles[0]

  const { data: existingOptions } = await query.graph({ entity: "shipping_option", fields: ["id", "name"], filters: { name: "Standard Delivery (India)" } })
  if (!existingOptions.length) {
    const { result: locs } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Petzy Warehouse (placeholder)", address: { city: "TBD", country_code: "IN", address_1: "" } }] },
    })
    const location = locs[0]
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    const fset = await fulfillment.createFulfillmentSets({
      name: "India delivery",
      type: "shipping",
      service_zones: [{ name: "India", geo_zones: [{ country_code: "in", type: "country" }] }],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fset.id },
    })
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Delivery (India)",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fset.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Standard", description: "Delivered in 3-5 days.", code: "standard-in" },
          prices: [
            { currency_code: "inr", amount: 50 },
            { region_id: indiaRegion.id, amount: 50 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [salesChannel.id] } })
    logger.info("Shipping: India warehouse (placeholder) + Standard Delivery Rs 50 created.")
  }

  // ---- Categories --------------------------------------------------------------
  const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const missingCats = CATEGORIES.filter((c) => !existingCats.some((e: any) => e.handle === c.handle))
  if (missingCats.length) {
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingCats.map((c) => ({ ...c, is_active: true })) },
    })
    logger.info(`Categories created: ${missingCats.map((c) => c.name).join(", ")}`)
  }
  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const catId = (handle: string) => (cats.find((c: any) => c.handle === handle) as any).id

  // ---- Products ----------------------------------------------------------------
  const { data: existingProducts } = await query.graph({ entity: "product", fields: ["id", "handle"] })
  const newProducts = PRODUCTS.filter((p) => !existingProducts.some((e: any) => e.handle === p.handle))
  if (newProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts.map((p) => ({
          title: p.title,
          handle: p.handle,
          description: p.description,
          status: ProductStatus.PUBLISHED,
          category_ids: [catId(p.category)],
          shipping_profile_id: shippingProfile.id,
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Pack", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: p.sku,
              manage_inventory: true,
              options: { Pack: "Default" },
              prices: [{ amount: p.price, currency_code: "inr" }],
            },
          ],
        })),
      },
    })

    // Stock levels at the first stock location linked to the sales channel
    const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id", "name"] })
    const location: any = locations.find((l: any) => l.name.startsWith("Petzy Warehouse")) ?? locations[0]
    const { data: items } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku", "location_levels.id"],
      filters: { sku: newProducts.map((p) => p.sku) },
    })
    const levels = (items as any[])
      .filter((i) => !i.location_levels?.length)
      .map((i) => ({
        location_id: location.id,
        inventory_item_id: i.id,
        stocked_quantity: newProducts.find((p) => p.sku === i.sku)!.stock,
      }))
    if (levels.length) await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } })
    logger.info(`Products created: ${newProducts.map((p) => p.title).join(", ")}`)
  }

  // ---- Remove Medusa's clothing demo products ---------------------------------
  const { data: demo } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: ["t-shirt", "sweatshirt", "sweatpants", "shorts"] },
  })
  if (demo.length) {
    const demoIds = demo.map((d: any) => d.id)
    await deleteProductsWorkflow(container).run({ input: { ids: demoIds } })
    // This script runs outside the server, so tell the search index (used by the web store page) too.
    await container.resolve(Modules.SEARCH).deleteDocuments({ index: "product", filters: { id: demoIds } })
    logger.info(`Demo products removed (soft-deleted): ${demo.length}. Run "npm run purge-deleted" to erase them for good.`)
  }

  const { data: demoCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: ["shirts", "sweatshirts", "pants", "merch"] },
  })
  if (demoCats.length) {
    await deleteProductCategoriesWorkflow(container).run({ input: demoCats.map((c: any) => c.id) })
    logger.info(`Demo categories removed: ${demoCats.length}.`)
  }

  logger.info("Petzy seed finished.")
}
