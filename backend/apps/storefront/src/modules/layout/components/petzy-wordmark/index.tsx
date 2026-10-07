import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

type PetzyWordmarkProps = {
  className?: string
  "data-testid"?: string
}

const PetzyWordmark = ({ className, ...props }: PetzyWordmarkProps) => {
  return (
    <LocalizedClientLink
      href="/"
      className={clx(
        "font-display font-bold text-2xl leading-none tracking-tight text-petzy-teal hover:text-petzy-teal-hover",
        className
      )}
      {...props}
    >
      Petzy
    </LocalizedClientLink>
  )
}

export default PetzyWordmark
