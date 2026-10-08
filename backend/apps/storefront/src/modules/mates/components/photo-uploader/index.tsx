"use client"

import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  PHOTO_TYPES,
} from "@lib/util/mates-format"
import { clx, Text } from "@modules/common/components/ui"
import { useEffect, useRef, useState } from "react"

export type Photo = {
  key: string
  preview: string
  url?: string // set once uploaded
  error?: string
}

type PhotoUploaderProps = {
  photos: Photo[]
  onChange: (update: (photos: Photo[]) => Photo[]) => void
}

/** Uploads one file through the storefront's /api/mates/uploads proxy. Resolves with the URL or the API message. */
async function upload(file: File): Promise<{ url?: string; error?: string }> {
  const body = new FormData()
  body.append("file", file)
  try {
    const response = await fetch("/api/mates/uploads", { method: "POST", body })
    const data = await response.json().catch(() => ({}))
    return response.ok
      ? { url: data.url }
      : { error: data.message ?? "The upload failed." }
  } catch {
    return { error: "The upload failed. Check your connection and try again." }
  }
}

// Up to 8 photos. Each one shows a preview straight away, then uploads. The browser checks type and size
// first so mistakes show instantly; the server checks the real file content again.
const PhotoUploader = ({ photos, onChange }: PhotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const previews = useRef(new Set<string>())

  // Free the in-memory previews when the form goes away.
  useEffect(() => {
    const created = previews.current
    return () => created.forEach((p) => URL.revokeObjectURL(p))
  }, [])

  const update = (key: string, patch: Partial<Photo>) =>
    onChange((list) =>
      list.map((p) => (p.key === key ? { ...p, ...patch } : p))
    )

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }
    const room = MAX_PHOTOS - photos.length
    const chosen = Array.from(files).slice(0, Math.max(room, 0))
    setNotice(
      files.length > room
        ? `You can add ${MAX_PHOTOS} photos in total, so only the first ${Math.max(
            room,
            0
          )} were added.`
        : null
    )

    const added: { photo: Photo; file: File }[] = chosen.map((file) => {
      const preview = URL.createObjectURL(file)
      previews.current.add(preview)
      const error = !PHOTO_TYPES.includes(file.type)
        ? "Use a JPG, PNG or WebP photo."
        : file.size > MAX_PHOTO_BYTES
        ? "This photo is over 5 MB."
        : undefined
      return { photo: { key: preview, preview, error }, file }
    })
    onChange((list) => [...list, ...added.map((a) => a.photo)])

    for (const { photo, file } of added) {
      if (!photo.error) {
        const result = await upload(file)
        update(
          photo.key,
          result.url ? { url: result.url } : { error: result.error }
        )
      }
    }
  }

  const remove = (key: string) =>
    onChange((list) => list.filter((p) => p.key !== key))

  return (
    <div className="flex flex-col gap-3" data-testid="mates-photo-uploader">
      <ul className="grid grid-cols-3 xsmall:grid-cols-4 gap-3">
        {photos.map((photo, i) => (
          <li
            key={photo.key}
            className="relative aspect-square overflow-hidden rounded-md border border-petzy-border bg-petzy-canvas"
          >
            {/* A plain img: previews are local blob: URLs that next/image cannot load. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.preview}
              alt={`Photo ${i + 1}`}
              className={clx(
                "h-full w-full object-cover",
                !photo.url && "opacity-60"
              )}
              // A file that is not really an image cannot be previewed; show the empty tile instead.
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            {i === 0 && photo.url && (
              <span className="absolute left-1 top-1 rounded-full bg-petzy-teal px-2 py-0.5 text-[10px] text-white">
                Cover
              </span>
            )}
            {!photo.url && !photo.error && (
              <span
                className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] text-white"
                role="status"
              >
                Uploading...
              </span>
            )}
            {photo.error && (
              <span
                className="absolute inset-x-0 bottom-0 bg-rose-700/90 px-1 py-1 text-center text-[11px] leading-tight text-white"
                role="alert"
              >
                {photo.error}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(photo.key)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 h-7 w-7 rounded-full bg-white/90 text-sm text-ui-fg-base shadow-elevation-card-rest hover:bg-white"
            >
              &times;
            </button>
          </li>
        ))}
        {photos.length < MAX_PHOTOS && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-petzy-border bg-white text-petzy-teal hover:border-petzy-coral"
              data-testid="mates-add-photo"
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                +
              </span>
              <span className="text-xs">Add photos</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose photos"
        data-testid="mates-photo-input"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <Text className="text-xs text-ui-fg-subtle">
        {photos.length} of {MAX_PHOTOS} photos. JPG, PNG or WebP, up to 5 MB
        each. The first photo is the cover.
      </Text>
      {notice && <Text className="text-xs text-[#B23A1E]">{notice}</Text>}
    </div>
  )
}

export default PhotoUploader
