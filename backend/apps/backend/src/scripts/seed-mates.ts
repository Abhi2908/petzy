/**
 * Adds five SAMPLE Mates listings, already approved, so the marketplace screens have something to show.
 *
 *   npm run seed:mates
 *
 * Safe to re-run: listings with the same title are skipped. They belong to a placeholder seller id
 * (sample_seller), not a real customer, and the phone numbers are placeholders. Delete them in
 * Admin > Mates > Listings before going live.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { createMatesListingWorkflow, CreateMatesListingInput } from "../workflows/create-mates-listing"
import { moderateMatesListingWorkflow } from "../workflows/moderate-mates-listing"

const SAMPLE_SELLER = "sample_seller"

const SAMPLES: Omit<CreateMatesListingInput, "seller_customer_id">[] = [
  {
    title: "Golden Retriever puppies (sample)",
    pet_type: "dog",
    breed: "Golden Retriever",
    gender: "male",
    age_months: 2,
    color: "Golden",
    vaccinated: true,
    dewormed: true,
    has_papers: true,
    description: "Playful, home raised and used to children. First vaccination done.",
    price: 35000,
    price_negotiable: true,
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    seller_type: "breeder",
    breeder_registration_no: "KCI-SAMPLE-1001",
    seller_phone: "+91 90000 10001",
  },
  {
    title: "Labrador puppy, female (sample)",
    pet_type: "dog",
    breed: "Labrador Retriever",
    gender: "female",
    age_months: 3,
    color: "Black",
    vaccinated: true,
    dewormed: true,
    has_papers: false,
    description: "Calm and friendly. Comes with her vaccination card.",
    price: 18000,
    price_negotiable: false,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    seller_type: "individual",
    breeder_registration_no: "KCI-SAMPLE-1002",
    seller_phone: "+91 90000 10002",
  },
  {
    title: "Persian kittens (sample)",
    pet_type: "cat",
    breed: "Persian",
    gender: "female",
    age_months: 2,
    color: "White",
    vaccinated: true,
    dewormed: true,
    description: "Litter trained, eating solid food.",
    price: 12000,
    price_negotiable: true,
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    seller_type: "individual",
    seller_phone: "+91 90000 10003",
  },
  {
    title: "Pair of budgies with cage (sample)",
    pet_type: "bird",
    breed: "Budgerigar",
    gender: "male",
    age_months: 8,
    color: "Green and yellow",
    description: "Healthy pair, cage and feeders included.",
    price: 2500,
    price_negotiable: true,
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600040",
    seller_type: "individual",
    seller_phone: "+91 90000 10004",
  },
  {
    title: "Goldfish, 4 adults (sample)",
    pet_type: "fish",
    breed: "Oranda Goldfish",
    gender: "female",
    age_months: 12,
    color: "Orange",
    description: "Moving house, looking for a good home with a large tank.",
    price: 1200,
    price_negotiable: false,
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    seller_type: "individual",
    seller_phone: "+91 90000 10005",
  },
]

export default async function seedMates({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const mates: MatesModuleService = container.resolve(MATES_MODULE)

  const existing = await mates.listMatesListings({ seller_customer_id: SAMPLE_SELLER }, { select: ["title"] })
  const created: string[] = []
  for (const sample of SAMPLES) {
    if (existing.some((l) => l.title === sample.title)) {
      continue
    }
    const { result: id } = await createMatesListingWorkflow(container).run({
      input: { ...sample, seller_customer_id: SAMPLE_SELLER },
    })
    await moderateMatesListingWorkflow(container).run({ input: { id, action: "approve" } })
    created.push(sample.title)
  }

  logger.info(created.length ? `Sample Mates listings created: ${created.join(", ")}` : "Sample Mates listings already exist.")
}
