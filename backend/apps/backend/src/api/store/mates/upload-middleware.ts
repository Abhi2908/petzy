import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import multer from "multer"
import { MAX_IMAGE_BYTES } from "../../../modules/mates/utils/images"

// Reads one photo from the multipart field "file" into memory. multer stops reading as soon as the
// file passes 5 MB, so an oversized upload is refused while it is still arriving.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single("file")

const MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "Each photo must be 5 MB or smaller.",
  LIMIT_FILE_COUNT: "Upload one photo at a time.",
  LIMIT_UNEXPECTED_FILE: 'Send the photo in a form field named "file", one photo at a time.',
  LIMIT_FIELD_COUNT: 'Send only the photo, in a form field named "file".',
}

export function parsePhotoUpload(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  parser(req as never, res as never, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(new MedusaError(MedusaError.Types.NOT_ALLOWED, MESSAGES[error.code] ?? error.message))
    }
    if (error) {
      return next(new MedusaError(MedusaError.Types.INVALID_DATA, "The upload could not be read. Send it as multipart/form-data."))
    }
    next()
  })
}
