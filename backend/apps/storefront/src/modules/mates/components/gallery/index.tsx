"use client"

import { clx } from "@modules/common/components/ui"
import { useState } from "react"
import ListingPhoto from "../listing-photo"

const Gallery = ({ images, title }: { images: string[]; title: string }) => {
  const [index, setIndex] = useState(0)
  const count = images.length
  const go = (step: number) => setIndex((i) => (i + step + count) % count)

  return (
    <div className="flex flex-col gap-3" data-testid="mates-gallery">
      <div className="relative">
        <ListingPhoto
          src={images[index]}
          alt={count ? `${title}, photo ${index + 1} of ${count}` : title}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="aspect-[4/3] rounded-large border border-petzy-border"
          priority
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-petzy-teal shadow-elevation-card-rest hover:bg-white"
            >
              &larr;
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-petzy-teal shadow-elevation-card-rest hover:bg-white"
            >
              &rarr;
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={clx(
                  "block rounded-md border-2 overflow-hidden",
                  i === index
                    ? "border-petzy-coral"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <ListingPhoto
                  src={src}
                  alt=""
                  sizes="80px"
                  className="h-16 w-20"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Gallery
