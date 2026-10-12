import { DISCLAIMER } from "@lib/util/insurance-format"

// Shown at the top of every insurance page, so nobody thinks Petzy is the insurer.
const InsuranceDisclaimer = () => (
  <p
    className="rounded-rounded border border-petzy-teal/30 bg-petzy-teal/5 px-4 py-3 text-small-regular font-medium text-petzy-teal"
    data-testid="insurance-disclaimer"
  >
    {DISCLAIMER}
  </p>
)

export default InsuranceDisclaimer
