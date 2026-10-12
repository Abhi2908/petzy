// Shown while an insurance page loads: placeholder plan cards.
export default function Loading() {
  return (
    <div
      className="content-container py-6 small:py-12 flex flex-col gap-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-11 rounded-rounded bg-ui-bg-subtle animate-pulse" />
      <div className="h-10 w-56 rounded-md bg-ui-bg-subtle animate-pulse" />
      <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="rounded-large border border-petzy-border bg-white p-5 flex flex-col gap-3"
          >
            <div className="h-12 w-2/3 rounded bg-ui-bg-subtle animate-pulse" />
            <div className="h-6 w-1/2 rounded bg-ui-bg-subtle animate-pulse" />
            <div className="h-16 rounded bg-ui-bg-subtle animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  )
}
