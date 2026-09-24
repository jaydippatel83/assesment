import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: { message?: string }
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error?.message ? (
        <span className="field-error" role="alert">
          <Icon name="alert" size={14} />
          {error.message}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      <Icon name="alert" size={16} />
      <div>{children}</div>
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-loading" aria-busy="true">
      <Spinner /> {label}
    </div>
  )
}
