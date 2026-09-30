import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, apiError } from '../api/client'
import type { Column, IllustrationView } from '../api/types'
import { BenefitChart } from '../components/BenefitChart'
import { Alert, PageLoading } from '../components/Field'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatFrequency, formatINR, formatIrr, formatPct, FREQUENCY_PER } from '../lib/format'

function formatCell(column: Column, value: string | number) {
  if (column.format === 'number') return value
  if (Number(value) === 0) return '–'
  return column.format === 'percent' ? formatPct(String(value)) : formatINR(value)
}

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
            <div className="kpi-sub">Paid at the end of year {input.policyTerm}, plus bonuses</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">{formatFrequency(input.frequency)} premium</div>
            <div className="kpi-value">{formatINR(premium.modalPremium)}</div>
            <div className="kpi-sub">
              {premium.instalmentsPerYear === 1
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
            <div className="kpi-label">Total benefit · IRR {formatIrr(summary.irr)}</div>
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
              <p>Premiums paid and bonus accrued by policy year, and the total benefit paid at the end of the term</p>
            </div>
          </div>
          <div className="card-body">
            <BenefitChart rows={rows} maturityBenefit={summary.maturityBenefit} policyTerm={input.policyTerm} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Year-by-year illustration</h2>
              <p>
                Premiums stop after year {input.premiumTerm} (dashed line) and the total benefit is paid in year{' '}
                {input.policyTerm} (highlighted). Valued {formatDate(data.asOf)}, rates {data.rateVersion}.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {data.columns.map((c, i) => (
                    <th key={c.key} className={`${c.format !== 'number' ? 'num' : ''}${i === 0 ? ' sticky-col' : ''}`}>
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
                        const numeric = c.format !== 'number'
                        const zero = numeric && Number(value) === 0
                        const cls = [numeric ? 'num' : '', i === 0 ? 'sticky-col' : '', zero ? 'zero' : ''].join(' ').trim()
                        return (
                          <td key={c.key} className={cls || undefined}>
                            {formatCell(c, value)}
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
          version {data.rateVersion}. The total benefit is the sum assured plus the bonus for every year of the bonus schedule,
          and the IRR is the yearly return on the net cash flows.
        </p>
      </div>
    </>
  )
}
