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
          {policy.minTerm}–{policy.maxTerm} years, longer than the paying term
        </dd>
        <dt>Premium paying term</dt>
        <dd>
          {policy.minPremiumTerm}–{policy.maxPremiumTerm} years
        </dd>
        <dt>Premium</dt>
        <dd>
          {formatINR(policy.minPremium)} – {formatINR(policy.maxPremium)} per instalment
        </dd>
        <dt>Minimum sum assured</dt>
        <dd>
          {policy.sumAssuredMultiple}× annual premium, at most {formatINR(policy.sumAssuredCap)}
        </dd>
        <dt>Frequencies</dt>
        <dd>{policy.premiumOptions.map((o) => formatFrequency(o.frequency)).join(', ')}</dd>
        <dt>Rates version</dt>
        <dd>{policy.rateVersion}</dd>
      </dl>
    </details>
  )
}
