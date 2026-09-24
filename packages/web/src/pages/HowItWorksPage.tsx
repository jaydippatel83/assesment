import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const FORMULAS: [string, string][] = [
  ['Entry age', 'Age at last completed birthday on the valuation date'],
  ['Rating age', 'Entry age, less 3 years for female lives'],
  ['Annual base premium', 'Sum assured ÷ 1,000 × rate for the rating age × policy term ÷ premium paying term'],
  ['Rider premium', 'Rider cover ÷ 1,000 × rider rate, where rider cover = sum assured × cover %'],
  ['Instalment', '(Base + rider premium) × modal factor for the chosen frequency, rounded to paise'],
  ['Bonus each year', 'Sum assured × reversionary bonus rate (simple, not compounding)'],
  ['Death benefit', 'Highest of sum assured, 10× annual premium and 105% of premiums paid, plus accrued bonus'],
  ['Surrender value', 'Premiums paid × surrender factor for the policy year (nil in year 1)'],
  ['Maturity benefit', 'Sum assured + accrued bonus + terminal bonus, paid at the end of the term'],
]

const RULES = [
  'Entry age is within the plan’s age band',
  'Sum assured is within the plan’s range',
  'Policy term is within the plan’s range',
  'Premium paying term is at least the plan’s minimum and no longer than the policy term',
  'Entry age plus policy term does not exceed the plan’s maximum maturity age',
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
              <p>Every input is checked against the selected plan, in your browser and again on the server.</p>
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
          Rates, bonus assumptions and surrender factors are versioned. A saved illustration always regenerates with the
          rates it was created with. <Link to="/calculate">Start an illustration</Link>
        </p>
      </div>
    </>
  )
}
