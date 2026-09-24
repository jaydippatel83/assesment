import type { PolicyTypeView } from '../api/types'
import { formatFrequency, formatINR } from '../lib/format'
import { Icon } from './Icon'

export function PlanDetails({ policy }: { policy: PolicyTypeView }) {
  return (
    <details className="card plan-details">
      <summary>
        Plan details
        <Icon name="chevronDown" size={18} />
      </summary>
      <dl className="dl">
        <dt>Entry age</dt>
        <dd>
          {policy.minAge}–{policy.maxAge} years
        </dd>
        <dt>Policy term</dt>
        <dd>
          {policy.minTerm}–{policy.maxTerm} years
        </dd>
        <dt>Premium paying term</dt>
        <dd>{policy.minPremiumTerm} yrs to policy term</dd>
        <dt>Sum assured</dt>
        <dd>
          {formatINR(policy.minSumAssured)} – {formatINR(policy.maxSumAssured)}
        </dd>
        <dt>Max. age at maturity</dt>
        <dd>{policy.maxMaturityAge} years</dd>
        {policy.premiumOptions.map((o) => (
          <FrequencyRow key={o.frequency} frequency={o.frequency} factor={o.modalFactor} />
        ))}
        <dt>Rates version</dt>
        <dd>{policy.rateVersion}</dd>
      </dl>
    </details>
  )
}

function FrequencyRow({ frequency, factor }: { frequency: string; factor: string }) {
  return (
    <>
      <dt>{formatFrequency(frequency)} factor</dt>
      <dd>× {factor}</dd>
    </>
  )
}
