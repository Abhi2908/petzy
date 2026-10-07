import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "Petzy",
}

// Loaded by family name rather than next/font: the Medusa UI typography
// utilities hardcode `font-family: Inter`, which next/font's hashed family
// names would not satisfy.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap"

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="bg-petzy-canvas font-sans text-ui-fg-base">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
