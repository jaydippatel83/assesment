import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, apiError } from '../api/client'
import type { IllustrationView } from '../api/types'
import { BenefitChart } from '../components/BenefitChart'
import { Alert, PageLoading } from '../components/Field'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatFrequency, formatINR, FREQUENCY_PER } from '../lib/format'

export function IllustrationPage() {
  const { id } = useParams()
  const [data, setData] = useState<IllustrationView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<IllustrationView>(`/illustrations/${id}`)
      .then((r) => setData(r.data))
      .catch((err) => setError(apiError(err).message))
  }, [id])

  if (error) return <Alert>{error}</Alert>
  if (!data) return <PageLoading label="Loading illustration…" />

  const { input, premium, summary, rows } = data
  const multiple = Number(summary.maturityBenefit) / Number(summary.totalPremiumPaid)
  const riders = premium.riderPremiums.map((r) => r.name)

  return (
    <>
      <PageHeader
        title={data.policyType.name}
        subtitle={
          <Link to="/history" className="back-link no-print">
            <Icon name="arrowLeft" size={15} /> All illustrations
          </Link>
        }
      />
      <div className="toolbar">
        <div>
          <div className="badges">
            <span className="badge">Entry age {premium.entryAge}</span>
            <span className="badge">{input.gender.charAt(0) + input.gender.slice(1).toLowerCase()}</span>
            <span className="badge">
              {input.policyTerm} yr term · {input.premiumTerm} yr pay
            </span>
            <span className="badge">{formatFrequency(input.frequency)} premiums</span>
            {riders.map((r) => (
              <span className="badge badge-accent" key={r}>
                + {r}
              </span>
            ))}
          </div>
        </div>
        <div className="badges no-print">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Icon name="printer" size={16} /> Print
          </button>
          <Link to="/calculate" className="btn btn-primary btn-sm">
            <Icon name="plus" size={16} /> New illustration
          </Link>
        </div>
      </div>

      <div className="stack">
        <div className="kpis">
          <div className="card kpi">
            <div className="kpi-label">Sum assured</div>
            <div className="kpi-value">{formatINR(input.sumAssured)}</div>
            <div className="kpi-sub">Paid on death, plus bonuses</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">{formatFrequency(input.frequency)} premium</div>
            <div className="kpi-value">{formatINR(premium.modalPremium)}</div>
            <div className="kpi-sub">
              {input.frequency === 'ANNUAL'
                ? `paid for ${input.premiumTerm} years`
                : `per ${FREQUENCY_PER[input.frequency]} · ${formatINR(premium.annualisedPremium)} a year`}
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">Total premiums</div>
            <div className="kpi-value">{formatINR(summary.totalPremiumPaid)}</div>
            <div className="kpi-sub">over {input.premiumTerm} years</div>
          </div>
          <div className="card kpi highlight">
            <div className="kpi-label">Maturity benefit</div>
            <div className="kpi-value">{formatINR(summary.maturityBenefit)}</div>
            <div className="kpi-sub">
              at age {summary.maturityAge} · {multiple.toFixed(2)}× premiums paid
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>How the policy grows</h2>
              <p>Death benefit and premiums paid by policy year</p>
            </div>
          </div>
          <div className="card-body">
            <BenefitChart rows={rows} maturityBenefit={summary.maturityBenefit} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Year-by-year illustration</h2>
              <p>
                Premiums stop after year {input.premiumTerm} (dashed line). Valued {formatDate(data.asOf)}, rates{' '}
                {data.rateVersion}.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {data.columns.map((c, i) => (
                    <th key={c.key} className={`${c.money ? 'num' : ''}${i === 0 ? ' sticky-col' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isMaturity = row.policyYear === input.policyTerm
                  const isLastPremium = row.policyYear === input.premiumTerm && !isMaturity
                  return (
                    <tr key={row.policyYear} className={isMaturity ? 'row-maturity' : isLastPremium ? 'row-divider' : undefined}>
                      {data.columns.map((c, i) => {
                        const value = row[c.key as keyof typeof row]
                        const zero = c.money && Number(value) === 0
                        const cls = [c.money ? 'num' : '', i === 0 ? 'sticky-col' : '', zero ? 'zero' : ''].join(' ').trim()
                        return (
                          <td key={c.key} className={cls || undefined}>
                            {c.money ? (zero ? '–' : formatINR(value)) : value}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="muted small">
          This illustration is indicative and not a contract. Bonuses are not guaranteed; they are shown at the rates assumed in
          version {data.rateVersion}. Death benefit is the higher of the sum assured, 10× the annual premium and 105% of
          premiums paid, plus accrued bonus.
        </p>
      </div>
    </>
  )
}
