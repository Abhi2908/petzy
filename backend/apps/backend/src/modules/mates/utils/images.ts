// Photo upload checks for Mates listings. The type is read from the file's first bytes (its magic
// number), never from the name or the Content-Type the browser sent, which anyone can fake.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type ImageType = { mime: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" }

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((b, i) => buffer[offset + i] === b)

/** Detects JPEG, PNG and WebP from file content. Returns null for anything else. */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", extension: "jpg" }
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", extension: "png" }
  }
  // "RIFF" <4 byte size> "WEBP"
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", extension: "webp" }
  }
  return null
}
