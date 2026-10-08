import { clx } from "@modules/common/components/ui"
import Image from "next/image"

// A listing photo, or a calm placeholder when the seller has not added one.
const ListingPhoto = ({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src?: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}) => (
  <div className={clx("relative overflow-hidden bg-petzy-canvas", className)}>
    {src ? (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    ) : (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-petzy-teal/50">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5.5" cy="10" r="2.2" />
          <circle cx="9.5" cy="5.5" r="2.2" />
          <circle cx="14.5" cy="5.5" r="2.2" />
          <circle cx="18.5" cy="10" r="2.2" />
          <path d="M12 11c-3 0-6 3.6-6 6.2 0 1.6 1.2 2.3 2.6 2.3 1.3 0 2.2-.7 3.4-.7s2.1.7 3.4.7c1.4 0 2.6-.7 2.6-2.3 0-2.6-3-6.2-6-6.2z" />
        </svg>
        <span className="text-xs">No photo yet</span>
      </div>
    )}
  </div>
)

export default ListingPhoto
