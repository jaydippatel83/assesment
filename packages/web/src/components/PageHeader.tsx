import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  const { user } = useAuth()
  return (
    <div className="page-top">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {user && (
        <Link to="/profile" className="user-block">
          <span className="avatar">{user.fullName.charAt(0)}</span>
          <span className="who">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </span>
        </Link>
      )}
    </div>
  )
}
