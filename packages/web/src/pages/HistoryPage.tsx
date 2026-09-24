import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiError } from '../api/client'
import type { IllustrationListItem, PolicyTypeView } from '../api/types'
import { Alert, PageLoading } from '../components/Field'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatFrequency, formatINR, formatINRCompact } from '../lib/format'

export function HistoryPage() {
  const [items, setItems] = useState<IllustrationListItem[] | null>(null)
  const [policyTypes, setPolicyTypes] = useState<PolicyTypeView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('ALL')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<{ illustrations: IllustrationListItem[] }>('/illustrations'),
      api.get<{ policyTypes: PolicyTypeView[] }>('/policy-types'),
    ])
      .then(([list, plans]) => {
        setItems(list.data.illustrations)
        setPolicyTypes(plans.data.policyTypes)
        setOpenId(list.data.illustrations[0]?.id ?? null)
      })
      .catch((err) => setError(apiError(err).message))
  }, [])

  const tabs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of items ?? []) counts.set(i.policyType.code, (counts.get(i.policyType.code) ?? 0) + 1)
    return [
      { code: 'ALL', label: 'All', count: items?.length ?? 0 },
      ...policyTypes.map((p) => ({ code: p.code, label: p.name, count: counts.get(p.code) ?? 0 })),
    ]
  }, [items, policyTypes])

  if (error) return <Alert>{error}</Alert>
  if (!items) return <PageLoading />

  const visible = tab === 'ALL' ? items : items.filter((i) => i.policyType.code === tab)

  return (
    <>
      <PageHeader title="Your illustrations" subtitle="View your saved illustrations and what each one covers." />

      {items.length === 0 ? (
        <div className="card empty-state">
          <div className="icon-circle">
            <Icon name="file" size={24} />
          </div>
          <h2>No illustrations yet</h2>
          <p>Pick a plan, enter a few details and see the benefits year by year.</p>
          <Link to="/calculate" className="btn btn-primary">
            <Icon name="plus" size={16} /> Create your first illustration
          </Link>
        </div>
      ) : (
        <>
          <div className="tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.code}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === t.code}
                onClick={() => setTab(t.code)}
              >
                {t.label}
                <span className="count">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="rows">
            <div className="rows-head" aria-hidden="true">
              <span />
              <span>Plan</span>
              <span className="col-premium">Premium</span>
              <span className="col-date">Created</span>
              <span>Status</span>
              <span />
            </div>

            {visible.map((item) => (
              <IllustrationRow
                key={item.id}
                item={item}
                plan={policyTypes.find((p) => p.code === item.policyType.code)}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            ))}
            {visible.length === 0 && (
              <div className="card empty-state">
                <p>No saved illustrations for this plan yet.</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

function IllustrationRow({
  item,
  plan,
  open,
  onToggle,
}: {
  item: IllustrationListItem
  plan: PolicyTypeView | undefined
  open: boolean
  onToggle: () => void
}) {
  const navigate = useNavigate()
  const startYear = Number(item.asOf.slice(0, 4))
  const maturesYear = startYear + item.policyTerm
  const sumAssured = Number(item.sumAssured)
  const view = () => navigate(`/illustration/${item.id}`)

  const coverage = [
    { name: 'Base cover (sum assured)', cover: sumAssured },
    ...item.riderCodes.map((code) => {
      const rider = plan?.riders.find((r) => r.code === code)
      return { name: rider?.name ?? code, cover: sumAssured * Number(rider?.coverPct ?? 0) }
    }),
  ]

  return (
    <div className={`row${open ? ' open' : ''}`}>
      <div
        className="row-main"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      >
        <span className="chevron" aria-hidden="true">
          <Icon name="chevronDown" size={22} />
        </span>
        <div>
          <div className="row-title">{item.policyType.name}</div>
          <div className="row-sub">
            {formatINRCompact(item.sumAssured)} cover · entry age {item.entryAge} · {item.policyTerm} yr term
          </div>
        </div>
        <div className="col-premium">
          <div className="row-value">{formatINR(item.modalPremium)}</div>
          <div className="row-sub">{formatFrequency(item.frequency)}</div>
        </div>
        <div className="col-date row-value">{formatDate(item.createdAt)}</div>
        <div className="col-status">
          <span className="status status-active">
            <span className="status-dot" />
            Matures in {maturesYear}
          </span>
        </div>
        <div className="col-action" style={{ textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              view()
            }}
          >
            View illustration
          </button>
        </div>
      </div>

      {open && (
        <div className="row-detail">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Coverage</th>
                <th>Cover</th>
                <th className="col-3">Premiums paid for</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{formatINR(c.cover)}</td>
                  <td className="col-3">{item.premiumTerm} years</td>
                </tr>
              ))}
              <tr>
                <td>Total premiums</td>
                <td>{formatINR(item.totalPremium)}</td>
                <td className="col-3">{item.premiumTerm} years</td>
              </tr>
            </tbody>
          </table>
          <div className="bill">
            <div className="bill-label">Maturity benefit</div>
            <div className="bill-amount">{formatINR(item.maturityBenefit)}</div>
            <div className="bill-sub">
              at age {item.entryAge + item.policyTerm}, in {maturesYear}
            </div>
            <button type="button" className="btn btn-primary" onClick={view}>
              See illustration <Icon name="arrowUpRight" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
