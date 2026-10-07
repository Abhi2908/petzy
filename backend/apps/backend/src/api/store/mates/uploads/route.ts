import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { randomUUID } from "crypto"
import { detectImageType } from "../../../../modules/mates/utils/images"

// One listing photo (multipart field "file"; jpg, png or webp up to 5 MB). Returns { url } to put in
// image_urls. Stored through Medusa's file module, so the storage provider is a config choice.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const file = (req as AuthenticatedMedusaRequest & { file?: Express.Multer.File }).file
  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'No photo was uploaded. Send it in a form field named "file".')
  }
  // The real type comes from the bytes. The file name and stated Content-Type are ignored.
  const type = detectImageType(file.buffer)
  if (!type) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Photos must be JPG, PNG or WebP images.")
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: `mates-${randomUUID()}.${type.extension}`,
          mimeType: type.mime,
          content: file.buffer.toString("base64"),
          access: "public",
        },
      ],
    },
  })
  res.status(201).json({ url: result[0].url })
}
