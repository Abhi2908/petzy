import { clx } from "@modules/common/components/ui"

// The partner's logo, or its initials when Admin has not added one. A plain img: logos are links Admin
// types in (any https host), which next/image would need listing one by one.
const PartnerLogo = ({
  name,
  logoUrl,
  className,
}: {
  name: string
  logoUrl: string | null
  className?: string
}) => {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={clx(
          "h-12 w-12 rounded-md border border-petzy-border bg-white object-contain p-1",
          className
        )}
      />
    )
  }
  const initials = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
  return (
    <span
      aria-hidden="true"
      className={clx(
        "flex h-12 w-12 items-center justify-center rounded-md bg-petzy-teal text-base font-semibold text-white",
        className
      )}
    >
      {initials}
    </span>
  )
}

export default PartnerLogo
