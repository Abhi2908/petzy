import { getAuthHeaders } from "@lib/data/cookies"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

// Passes one Mates photo upload through to POST /store/mates/uploads with the customer's token, which
// lives in an httpOnly cookie the browser cannot read. The body is streamed, not buffered, so the
// backend's 5 MB limit and content checks still apply while the file arrives. A route handler is used
// instead of a server action because server actions cap request bodies at 1 MB.
export async function POST(req: NextRequest) {
  const auth = await getAuthHeaders()
  if (!("authorization" in auth)) {
    return NextResponse.json(
      { message: "Please sign in to upload photos." },
      { status: 401 }
    )
  }

  const contentType = req.headers.get("content-type") ?? ""
  if (!contentType.startsWith("multipart/form-data") || !req.body) {
    return NextResponse.json(
      { message: "Send the photo as multipart/form-data." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(`${BACKEND_URL}/store/mates/uploads`, {
      method: "POST",
      headers: {
        ...auth,
        "content-type": contentType,
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
      },
      body: req.body,
      // Required by Node's fetch to send a streamed request body.
      duplex: "half",
    } as RequestInit & { duplex: "half" })

    const data = await response
      .json()
      .catch(() => ({ message: "The upload failed. Please try again." }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "Could not reach the photo service. Please try again." },
      { status: 502 }
    )
  }
}
