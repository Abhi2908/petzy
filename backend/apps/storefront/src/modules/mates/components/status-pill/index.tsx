import { clx } from "@modules/common/components/ui"

const TONES = {
  teal: "bg-petzy-teal/10 text-petzy-teal border-petzy-teal/30",
  coral: "bg-petzy-coral/10 text-[#B23A1E] border-petzy-coral/40",
  grey: "bg-ui-bg-subtle text-ui-fg-subtle border-petzy-border",
  red: "bg-rose-50 text-rose-700 border-rose-200",
}

const StatusPill = ({
  label,
  tone,
  className,
}: {
  label: string
  tone: keyof typeof TONES
  className?: string
}) => (
  <span
    className={clx(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      TONES[tone],
      className
    )}
  >
    {label}
  </span>
)

export default StatusPill
