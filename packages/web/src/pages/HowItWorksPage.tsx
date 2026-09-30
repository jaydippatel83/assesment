import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const FORMULAS: [string, string][] = [
  ['Entry age', 'Age at last completed birthday on the valuation date'],
  ['Annual premium', 'Premium per instalment × instalments a year (1 yearly, 2 half-yearly, 12 monthly)'],
  ['Premium, each year', 'The annual premium while the year is within the premium paying term; nil after that'],
  ['Bonus amount', 'Sum assured × that year’s bonus rate from the bonus schedule'],
  ['Total benefit', 'Sum assured + the bonus amount for every year of the bonus schedule, paid at the end of the policy term'],
  ['Net cash flow', 'Total benefit received − premium paid, for each year'],
  ['IRR', 'The yearly rate at which the net cash flows’ present value is zero, with year 1 at time 0'],
]

const RULES = [
  'Premium paying term is 5–10 years, policy term is 10–20 years, and each premium instalment is ₹10,000–₹50,000',
  'Policy term is longer than the premium paying term',
  'Premiums are paid yearly, half-yearly or monthly',
  'Sum assured is at least 10× the annual premium, or ₹50,00,000 if that is lower',
  'Entry age is between 23 and 56',
]

export function HowItWorksPage() {
  return (
    <>
      <PageHeader title="How it works" subtitle="The rules and formulas behind every illustration." />
      <div className="stack" style={{ maxWidth: 900 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Eligibility checks</h2>
              <p>Every input is checked against the plan’s limits, in your browser and again on the server.</p>
            </div>
          </div>
          <ol className="card-body" style={{ margin: 0, paddingLeft: 48, display: 'grid', gap: 10 }}>
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>How each figure is calculated</h2>
              <p>Money is calculated in exact decimals and only rounded where it is charged or shown.</p>
            </div>
          </div>
          <div className="table-wrap" style={{ maxHeight: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Figure</th>
                  <th>Formula</th>
                </tr>
              </thead>
              <tbody>
                {FORMULAS.map(([name, formula]) => (
                  <tr key={name}>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</td>
                    <td className="text-2">{formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="muted small">
          The bonus schedule is versioned. A saved illustration always regenerates with the
          rates it was created with. <Link to="/calculate">Start an illustration</Link>
        </p>
      </div>
    </>
  )
}
