import { useState } from 'react'
import { api, apiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Spinner } from '../components/Field'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../lib/format'

type Revealed = { fullName: string; email: string; dob: string; mobile: string }

export function ProfilePage() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null
  const shown = revealed ?? user

  async function reveal(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setRevealed((await api.post<{ user: Revealed }>('/me/reveal', { password })).data.user)
      setPassword('')
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const fields: [string, string][] = [
    ['Full name', shown.fullName],
    ['Email', shown.email],
    ['Date of birth', revealed ? formatDate(revealed.dob) : shown.dob],
    ['Mobile', revealed ? `+91 ${revealed.mobile}` : shown.mobile],
  ]

  return (
    <>
      <PageHeader title="Profile" subtitle={`Member since ${formatDate(user.createdAt)}`} />
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="avatar lg">{user.fullName.charAt(0)}</span>
            <div>
              <h2>{shown.fullName}</h2>
              <span className={`badge ${revealed ? '' : 'badge-success'}`} style={{ marginTop: 4 }}>
                <Icon name={revealed ? 'eye' : 'lock'} size={12} />
                {revealed ? 'Details visible' : 'Details masked'}
              </span>
            </div>
          </div>
          {revealed && (
            <button type="button" className="btn btn-secondary" onClick={() => setRevealed(null)}>
              <Icon name="eyeOff" size={16} /> Hide
            </button>
          )}
        </div>
        <div className="card-body">
          <dl className="dl">
            {fields.map(([label, value]) => (
              <FieldRow key={label} label={label} value={value} />
            ))}
          </dl>
        </div>

        {!revealed && (
          <form onSubmit={reveal} className="card-body stack" style={{ borderTop: '1px solid var(--border)', gap: 12 }}>
            <div>
              <h3>Show full details</h3>
              <p className="muted small" style={{ marginTop: 4 }}>
                Your details are encrypted and masked by default. Confirm your password to view them. Each view is
                recorded in the audit log.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-label="Password"
              />
              <button type="submit" className="btn btn-primary" disabled={busy || !password}>
                {busy ? <Spinner /> : <Icon name="eye" size={16} />} Reveal
              </button>
            </div>
            {error && (
              <span className="field-error">
                <Icon name="alert" size={14} />
                {error}
              </span>
            )}
          </form>
        )}
      </div>
    </>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
    </>
  )
}
