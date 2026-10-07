import { VetProvider } from "@lib/data/vet"
import { formatFee } from "@lib/util/vet-format"
import { clx, Text } from "@modules/common/components/ui"

type ProviderListProps = {
  providers: VetProvider[]
  selectedId: string | null
  onSelect: (provider: VetProvider) => void
}

const ProviderList = ({ providers, selectedId, onSelect }: ProviderListProps) => {
  return (
    <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-4">
      {providers.map((provider) => {
        const selected = provider.id === selectedId
        const specialties = (provider.specialties ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

        return (
          <li key={provider.id}>
            <button
              type="button"
              onClick={() => onSelect(provider)}
              aria-pressed={selected}
              className={clx(
                "w-full h-full text-left bg-white rounded-large border p-5 flex flex-col gap-3 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-petzy-teal",
                selected
                  ? "border-petzy-coral ring-2 ring-petzy-coral"
                  : "border-petzy-border hover:shadow-elevation-card-hover"
              )}
              data-testid="vet-provider-card"
            >
              <div>
                <h3 className="text-lg font-semibold leading-6">
                  {provider.name}
                </h3>
                <Text className="text-ui-fg-subtle">
                  {provider.clinic_name}, {provider.city}
                </Text>
              </div>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-petzy-canvas border border-petzy-border px-2.5 py-0.5 text-xs text-petzy-teal"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between text-small-regular">
                <span className="font-semibold text-ui-fg-base">
                  {formatFee(provider.consultation_fee)}
                </span>
                <span className="text-ui-fg-subtle">
                  {provider.slot_minutes} min appointment
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default ProviderList
