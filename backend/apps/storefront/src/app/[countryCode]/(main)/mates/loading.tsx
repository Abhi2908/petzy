// Shown while a Mates page loads: a grid of card placeholders.
export default function Loading() {
  return (
    <div
      className="content-container py-6 small:py-12"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mb-8 h-10 w-48 rounded-md bg-ui-bg-subtle animate-pulse" />
      <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-large border border-petzy-border bg-white overflow-hidden"
          >
            <div className="aspect-[4/3] bg-ui-bg-subtle animate-pulse" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-4 w-3/4 rounded bg-ui-bg-subtle animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-ui-bg-subtle animate-pulse" />
              <div className="h-5 w-1/3 rounded bg-ui-bg-subtle animate-pulse mt-2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
