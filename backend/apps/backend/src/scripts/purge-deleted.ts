/**
 * Permanently removes soft-deleted catalog rows from the database.
 *
 * Medusa's Admin "Delete" hides a product everywhere (Admin, web, iOS, Android) but keeps the
 * row with deleted_at set, so it can be restored. Run this to hard-delete those rows for good:
 *
 *   npm run purge-deleted
 *
 * Add `-- dry-run` to only list what would be removed.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function purgeDeleted({ container, args }: ExecArgs) {
  const dryRun = (args ?? []).includes("dry-run")
  const productModule = container.resolve(Modules.PRODUCT)

  const all = await productModule.listProducts({}, { withDeleted: true, select: ["id", "title", "deleted_at"], take: 10000 })
  const soft = all.filter((p: any) => p.deleted_at)

  if (!soft.length) {
    console.log("Nothing to purge: no soft-deleted products.")
    return
  }
  console.log(`${dryRun ? "[dry run] Would permanently delete" : "Permanently deleting"} ${soft.length} product(s):`)
  soft.forEach((p: any) => console.log(`  - ${p.id}  ${p.title}`))
  if (!dryRun) {
    const ids = soft.map((p: any) => p.id)
    await productModule.deleteProducts(ids)
    // This script runs outside the server, so tell the search index (used by the web store page) too.
    const search = container.resolve(Modules.SEARCH)
    const productIndex = (await search.listIndexes()).find((i) => i.name === "product")
    if (productIndex?.status === "ready") {
      await search.deleteDocuments({ index: "product", filters: { id: ids } })
    }
    console.log("Done.")
  }
}
