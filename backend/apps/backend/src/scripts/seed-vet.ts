/**
 * Adds three SAMPLE vet providers with weekly hours so the vet screens have something to show.
 *
 *   npm run seed:vet
 *
 * Safe to re-run: providers with the same name are skipped. The names, clinics, fees and hours are
 * placeholders. Delete them in Admin > Vet Providers and add your real partner vets.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VET_MODULE } from "../modules/vet"
import VetModuleService from "../modules/vet/service"
import { createVetProviderWorkflow } from "../workflows/create-vet-provider"

const weekdays = (days: number[], blocks: [string, string][]) =>
  days.flatMap((weekday) => blocks.map(([start_time, end_time]) => ({ weekday, start_time, end_time })))

const SAMPLES = [
  {
    name: "Dr. Anita Verma (sample)",
    clinic_name: "Paws & Care Clinic (sample)",
    city: "Pune",
    phone: "+91 90000 00001",
    specialties: "Dogs, Cats",
    consultation_fee: 500,
    slot_minutes: 30,
    working_hours: weekdays([1, 2, 3, 4, 5, 6], [["10:00", "13:00"], ["16:00", "19:00"]]),
  },
  {
    name: "Dr. Rohan Mehta (sample)",
    clinic_name: "Happy Tails Vet Hospital (sample)",
    city: "Mumbai",
    phone: "+91 90000 00002",
    specialties: "Dogs, Cats, Birds",
    consultation_fee: 700,
    slot_minutes: 20,
    working_hours: weekdays([1, 2, 3, 4, 5], [["09:00", "17:00"]]),
  },
  {
    name: "Dr. Kavya Nair (sample)",
    clinic_name: "Aqua & Exotics Care (sample)",
    city: "Bengaluru",
    phone: "+91 90000 00003",
    specialties: "Fish, Birds, Small pets",
    consultation_fee: 450,
    slot_minutes: 30,
    working_hours: weekdays([2, 4, 6], [["11:00", "15:00"]]),
  },
]

export default async function seedVet({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const vet: VetModuleService = container.resolve(VET_MODULE)

  const existing = await vet.listVetProviders({})
  const created: string[] = []
  for (const sample of SAMPLES) {
    if (existing.some((p) => p.name === sample.name)) {
      continue
    }
    await createVetProviderWorkflow(container).run({ input: sample })
    created.push(sample.name)
  }

  logger.info(created.length ? `Sample vet providers created: ${created.join(", ")}` : "Sample vet providers already exist.")
}
